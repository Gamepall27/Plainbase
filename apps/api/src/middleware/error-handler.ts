import type { ApiErrorResponse } from "@plainbase/shared";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../errors/api-error.js";

export function notFoundHandler(request: Request, response: Response) {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${request.method} ${request.originalUrl}`
    }
  };

  response.status(404).json(payload);
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction
) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };

    response.status(error.statusCode).json(payload);
    return;
  }

  if (isJsonParseError(error)) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Request body contains invalid JSON."
      }
    };

    response.status(400).json(payload);
    return;
  }

  console.error(error);

  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred."
    }
  };

  response.status(500).json(payload);
}

function isJsonParseError(error: unknown): error is SyntaxError & { status: number } {
  const errorWithStatus = error as { status?: unknown } | null;

  return (
    error instanceof SyntaxError &&
    typeof errorWithStatus?.status === "number" &&
    errorWithStatus.status === 400
  );
}
