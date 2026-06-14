import type { AuthState, SessionAuth } from "@plainbase/shared";
import { ApiError } from "../errors/api-error.js";

export type AuthContext = AuthState;

export function requireAuthenticatedUser(auth: AuthContext): SessionAuth {
  if (auth.authType !== "session") {
    throw new ApiError(
      401,
      "FORBIDDEN",
      "You must sign in to perform this action."
    );
  }

  return auth;
}
