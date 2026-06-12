import { AppStateRepository } from "../db/repositories/app-state-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { ApiError } from "../errors/api-error.js";
import { expectObject, readRequiredRoleName } from "./validation.js";

const demoUserStateKey = "demo_user_id";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly appStateRepository: AppStateRepository
  ) {}

  listUsers() {
    return this.userRepository.list();
  }

  getDemoUser() {
    const storedUserId = this.appStateRepository.getValue(demoUserStateKey);

    if (storedUserId) {
      const user = this.userRepository.findById(storedUserId);

      if (user) {
        return this.buildDemoUser(user.id);
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
      user,
      role
    };
  }

  private buildDemoUser(userId: string) {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "Demo user not found.");
    }

    const role = this.roleRepository.findById(user.roleId);

    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found for demo user.");
    }

    return {
      user,
      role
    };
  }
}
