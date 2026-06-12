import type { NextFunction, Request, Response } from "express";
import { DemoAuthService } from "../services/demo-auth-service.js";

export function attachDemoAuth(demoAuthService: DemoAuthService) {
  return (request: Request, _response: Response, next: NextFunction) => {
    request.auth = demoAuthService.getActiveDemoAuth();
    next();
  };
}
