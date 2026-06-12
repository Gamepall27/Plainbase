import type { RolesResponse } from "@plainbase/shared";
import { Router } from "express";
import { RoleService } from "../services/role-service.js";

export function createRoleRoutes(roleService: RoleService) {
  const router = Router();

  router.get("/roles", (_request, response) => {
    const payload: RolesResponse = {
      success: true,
      data: {
        roles: roleService.listRoles()
      }
    };

    response.json(payload);
  });

  return router;
}
