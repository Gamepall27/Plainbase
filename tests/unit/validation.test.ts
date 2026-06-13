import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../../apps/api/src/errors/api-error.ts";
import {
  expectObject,
  readOptionalInteger,
  readOptionalNullableString,
  readRequiredRoleName,
  readRequiredString,
  readTicketStatus,
  requireAtLeastOneField,
  validateSlug
} from "../../apps/api/src/services/validation.ts";

test("expectObject and readRequiredString normalize valid input", () => {
  const input = expectObject({
    title: "  Plainbase Ticket  "
  });

  assert.equal(readRequiredString(input, "title"), "Plainbase Ticket");
});

test("optional readers handle null, missing values and fallbacks", () => {
  const input = {
    documentId: null,
    estimate: 5
  };

  assert.equal(readOptionalNullableString(input, "documentId"), null);
  assert.equal(readOptionalNullableString(input, "assigneeId"), undefined);
  assert.equal(readOptionalInteger(input, "estimate"), 5);
  assert.equal(readTicketStatus({}, "status", "Open"), "Open");
});

test("enum readers accept known roles and statuses", () => {
  assert.equal(readRequiredRoleName({ roleName: "Admin" }, "roleName"), "Admin");
  assert.equal(
    readTicketStatus({ status: "In Progress" }, "status", "Open"),
    "In Progress"
  );
});

test("validation helpers raise ApiError for malformed values", () => {
  expectApiError(() => expectObject(null), 400, "BAD_REQUEST");
  expectApiError(
    () => readRequiredString({ title: "   " }, "title"),
    422,
    "VALIDATION_ERROR"
  );
  expectApiError(
    () => readOptionalInteger({ estimate: -1 }, "estimate"),
    422,
    "VALIDATION_ERROR"
  );
  expectApiError(
    () => readRequiredRoleName({ roleName: "Owner" }, "roleName"),
    422,
    "VALIDATION_ERROR"
  );
  expectApiError(
    () => readTicketStatus({ status: "Blocked" }, "status", "Open"),
    422,
    "VALIDATION_ERROR"
  );
  expectApiError(
    () => validateSlug("Invalid Slug"),
    422,
    "VALIDATION_ERROR"
  );
  expectApiError(
    () => requireAtLeastOneField({}, ["title", "status"], "Mindestens ein Feld ist noetig."),
    422,
    "VALIDATION_ERROR"
  );
});

function expectApiError(
  callback: () => unknown,
  expectedStatus: number,
  expectedCode: string
) {
  assert.throws(callback, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, expectedStatus);
    assert.equal(error.code, expectedCode);
    return true;
  });
}
