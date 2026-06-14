import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { Response } from "express";
import { requireAuthenticatedUser } from "../../apps/api/src/auth/auth-context.ts";
import {
  clearSessionCookie,
  readSessionCookie,
  sessionCookieName,
  setSessionCookie
} from "../../apps/api/src/auth/session-cookie.ts";
import {
  hashPassword,
  verifyPassword
} from "../../apps/api/src/auth/passwords.ts";
import { createOpaqueToken, hashToken } from "../../apps/api/src/auth/tokens.ts";
import { ApiError } from "../../apps/api/src/errors/api-error.ts";

test("password helpers hash and verify modern and legacy passwords", () => {
  const passwordHash = hashPassword("plainbase-secret");

  assert.match(passwordHash, /^scrypt\$/);
  assert.equal(verifyPassword("plainbase-secret", passwordHash), true);
  assert.equal(verifyPassword("wrong-secret", passwordHash), false);

  const legacyHash = createHash("sha256").update("legacy-secret").digest("hex");
  assert.equal(verifyPassword("legacy-secret", legacyHash), true);
  assert.equal(verifyPassword("wrong-secret", legacyHash), false);
});

test("token helpers create opaque values and deterministic hashes", () => {
  const token = createOpaqueToken();

  assert.ok(token.length > 20);
  assert.equal(hashToken("plainbase-token"), hashToken("plainbase-token"));
  assert.notEqual(hashToken("plainbase-token"), hashToken("another-token"));
});

test("session cookie helpers read, set and clear cookies", () => {
  assert.equal(
    readSessionCookie(`${sessionCookieName}=abc123; theme=dark`),
    "abc123"
  );
  assert.equal(readSessionCookie("theme=dark"), null);

  const headers: Record<string, string[] | undefined> = {};
  const response = {
    setHeader(name: string, value: string[]) {
      headers[name] = value;
      return this;
    }
  } as unknown as Response;

  setSessionCookie(response, "plainbase token", "2026-06-14T12:00:00.000Z");
  assert.ok(headers["Set-Cookie"]?.[0]?.includes(`${sessionCookieName}=plainbase%20token`));
  assert.ok(headers["Set-Cookie"]?.[0]?.includes("HttpOnly"));
  assert.ok(headers["Set-Cookie"]?.[0]?.includes("SameSite=Lax"));

  clearSessionCookie(response);
  assert.ok(headers["Set-Cookie"]?.[0]?.includes("Expires=Thu, 01 Jan 1970"));
});

test("requireAuthenticatedUser accepts session auth and rejects guests", () => {
  const sessionAuth = {
    authType: "session" as const,
    user: {
      id: "user-1",
      name: "Admin User",
      username: "admin",
      email: "admin@example.com",
      roleId: "role-admin",
      avatarUrl: null
    },
    role: {
      id: "role-admin",
      name: "Admin" as const
    },
    session: {
      expiresAt: "2026-06-14T12:00:00.000Z"
    }
  };

  assert.equal(requireAuthenticatedUser(sessionAuth), sessionAuth);

  assert.throws(
    () =>
      requireAuthenticatedUser({
        authType: "guest",
        user: null,
        role: null,
        session: null
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, 401);
      return true;
    }
  );
});
