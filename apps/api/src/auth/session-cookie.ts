import type { Response } from "express";
import { apiConfig } from "../config.js";

export const sessionCookieName = "plainbase_session";

export function readSessionCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = pair.trim().split("=");

    if (rawName === sessionCookieName) {
      const rawValue = rawValueParts.join("=");
      return rawValue ? decodeURIComponent(rawValue) : null;
    }
  }

  return null;
}

export function setSessionCookie(response: Response, token: string, expiresAt: string) {
  response.setHeader("Set-Cookie", [
    serializeCookie(token, expiresAt)
  ]);
}

export function clearSessionCookie(response: Response) {
  response.setHeader("Set-Cookie", [serializeCookie("", "1970-01-01T00:00:00.000Z")]);
}

function serializeCookie(token: string, expiresAt: string) {
  const parts = [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    `Expires=${new Date(expiresAt).toUTCString()}`,
    "HttpOnly",
    "SameSite=Lax"
  ];

  if (apiConfig.secureCookies) {
    parts.push("Secure");
  }

  return parts.join("; ");
}
