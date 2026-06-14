import assert from "node:assert/strict";
import test from "node:test";
import { ApiClientError } from "../../apps/web/src/api/client.ts";
import { getErrorMessage } from "../../apps/web/src/lib/app-errors.ts";
import {
  formatTimestamp,
  getInitials
} from "../../apps/web/src/lib/formatters.ts";

test("formatters derive readable timestamps and initials", () => {
  assert.equal(formatTimestamp(null), "unbekannt");
  assert.match(formatTimestamp("2026-06-14T10:30:00.000Z"), /\d{2}\.\d{2}\., \d{2}:\d{2}/);

  assert.equal(getInitials("Plain Base"), "PB");
  assert.equal(getInitials("single"), "S");
  assert.equal(getInitials("  Anna   Meyer  "), "AM");
});

test("getErrorMessage unwraps api, generic and unknown errors", () => {
  assert.equal(
    getErrorMessage(new ApiClientError(403, "Nicht erlaubt.")),
    "Nicht erlaubt."
  );
  assert.equal(getErrorMessage(new Error("Kaputt.")), "Kaputt.");
  assert.equal(getErrorMessage("unexpected"), "Unbekannter Fehler.");
});
