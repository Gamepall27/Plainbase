import type {
  DeleteUserResponse,
  InvitationResponse,
  UserResponse,
  UsersResponse
} from "@plainbase/shared";
import { Router } from "express";
import { canManageUsers } from "@plainbase/shared";
import { AuthService } from "../services/auth-service.js";
import { UserService } from "../services/user-service.js";
import { requirePermission } from "../middleware/require-permission.js";
import { readRouteParam } from "../services/validation.js";

export function createUserRoutes(
  userService: UserService,
  authService: AuthService
) {
  const router = Router();

  router.get("/users", (request, response) => {
    const payload: UsersResponse = {
      success: true,
      data: {
        users: userService.listUsers(request.auth)
      }
    };

    response.json(payload);
  });

  router.post(
    "/users",
    requirePermission(
      canManageUsers,
      "The active user cannot create users."
    ),
    (request, response) => {
      const payload: UserResponse = {
        success: true,
        data: {
          user: userService.createUser(request.body, request.auth)
        }
      };

      response.status(201).json(payload);
    }
  );

  router.put(
    "/users/:userId",
    requirePermission(
      canManageUsers,
      "The active user cannot update users."
    ),
    (request, response) => {
      const userId = readRouteParam(request.params, "userId");
      const payload: UserResponse = {
        success: true,
        data: {
          user: userService.updateUser(userId, request.body, request.auth)
        }
      };

      response.json(payload);
    }
  );

  router.delete(
    "/users/:userId",
    requirePermission(
      canManageUsers,
      "The active user cannot delete users."
    ),
    (request, response) => {
      const userId = readRouteParam(request.params, "userId");
      const payload: DeleteUserResponse = {
        success: true,
        data: {
          deletedUserId: userService.deleteUser(userId, request.auth)
        }
      };

      response.json(payload);
    }
  );

  router.post(
    "/invitations",
    requirePermission(
      canManageUsers,
      "The active user cannot invite new users."
    ),
    (request, response) => {
      const payload: InvitationResponse = {
        success: true,
        data: {
          invitation: authService.createInvitation(request.body, request.auth)
        }
      };

      response.status(201).json(payload);
    }
  );

  return router;
}
