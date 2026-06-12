import { AppStateRepository } from "../db/repositories/app-state-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import type { DemoAuthContext } from "../auth/demo-auth-context.js";
import { ApiError } from "../errors/api-error.js";
import { expectObject, readRequiredRoleName } from "./validation.js";

const demoUserStateKey = "demo_user_id";

export class DemoAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly appStateRepository: AppStateRepository
  ) {}

  getActiveDemoAuth() {
    const storedUserId = this.appStateRepository.getValue(demoUserStateKey);

    if (storedUserId) {
      const context = this.buildDemoAuthContext(storedUserId);

      if (context) {
        return context;
      }
    }

    return this.switchToRole("Admin");
  }

  switchDemoUserRole(input: unknown) {
    const body = expectObject(input);
    const roleName = readRequiredRoleName(body, "roleName");

    return this.switchToRole(roleName);
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
}
