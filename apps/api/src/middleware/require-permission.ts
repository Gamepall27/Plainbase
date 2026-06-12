import type { NextFunction, Request, Response } from "express";
import type { RoleName } from "@plainbase/shared";
import { ApiError } from "../errors/api-error.js";

type PermissionCheck = (roleName: RoleName | null | undefined) => boolean;

export function requirePermission(
  permissionCheck: PermissionCheck,
  message: string
) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!permissionCheck(request.auth.role.name)) {
      next(new ApiError(403, "FORBIDDEN", message));
      return;
    }

    next();
  };
}
