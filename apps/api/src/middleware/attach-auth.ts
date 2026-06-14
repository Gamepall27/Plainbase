import type { NextFunction, Request, Response } from "express";
import { readSessionCookie } from "../auth/session-cookie.js";
import { AuthService } from "../services/auth-service.js";

export function attachAuth(authService: AuthService) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const sessionToken = readSessionCookie(request.headers.cookie);
    request.auth = authService.getAuthState(sessionToken);
    next();
  };
}
