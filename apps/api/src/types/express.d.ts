import type { AuthContext } from "../auth/auth-context.js";

declare global {
  namespace Express {
    interface Request {
      auth: AuthContext;
    }
  }
}

export {};
