import { randomUUID } from "node:crypto";
import type {
  AcceptInvitationRequest,
  AuthResponse,
  CreateInvitationRequest,
  Invitation,
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
import { ApiError } from "../errors/api-error.js";
import {
  expectObject,
  readOptionalNullableString,
  readRequiredString,
  validateEmail,
  validatePassword,
  validateUsername
} from "./validation.js";

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly roleRepository: RoleRepository,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly userInvitationRepository: UserInvitationRepository
  ) {}

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
