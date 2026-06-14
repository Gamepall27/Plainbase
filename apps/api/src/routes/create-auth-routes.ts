import type {
  AuthResponse,
  OnboardingResponse,
  PasswordResetRequestResponse,
  ResetPasswordResponse
} from "@plainbase/shared";
import { Router } from "express";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../auth/session-cookie.js";
import { AuthService } from "../services/auth-service.js";

export function createAuthRoutes(authService: AuthService) {
  const router = Router();

  router.get("/auth/me", (request, response) => {
    const payload: AuthResponse = {
      success: true,
      data: request.auth
    };

    response.json(payload);
  });

  router.get("/auth/onboarding", (request, response) => {
    const payload: OnboardingResponse = {
      success: true,
      data: {
        onboarding: authService.getOnboardingState(request.auth)
      }
    };

    response.json(payload);
  });

  router.post("/auth/bootstrap", (request, response) => {
    const sessionResult = authService.bootstrapInstallation(request.body);
    setSessionCookie(
      response,
      sessionResult.sessionToken,
      sessionResult.auth.session.expiresAt
    );

    const payload: AuthResponse = {
      success: true,
      data: sessionResult.auth
    };

    response.status(201).json(payload);
  });

  router.post("/auth/sign-in", (request, response) => {
    const sessionResult = authService.signIn(request.body);
    setSessionCookie(
      response,
      sessionResult.sessionToken,
      sessionResult.auth.session.expiresAt
    );

    const payload: AuthResponse = {
      success: true,
      data: sessionResult.auth
    };

    response.json(payload);
  });

  router.post("/auth/sign-out", (request, response) => {
    const payload: AuthResponse = {
      success: true,
      data: authService.signOut(readSessionCookie(request.headers.cookie))
    };

    clearSessionCookie(response);
    response.json(payload);
  });

  router.post("/auth/password-reset/request", (request, response) => {
    const payload: PasswordResetRequestResponse = {
      success: true,
      data: authService.requestPasswordReset(request.body)
    };

    response.json(payload);
  });

  router.post("/auth/password-reset/confirm", (request, response) => {
    const payload: ResetPasswordResponse = {
      success: true,
      data: authService.resetPassword(request.body)
    };

    clearSessionCookie(response);
    response.json(payload);
  });

  router.post("/auth/accept-invite", (request, response) => {
    const sessionResult = authService.acceptInvitation(request.body);
    setSessionCookie(
      response,
      sessionResult.sessionToken,
      sessionResult.auth.session.expiresAt
    );

    const payload: AuthResponse = {
      success: true,
      data: sessionResult.auth
    };

    response.status(201).json(payload);
  });

  return router;
}
