import { ApiClientError } from "../api/client";

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return Object.values(error.details ?? {})[0] ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unbekannter Fehler.";
}
