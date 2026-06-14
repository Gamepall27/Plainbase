import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type {
  AcceptInvitationRequest,
  AuthResponse,
  BootstrapInstallationRequest,
  CreateInvitationRequest,
  Invitation,
  OnboardingState,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  ResetPasswordResponse,
  SignInRequest,
  Tenant
} from "@plainbase/shared";
import { apiConfig } from "../config.js";
import { requireAuthenticatedUser, type AuthContext } from "../auth/auth-context.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { createOpaqueToken, hashToken } from "../auth/tokens.js";
import { AuthSessionRepository } from "../db/repositories/auth-session-repository.js";
import { PasswordResetRepository } from "../db/repositories/password-reset-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { TenantRepository } from "../db/repositories/tenant-repository.js";
import { UserInvitationRepository } from "../db/repositories/user-invitation-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { WorkspaceRepository } from "../db/repositories/workspace-repository.js";
import { ApiError } from "../errors/api-error.js";
import {
  expectObject,
  readOptionalNullableString,
  readRequiredString,
  validateEmail,
  validatePassword,
  validateSlug,
  validateUsername
} from "./validation.js";
import {
  normalizeWorkspaceRootPath,
  resolveWorkspaceRootPath
} from "../workspaces/workspace-paths.js";

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly roleRepository: RoleRepository,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly userInvitationRepository: UserInvitationRepository,
    private readonly contentRoot: string
  ) {}

  getOnboardingState(actor: AuthContext): OnboardingState {
    const users = this.userRepository.list();

    if (users.length === 0 || this.tenantRepository.list().length === 0) {
      return {
        state: "bootstrap_required",
        deliveryMethod: "manual_link",
        tenant: null,
        canManageUsers: false,
        workspaceCount: 0,
        userCount: 0,
        pendingInvitationCount: 0,
        steps: [
          {
            id: "create_first_admin",
            title: "Ersten Admin anlegen",
            description: "Richte dein erstes Administrationskonto ein.",
            completed: false
          },
          {
            id: "create_first_workspace",
            title: "Erstes Workspace anlegen",
            description: "Starte mit einem produktiven Workspace fuer dein Team.",
            completed: false
          },
          {
            id: "invite_teammates",
            title: "Team einladen",
            description: "Erzeuge Einladungslinks fuer weitere Mitarbeitende.",
            completed: false
          }
        ]
      };
    }

    if (actor.authType !== "session") {
      return this.buildGuestOnboardingState();
    }

    const tenant = actor.tenant;
    const workspaceCount = this.workspaceRepository.listByTenantId(tenant.id).length;
    const userCount = this.userRepository.listByTenantId(tenant.id).length;
    const pendingInvitationCount =
      this.userInvitationRepository.countPendingByTenantId(tenant.id);
    const canManageUsers = actor.role.name === "Admin";
    const isReady =
      workspaceCount > 0 && (userCount > 1 || pendingInvitationCount > 0);

    return {
      state: isReady ? "ready" : "onboarding",
      deliveryMethod: "manual_link",
      tenant,
      canManageUsers,
      workspaceCount,
      userCount,
      pendingInvitationCount,
      steps: [
        {
          id: "create_first_admin",
          title: "Erster Admin angelegt",
          description: "Das erste Administrationskonto ist einsatzbereit.",
          completed: true
        },
        {
          id: "create_first_workspace",
          title: "Workspace konfigurieren",
          description: "Lege mindestens ein Workspace fuer echte Inhalte an.",
          completed: workspaceCount > 0
        },
        {
          id: "invite_teammates",
          title: "Teammitglieder einladen",
          description:
            "Nutze Einladungslinks fuer weitere Mitarbeitende oder arbeite erstmal alleine weiter.",
          completed: userCount > 1 || pendingInvitationCount > 0
        }
      ]
    };
  }

  getAuthState(sessionToken: string | null) {
    const now = new Date().toISOString();
    this.authSessionRepository.deleteExpired(now);

    if (!sessionToken) {
      return this.buildGuestAuthState();
    }

    const session = this.authSessionRepository.findByTokenHash(hashToken(sessionToken));

    if (!session || session.expiresAt <= now) {
      if (session) {
        this.authSessionRepository.deleteByTokenHash(session.tokenHash);
      }

      return this.buildGuestAuthState();
    }

    return this.buildAuthenticatedState(session.userId, session.expiresAt);
  }

  signIn(input: unknown) {
    const body = expectObject(input);
    const identifier = readRequiredString(body, "identifier", "identifier").toLowerCase();
    const password = readRequiredString(body, "password", "password");
    const matchedUser = this.userRepository.findAuthByIdentifier(identifier);

    if (!matchedUser || !verifyPassword(password, matchedUser.passwordHash)) {
      throw new ApiError(401, "FORBIDDEN", "Benutzername/E-Mail oder Passwort ist ungueltig.");
    }

    return this.createSessionForUser(matchedUser.id);
  }

  signOut(sessionToken: string | null): AuthResponse["data"] {
    if (sessionToken) {
      this.authSessionRepository.deleteByTokenHash(hashToken(sessionToken));
    }

    return this.buildGuestAuthState();
  }

  bootstrapInstallation(input: unknown) {
    if (this.userRepository.list().length > 0 || this.tenantRepository.list().length > 0) {
      throw new ApiError(
        409,
        "CONFLICT",
        "Die Erstinstallation wurde bereits abgeschlossen."
      );
    }

    const body = expectObject(input);
    const setup = this.parseBootstrapInput(body);

    if (this.tenantRepository.findBySlug(setup.tenantSlug)) {
      throw new ApiError(409, "CONFLICT", "Tenant slug already exists.", {
        tenantSlug: "Choose a different tenant slug."
      });
    }

    if (this.workspaceRepository.findBySlug(setup.workspaceSlug)) {
      throw new ApiError(409, "CONFLICT", "Workspace slug already exists.", {
        workspaceSlug: "Choose a different workspace slug."
      });
    }

    if (this.userRepository.findByEmail(setup.adminEmail)) {
      throw new ApiError(409, "CONFLICT", "A user with that email already exists.");
    }

    if (this.userRepository.findByUsername(setup.adminUsername)) {
      throw new ApiError(409, "CONFLICT", "A user with that username already exists.");
    }

    const adminRole = this.roleRepository.findByName("Admin");

    if (!adminRole) {
      throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Admin role not available.");
    }

    const timestamp = new Date().toISOString();
    const tenant: Tenant = {
      id: `tenant-${randomUUID()}`,
      name: setup.tenantName,
      slug: setup.tenantSlug,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const storedWorkspaceRootPath = setup.workspaceRootPath
      ? normalizeWorkspaceRootPath(setup.workspaceRootPath)
      : "";
    const resolvedWorkspaceRootPath = resolveWorkspaceRootPath(this.contentRoot, {
      slug: setup.workspaceSlug,
      rootPath: storedWorkspaceRootPath
    });
    const conflictingWorkspace = this.workspaceRepository
      .list()
      .map((workspace) => ({
        ...workspace,
        rootPath: resolveWorkspaceRootPath(this.contentRoot, workspace)
      }))
      .find((workspace) => workspace.rootPath === resolvedWorkspaceRootPath);

    if (conflictingWorkspace) {
      throw new ApiError(409, "CONFLICT", "Workspace path already exists.", {
        workspaceRootPath: "Choose a different workspace path."
      });
    }

    mkdirSync(resolvedWorkspaceRootPath, { recursive: true });

    this.tenantRepository.create(tenant);
    this.workspaceRepository.create({
      id: `workspace-${randomUUID()}`,
      tenantId: tenant.id,
      name: setup.workspaceName,
      slug: setup.workspaceSlug,
      rootPath: storedWorkspaceRootPath,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const createdUser = this.userRepository.create({
      id: `user-${randomUUID()}`,
      tenantId: tenant.id,
      name: setup.adminName,
      username: setup.adminUsername,
      email: setup.adminEmail,
      passwordHash: hashPassword(setup.password),
      roleId: adminRole.id,
      avatarUrl: null
    });

    if (!createdUser) {
      throw new ApiError(500, "INTERNAL_SERVER_ERROR", "User creation failed.");
    }

    return this.createSessionForUser(createdUser.id);
  }

  requestPasswordReset(input: unknown) {
    const body = expectObject(input);
    const identifier = readRequiredString(body, "identifier", "identifier").toLowerCase();
    const user = this.userRepository.findAuthByIdentifier(identifier);

    if (!user) {
      return {
        accepted: true,
        deliveryMethod: "manual_link",
        resetUrl: null
      } satisfies PasswordResetRequestResponse["data"];
    }

    const token = createOpaqueToken();
    const createdAt = new Date().toISOString();
    const expiresAt = addMinutes(createdAt, apiConfig.passwordResetDurationMinutes);

    this.passwordResetRepository.deleteExpired(createdAt);
    this.passwordResetRepository.deleteByUserId(user.id);
    this.passwordResetRepository.create({
      id: `password-reset-${randomUUID()}`,
      userId: user.id,
      tokenHash: hashToken(token),
      createdAt,
      expiresAt,
      consumedAt: null
    });

    return {
      accepted: true,
      deliveryMethod: "manual_link",
      resetUrl: `${apiConfig.appOrigin}/?reset=${token}`
    } satisfies PasswordResetRequestResponse["data"];
  }

  resetPassword(input: unknown) {
    const body = expectObject(input);
    const token = readRequiredString(body, "token", "token");
    const password = readRequiredString(body, "password", "password");

    validatePassword(password);

    const now = new Date().toISOString();
    const resetRecord = this.passwordResetRepository.findByTokenHash(hashToken(token));

    if (
      !resetRecord ||
      resetRecord.consumedAt !== null ||
      resetRecord.expiresAt <= now
    ) {
      throw new ApiError(410, "FORBIDDEN", "Dieser Reset-Link ist ungueltig oder abgelaufen.");
    }

    const updatedUser = this.userRepository.update(resetRecord.userId, {
      passwordHash: hashPassword(password)
    });

    if (!updatedUser) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    this.passwordResetRepository.consume(resetRecord.id, now);
    this.passwordResetRepository.deleteByUserId(resetRecord.userId);
    this.authSessionRepository.deleteByUserId(resetRecord.userId);

    return {
      passwordUpdated: true
    } satisfies ResetPasswordResponse["data"];
  }

  createInvitation(input: unknown, actor: AuthContext) {
    const authenticatedActor = requireAuthenticatedUser(actor);
    const body = expectObject(input);
    const invitation = this.parseInvitationInput(body);

    if (this.userRepository.findByEmail(invitation.email)) {
      throw new ApiError(409, "CONFLICT", "A user with that email already exists.");
    }

    if (this.userRepository.findByUsername(invitation.username)) {
      throw new ApiError(409, "CONFLICT", "A user with that username already exists.");
    }

    const pendingInvitation = this.userInvitationRepository.findPendingByIdentity(
      invitation.email,
      invitation.username
    );

    if (pendingInvitation && pendingInvitation.expiresAt > new Date().toISOString()) {
      throw new ApiError(
        409,
        "CONFLICT",
        "An active invitation already exists for that user."
      );
    }

    const role = this.roleRepository.findById(invitation.roleId);

    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found.");
    }

    const token = createOpaqueToken();
    const createdAt = new Date().toISOString();
    const expiresAt = addHours(createdAt, apiConfig.invitationDurationHours);
    const invitationRecordId = `user-invitation-${randomUUID()}`;

    this.userInvitationRepository.deleteExpired(createdAt);
    this.userInvitationRepository.create({
      id: invitationRecordId,
      tenantId: authenticatedActor.tenant.id,
      name: invitation.name,
      username: invitation.username,
      email: invitation.email,
      roleId: invitation.roleId,
      avatarUrl: invitation.avatarUrl ?? null,
      invitedByUserId: authenticatedActor.user.id,
      acceptedUserId: null,
      tokenHash: hashToken(token),
      createdAt,
      expiresAt,
      acceptedAt: null
    });

    return {
      id: invitationRecordId,
      tenantId: authenticatedActor.tenant.id,
      name: invitation.name,
      username: invitation.username,
      email: invitation.email,
      roleId: invitation.roleId,
      roleName: role.name,
      avatarUrl: invitation.avatarUrl ?? null,
      invitedByUserId: authenticatedActor.user.id,
      createdAt,
      expiresAt,
      acceptedAt: null,
      acceptUrl: `${apiConfig.appOrigin}/?invite=${token}`
    } satisfies Invitation;
  }

  acceptInvitation(input: unknown) {
    const body = expectObject(input);
    const token = readRequiredString(body, "token", "token");
    const password = readRequiredString(body, "password", "password");

    validatePassword(password);

    const now = new Date().toISOString();
    const invitation = this.userInvitationRepository.findByTokenHash(hashToken(token));

    if (!invitation || invitation.acceptedAt !== null || invitation.expiresAt <= now) {
      throw new ApiError(410, "FORBIDDEN", "Diese Einladung ist ungueltig oder abgelaufen.");
    }

    if (this.userRepository.findByEmail(invitation.email)) {
      throw new ApiError(409, "CONFLICT", "A user with that email already exists.");
    }

    if (this.userRepository.findByUsername(invitation.username)) {
      throw new ApiError(409, "CONFLICT", "A user with that username already exists.");
    }

    const role = this.roleRepository.findById(invitation.roleId);

    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found.");
    }

    const createdUser = this.userRepository.create({
      id: `user-${randomUUID()}`,
      tenantId: invitation.tenantId,
      name: invitation.name,
      username: invitation.username,
      email: invitation.email,
      passwordHash: hashPassword(password),
      roleId: invitation.roleId,
      avatarUrl: invitation.avatarUrl
    });

    if (!createdUser) {
      throw new ApiError(500, "INTERNAL_SERVER_ERROR", "User creation failed.");
    }

    this.userInvitationRepository.markAccepted(invitation.id, createdUser.id, now);

    return this.createSessionForUser(createdUser.id);
  }

  private createSessionForUser(userId: string) {
    const sessionToken = createOpaqueToken();
    const createdAt = new Date().toISOString();
    const expiresAt = addHours(createdAt, apiConfig.sessionDurationHours);

    this.authSessionRepository.create({
      id: `auth-session-${randomUUID()}`,
      userId,
      tokenHash: hashToken(sessionToken),
      createdAt,
      expiresAt
    });

    return {
      sessionToken,
      auth: this.buildAuthenticatedState(userId, expiresAt)
    };
  }

  private buildAuthenticatedState(userId: string, expiresAt: string) {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    const role = this.roleRepository.findById(user.roleId);

    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found.");
    }

    const tenant = this.requireTenant(user.tenantId);

    return {
      authType: "session",
      tenant,
      user,
      role,
      session: {
        expiresAt
      }
    } satisfies AuthResponse["data"];
  }

  private buildGuestAuthState() {
    return {
      authType: "guest",
      tenant: null,
      user: null,
      role: null,
      session: null
    } satisfies AuthResponse["data"];
  }

  private buildGuestOnboardingState(): OnboardingState {
    return {
      state: "onboarding",
      deliveryMethod: "manual_link",
      tenant: null as never,
      canManageUsers: false,
      workspaceCount: 0,
      userCount: 0,
      pendingInvitationCount: 0,
      steps: [
        {
          id: "create_first_admin",
          title: "Anmelden",
          description: "Melde dich mit einem Administrationskonto an.",
          completed: false
        },
        {
          id: "create_first_workspace",
          title: "Workspace prüfen",
          description: "Stelle sicher, dass dein erstes Workspace bereit ist.",
          completed: false
        },
        {
          id: "invite_teammates",
          title: "Team einladen",
          description: "Lege Einladungslinks fuer dein Team an.",
          completed: false
        }
      ]
    };
  }

  private requireTenant(tenantId: string): Tenant {
    const tenant = this.tenantRepository.findById(tenantId);

    if (!tenant) {
      throw new ApiError(404, "NOT_FOUND", "Tenant not found.");
    }

    return tenant;
  }

  private parseInvitationInput(
    body: Record<string, unknown>
  ): CreateInvitationRequest {
    const name = readRequiredString(body, "name", "name");
    const username = readRequiredString(body, "username", "username").toLowerCase();
    const email = readRequiredString(body, "email", "email").toLowerCase();
    const roleId = readRequiredString(body, "roleId", "roleId");
    const avatarUrl = readOptionalNullableString(body, "avatarUrl", "avatarUrl");

    validateEmail(email);
    validateUsername(username);

    return {
      name,
      username,
      email,
      roleId,
      avatarUrl: avatarUrl ?? null
    };
  }

  private parseBootstrapInput(
    body: Record<string, unknown>
  ): BootstrapInstallationRequest {
    const tenantName = readRequiredString(body, "tenantName", "company name");
    const tenantSlug = readRequiredString(body, "tenantSlug", "company slug").toLowerCase();
    const workspaceName = readRequiredString(body, "workspaceName", "workspace name");
    const workspaceSlug = readRequiredString(body, "workspaceSlug", "workspace slug").toLowerCase();
    const workspaceRootPath = readOptionalNullableString(
      body,
      "workspaceRootPath",
      "workspace root path"
    );
    const adminName = readRequiredString(body, "adminName", "admin name");
    const adminUsername = readRequiredString(body, "adminUsername", "admin username").toLowerCase();
    const adminEmail = readRequiredString(body, "adminEmail", "admin email").toLowerCase();
    const password = readRequiredString(body, "password", "password");

    validateSlug(tenantSlug, "tenantSlug");
    validateSlug(workspaceSlug, "workspaceSlug");
    validateUsername(adminUsername, "adminUsername");
    validateEmail(adminEmail, "adminEmail");
    validatePassword(password);

    return {
      tenantName,
      tenantSlug,
      workspaceName,
      workspaceSlug,
      workspaceRootPath: workspaceRootPath ?? null,
      adminName,
      adminUsername,
      adminEmail,
      password
    };
  }
}

function addHours(input: string, hours: number) {
  const date = new Date(input);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function addMinutes(input: string, minutes: number) {
  const date = new Date(input);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
