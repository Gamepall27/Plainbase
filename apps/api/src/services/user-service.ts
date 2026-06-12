import { randomUUID } from "node:crypto";
import type {
  CreateUserRequest,
  DemoAuth,
  UpdateUserRequest
} from "@plainbase/shared";
import { hashPassword } from "../auth/passwords.js";
import { DocumentRepository } from "../db/repositories/document-repository.js";
import { RoleRepository } from "../db/repositories/role-repository.js";
import { TicketRepository } from "../db/repositories/ticket-repository.js";
import { UserRepository } from "../db/repositories/user-repository.js";
import { ApiError } from "../errors/api-error.js";
import {
  expectObject,
  readOptionalNullableString,
  readOptionalString,
  readRequiredString,
  requireAtLeastOneField,
  validateEmail
} from "./validation.js";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly ticketRepository: TicketRepository
  ) {}

  listUsers() {
    return this.userRepository.list();
  }

  createUser(input: unknown) {
    const body = expectObject(input);
    const user = this.parseCreateUserInput(body);

    if (this.userRepository.findByEmail(user.email)) {
      throw new ApiError(409, "CONFLICT", "A user with that email already exists.");
    }

    if (this.userRepository.findByUsername(user.username)) {
      throw new ApiError(409, "CONFLICT", "A user with that username already exists.");
    }

    const role = this.roleRepository.findById(user.roleId);

    if (!role) {
      throw new ApiError(404, "NOT_FOUND", "Role not found.");
    }

    const createdUser = this.userRepository.create({
      ...user,
      id: `user-${randomUUID()}`,
      passwordHash: hashPassword(user.password),
      avatarUrl: user.avatarUrl ?? null
    });

    if (!createdUser) {
      throw new ApiError(500, "INTERNAL_SERVER_ERROR", "User creation failed.");
    }

    return createdUser;
  }

  updateUser(userId: string, input: unknown) {
    const existingUser = this.userRepository.findById(userId);

    if (!existingUser) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    const body = expectObject(input);
    requireAtLeastOneField(
      body,
      ["name", "username", "email", "roleId", "password", "avatarUrl"],
      "At least one user field must be provided."
    );

    const user = this.parseUpdateUserInput(body);

    if (
      user.email &&
      user.email !== existingUser.email &&
      this.userRepository.findByEmail(user.email)
    ) {
      throw new ApiError(409, "CONFLICT", "A user with that email already exists.");
    }

    if (
      user.username &&
      user.username !== existingUser.username &&
      this.userRepository.findByUsername(user.username)
    ) {
      throw new ApiError(409, "CONFLICT", "A user with that username already exists.");
    }

    if (user.roleId) {
      const role = this.roleRepository.findById(user.roleId);

      if (!role) {
        throw new ApiError(404, "NOT_FOUND", "Role not found.");
      }
    }

    const updatedUser = this.userRepository.update(userId, {
      ...user,
      passwordHash: user.password ? hashPassword(user.password) : undefined
    });

    if (!updatedUser) {
      throw new ApiError(500, "INTERNAL_SERVER_ERROR", "User update failed.");
    }

    return updatedUser;
  }

  deleteUser(userId: string, actor: DemoAuth) {
    const existingUser = this.userRepository.findById(userId);

    if (!existingUser) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    if (actor.authType === "demo" && actor.user.id === userId) {
      throw new ApiError(
        409,
        "CONFLICT",
        "The active demo user cannot delete itself."
      );
    }

    if (this.documentRepository.countByAuthorUserId(userId) > 0) {
      throw new ApiError(
        409,
        "CONFLICT",
        "Users with document history cannot be deleted."
      );
    }

    if (this.ticketRepository.countByCreatorId(userId) > 0) {
      throw new ApiError(
        409,
        "CONFLICT",
        "Users with created tickets cannot be deleted."
      );
    }

    this.userRepository.delete(userId);
    return userId;
  }

  private parseCreateUserInput(
    body: Record<string, unknown>
  ): CreateUserRequest {
    const name = readRequiredString(body, "name", "name");
    const username = readRequiredString(body, "username", "username").toLowerCase();
    const email = readRequiredString(body, "email", "email").toLowerCase();
    const roleId = readRequiredString(body, "roleId", "roleId");
    const password = readRequiredString(body, "password", "password");
    const avatarUrl = readOptionalNullableString(body, "avatarUrl", "avatarUrl");

    validateEmail(email);

    return {
      name,
      username,
      email,
      roleId,
      password,
      avatarUrl: avatarUrl ?? null
    };
  }

  private parseUpdateUserInput(
    body: Record<string, unknown>
  ): UpdateUserRequest {
    const name = readOptionalString(body, "name", "name");
    const username = readOptionalString(body, "username", "username")?.toLowerCase();
    const email = readOptionalString(body, "email", "email")?.toLowerCase();
    const roleId = readOptionalString(body, "roleId", "roleId");
    const password = readOptionalString(body, "password", "password");
    const avatarUrl = readOptionalNullableString(body, "avatarUrl", "avatarUrl");

    if (email !== undefined) {
      validateEmail(email);
    }

    return {
      name,
      username,
      email,
      roleId,
      password,
      avatarUrl
    };
  }
}
