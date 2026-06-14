import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../../apps/api/src/errors/api-error.ts";
import { errorHandler, notFoundHandler } from "../../apps/api/src/middleware/error-handler.ts";
import { requirePermission } from "../../apps/api/src/middleware/require-permission.ts";

test("requirePermission allows matching roles and rejects missing permission", () => {
  const allowedCalls: unknown[] = [];
  const deniedCalls: unknown[] = [];
  const middleware = requirePermission(
    (roleName) => roleName === "Admin",
    "Nicht erlaubt."
  );

  middleware(
    {
      auth: {
        authType: "session",
        tenant: {
          id: "tenant-1",
          name: "Tenant One",
          slug: "tenant-one",
          createdAt: "2026-06-14T12:00:00.000Z",
          updatedAt: "2026-06-14T12:00:00.000Z"
        },
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          name: "Admin User",
          username: "admin",
          email: "admin@example.com",
          roleId: "role-admin",
          avatarUrl: null
        },
        role: {
          id: "role-admin",
          name: "Admin"
        },
        session: {
          expiresAt: "2026-06-14T12:00:00.000Z"
        }
      }
    } as never,
    {} as never,
    (error?: unknown) => allowedCalls.push(error)
  );

  middleware(
    {
      auth: {
        authType: "guest",
        tenant: null,
        user: null,
        role: null,
        session: null
      }
    } as never,
    {} as never,
    (error?: unknown) => deniedCalls.push(error)
  );

  assert.deepEqual(allowedCalls, [undefined]);
  assert.equal(deniedCalls.length, 1);
  assert.ok(deniedCalls[0] instanceof ApiError);
});

test("notFoundHandler returns a 404 payload with method and route", () => {
  const response = createResponseCapture();

  notFoundHandler(
    {
      method: "GET",
      originalUrl: "/api/missing"
    } as never,
    response as never
  );

  assert.equal(response.statusCode, 404);
  assert.equal(response.payload?.error.code, "NOT_FOUND");
  assert.match(response.payload?.error.message ?? "", /GET \/api\/missing/);
});

test("errorHandler maps api, json and unknown errors to api responses", () => {
  const apiErrorResponse = createResponseCapture();
  errorHandler(
    new ApiError(409, "CONFLICT", "Schon vorhanden.", { slug: "duplicate" }),
    {} as never,
    apiErrorResponse as never,
    () => {}
  );
  assert.equal(apiErrorResponse.statusCode, 409);
  assert.equal(apiErrorResponse.payload?.error.code, "CONFLICT");
  assert.equal(apiErrorResponse.payload?.error.details?.slug, "duplicate");

  const jsonErrorResponse = createResponseCapture();
  const jsonError = new SyntaxError("Unexpected token");
  Object.assign(jsonError, { status: 400 });
  errorHandler(jsonError, {} as never, jsonErrorResponse as never, () => {});
  assert.equal(jsonErrorResponse.statusCode, 400);
  assert.equal(jsonErrorResponse.payload?.error.code, "BAD_REQUEST");

  const unknownErrorResponse = createResponseCapture();
  const originalConsoleError = console.error;
  const loggedErrors: unknown[] = [];
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args);
  };

  try {
    errorHandler(new Error("boom"), {} as never, unknownErrorResponse as never, () => {});
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(unknownErrorResponse.statusCode, 500);
  assert.equal(unknownErrorResponse.payload?.error.code, "INTERNAL_SERVER_ERROR");
  assert.equal(loggedErrors.length, 1);
});

function createResponseCapture() {
  return {
    headersSent: false,
    statusCode: 200,
    payload: null as {
      error: {
        code: string;
        message: string;
        details?: Record<string, string>;
      };
    } | null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload as typeof this.payload;
      return this;
    }
  };
}
