import type {
  DemoUserResponse,
  UsersResponse
} from "@plainbase/shared";
import { Router } from "express";
import { UserService } from "../services/user-service.js";

export function createUserRoutes(userService: UserService) {
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
      data: userService.getDemoUser()
    };

    response.json(payload);
  });

  router.post("/demo-user/switch-role", (request, response) => {
    const payload: DemoUserResponse = {
      success: true,
      data: userService.switchDemoUserRole(request.body)
    };

    response.json(payload);
  });

  return router;
}
