import type { DemoAuth, DemoUser } from "@plainbase/shared";
import { ApiError } from "../errors/api-error.js";

export type DemoAuthContext = DemoAuth;

export function requireDemoUser(auth: DemoAuthContext): DemoUser {
  if (auth.authType !== "demo") {
    throw new ApiError(
      401,
      "FORBIDDEN",
      "You must sign in with a demo user to perform this action."
    );
  }

  return auth;
}
