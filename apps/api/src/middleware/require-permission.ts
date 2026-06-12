import type { NextFunction, Request, Response } from "express";
import type { DemoAuthContext } from "../auth/demo-auth-context.js";
import { ApiError } from "../errors/api-error.js";

type PermissionCheck = (user: DemoAuthContext) => boolean;

export function requirePermission(
  permissionCheck: PermissionCheck,
  message: string
) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!permissionCheck(request.auth)) {
      next(new ApiError(403, "FORBIDDEN", message));
      return;
    }

    next();
  };
}
