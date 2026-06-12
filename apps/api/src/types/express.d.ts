import type { DemoAuthContext } from "../auth/demo-auth-context.js";

declare global {
  namespace Express {
    interface Request {
      auth: DemoAuthContext;
    }
  }
}

export {};
