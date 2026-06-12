import { AppStateRepository } from "../db/repositories/app-state-repository.js";
import { verifyPassword } from "../auth/passwords.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import type { DemoAuthContext } from "../auth/demo-auth-context.js";
import { ApiError } from "../errors/api-error.js";
import {
  expectObject,
  readRequiredRoleName,
  readRequiredString
} from "./validation.js";

const demoUserStateKey = "demo_user_id";
const guestStateValue = "__guest__";

export class DemoAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly appStateRepository: AppStateRepository
  ) {}

  getActiveDemoAuth() {
    const storedUserId = this.appStateRepository.getValue(demoUserStateKey);

    if (storedUserId === guestStateValue) {
      return this.buildGuestAuthContext();
    }

    if (storedUserId) {
      const context = this.buildDemoAuthContext(storedUserId);

      if (context) {
        return context;
      }
    }

    return this.buildGuestAuthContext();
  }

  switchDemoUserRole(input: unknown) {
    const body = expectObject(input);
    const roleName = readRequiredRoleName(body, "roleName");

    return this.switchToRole(roleName);
  }

  signIn(input: unknown) {
    const body = expectObject(input);
    const identifier = readRequiredString(body, "identifier", "identifier").toLowerCase();
    const password = readRequiredString(body, "password", "password");
    const matchedUser = this.userRepository.findAuthByIdentifier(identifier);

    if (!matchedUser || !verifyPassword(password, matchedUser.passwordHash)) {
      throw new ApiError(401, "FORBIDDEN", "Benutzername/E-Mail oder Passwort ist ungueltig.");
    }

    return this.buildSignedInAuthContext(matchedUser.id);
  }

  signOut() {
    this.appStateRepository.setValue(demoUserStateKey, guestStateValue);
    return this.buildGuestAuthContext();
  }

  private switchToRole(roleName: "Admin" | "Editor" | "Viewer") {
    const role = this.roleRepository.findByName(roleName);

    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found.");
    }

    const user = this.userRepository.findByRoleId(role.id);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "No demo user exists for that role.");
    }

    this.appStateRepository.setValue(demoUserStateKey, user.id);

    return {
      authType: "demo",
      user,
      role
    } satisfies DemoAuthContext;
  }

  private buildSignedInAuthContext(userId: string) {
    const context = this.buildDemoAuthContext(userId);

    if (!context) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    this.appStateRepository.setValue(demoUserStateKey, userId);
    return context;
  }

  private buildDemoAuthContext(userId: string) {
    const user = this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    const role = this.roleRepository.findById(user.roleId);

    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found for demo user.");
    }

    return {
      authType: "demo",
      user,
      role
    } satisfies DemoAuthContext;
  }

  private buildGuestAuthContext() {
    return {
      authType: "guest",
      user: null,
      role: null
    } satisfies DemoAuthContext;
  }
}
