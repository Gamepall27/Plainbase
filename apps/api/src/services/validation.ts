import type { RoleName, TicketStatus } from "@plainbase/shared";
import { ApiError } from "../errors/api-error.js";

const roleNames = ["Admin", "Editor", "Viewer"] satisfies RoleName[];
const ticketStatuses = [
  "Open",
  "In Progress",
  "Done"
] satisfies TicketStatus[];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

export function expectObject(value: unknown, message = "Request body must be an object.") {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", message);
  }

  return value as Record<string, unknown>;
}

export function readRequiredString(
  input: Record<string, unknown>,
  field: string,
  label = field
) {
  const value = input[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${label} is required.`
    });
  }

  return value.trim();
}

export function readRequiredText(
  input: Record<string, unknown>,
  field: string,
  label = field
) {
  const value = input[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${label} is required.`
    });
  }

  return value;
}

export function readOptionalString(
  input: Record<string, unknown>,
  field: string,
  label = field
) {
  if (!(field in input)) {
    return undefined;
  }

  const value = input[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${label} must be a non-empty string.`
    });
  }

  return value.trim();
}

export function readOptionalText(
  input: Record<string, unknown>,
  field: string,
  label = field
) {
  if (!(field in input)) {
    return undefined;
  }

  const value = input[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${label} must be a non-empty string.`
    });
  }

  return value;
}

export function readOptionalNullableString(
  input: Record<string, unknown>,
  field: string,
  label = field
) {
  if (!(field in input)) {
    return undefined;
  }

  const value = input[field];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${label} must be a non-empty string or null.`
    });
  }

  return value.trim();
}

export function readOptionalInteger(
  input: Record<string, unknown>,
  field: string,
  label = field
) {
  if (!(field in input)) {
    return undefined;
  }

  const value = input[field];

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${label} must be a non-negative integer.`
    });
  }

  return value;
}

export function readRequiredRoleName(
  input: Record<string, unknown>,
  field: string
) {
  return readRequiredEnum(input, field, roleNames);
}

export function readOptionalTicketStatus(
  input: Record<string, unknown>,
  field: string
) {
  return readOptionalEnum(input, field, ticketStatuses);
}

export function readTicketStatus(
  input: Record<string, unknown>,
  field: string,
  fallback: TicketStatus
) {
  return readOptionalEnum(input, field, ticketStatuses) ?? fallback;
}

export function validateSlug(slug: string, field = "slug") {
  if (!slugPattern.test(slug)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]:
        "Slug must use lowercase letters, numbers, and hyphens only."
    });
  }
}

export function validateEmail(email: string, field = "email") {
  if (!email.includes("@")) {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: "Email must contain @."
    });
  }
}

export function validateUsername(username: string, field = "username") {
  if (!usernamePattern.test(username)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]:
        "Username must be 3-32 characters and use lowercase letters, numbers, dots, underscores, or hyphens."
    });
  }
}

export function validatePassword(password: string, field = "password") {
  if (password.length < 8) {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: "Password must be at least 8 characters long."
    });
  }
}

export function requireAtLeastOneField(
  input: Record<string, unknown>,
  fields: string[],
  message: string
) {
  const hasAnyField = fields.some((field) => field in input);

  if (!hasAnyField) {
    throw new ApiError(422, "VALIDATION_ERROR", message);
  }
}

export function readRouteParam(
  input: Record<string, string | string[] | undefined>,
  field: string
) {
  const value = input[field];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, "BAD_REQUEST", `Route parameter ${field} is required.`);
  }

  return value;
}

function readRequiredEnum<T extends string>(
  input: Record<string, unknown>,
  field: string,
  allowedValues: readonly T[]
) {
  const value = readRequiredString(input, field);

  if (!allowedValues.includes(value as T)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${field} must be one of: ${allowedValues.join(", ")}.`
    });
  }

  return value as T;
}

function readOptionalEnum<T extends string>(
  input: Record<string, unknown>,
  field: string,
  allowedValues: readonly T[]
) {
  const value = readOptionalString(input, field);

  if (value === undefined) {
    return undefined;
  }

  if (!allowedValues.includes(value as T)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
      [field]: `${field} must be one of: ${allowedValues.join(", ")}.`
    });
  }

  return value as T;
}
