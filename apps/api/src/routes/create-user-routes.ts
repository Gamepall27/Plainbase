import type {
  DemoUserResponse,
  UsersResponse
} from "@plainbase/shared";
import { Router } from "express";
import { DemoAuthService } from "../services/demo-auth-service.js";
import { UserService } from "../services/user-service.js";

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

  return router;
}
