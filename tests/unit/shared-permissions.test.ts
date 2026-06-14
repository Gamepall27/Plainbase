import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateDocument,
  canCreateTicket,
  canDeleteDocument,
  canEditDocument,
  canEditTicket,
  canManageAddons,
  canManageUsers,
  isAdmin
} from "../../packages/shared/src/index.ts";

test("role permission helpers enforce admin, editor and guest capabilities", () => {
  assert.equal(isAdmin("Admin"), true);
  assert.equal(isAdmin("Editor"), false);
  assert.equal(isAdmin(null), false);

  assert.equal(canCreateDocument("Admin"), true);
  assert.equal(canCreateDocument("Editor"), true);
  assert.equal(canCreateDocument("Viewer"), false);

  assert.equal(canEditDocument("Admin"), true);
  assert.equal(canEditDocument("Editor"), true);
  assert.equal(canEditDocument("Viewer"), false);

  assert.equal(canDeleteDocument("Admin"), true);
  assert.equal(canDeleteDocument("Editor"), false);

  assert.equal(canManageAddons("Admin"), true);
  assert.equal(canManageAddons("Viewer"), false);

  assert.equal(canManageUsers("Admin"), true);
  assert.equal(canManageUsers(undefined), false);

  assert.equal(canCreateTicket("Admin"), true);
  assert.equal(canCreateTicket("Editor"), true);
  assert.equal(canCreateTicket("Viewer"), false);

  assert.equal(canEditTicket("Admin"), true);
  assert.equal(canEditTicket("Editor"), true);
  assert.equal(canEditTicket("Viewer"), false);
});
