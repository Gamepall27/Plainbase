import type {
  DeleteUserResponse,
  UserResponse,
  DemoUserResponse,
  UsersResponse
} from "@plainbase/shared";
import { Router } from "express";
import { canManageUsers } from "@plainbase/shared";
import { DemoAuthService } from "../services/demo-auth-service.js";
import { UserService } from "../services/user-service.js";
import { requirePermission } from "../middleware/require-permission.js";
import { readRouteParam } from "../services/validation.js";

export function createUserRoutes(
  userService: UserService,
  demoAuthService: DemoAuthService
) {
  const router = Router();

  router.get("/users", (_request, response) => {
    const payload: UsersResponse = {
      success: true,
      data: {
        users: userService.listUsers()
      }
    };

    response.json(payload);
  });

  router.post(
    "/users",
    requirePermission(
      canManageUsers,
      "The active demo user cannot create users."
    ),
    (request, response) => {
      const payload: UserResponse = {
        success: true,
        data: {
          user: userService.createUser(request.body)
        }
      };

      response.status(201).json(payload);
    }
  );

  router.put(
    "/users/:userId",
    requirePermission(
      canManageUsers,
      "The active demo user cannot update users."
    ),
    (request, response) => {
      const userId = readRouteParam(request.params, "userId");
      const payload: UserResponse = {
        success: true,
        data: {
          user: userService.updateUser(userId, request.body)
        }
      };

      response.json(payload);
    }
  );

  router.delete(
    "/users/:userId",
    requirePermission(
      canManageUsers,
      "The active demo user cannot delete users."
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

  router.get("/demo-user", (_request, response) => {
    const payload: DemoUserResponse = {
      success: true,
      data: demoAuthService.getActiveDemoAuth()
    };

    response.json(payload);
  });

  router.post("/demo-user/switch-role", (request, response) => {
    const payload: DemoUserResponse = {
      success: true,
      data: demoAuthService.switchDemoUserRole(request.body)
    };

    response.json(payload);
  });

  router.post("/demo-user/sign-in", (request, response) => {
    const payload: DemoUserResponse = {
      success: true,
      data: demoAuthService.signIn(request.body)
    };

    response.json(payload);
  });

  router.post("/demo-user/sign-out", (_request, response) => {
    const payload: DemoUserResponse = {
      success: true,
      data: demoAuthService.signOut()
    };

    response.json(payload);
  });

  return router;
}
