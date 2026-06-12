import type { ApiErrorCode, ApiErrorDetails } from "@plainbase/shared";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetails;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetails
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
