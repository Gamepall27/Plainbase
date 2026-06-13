import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyDraft, mapDocumentToDraft, slugify, countWords } from "../../apps/web/src/lib/document-draft.ts";

test("createEmptyDraft creates a writable default document draft", () => {
  const draft = createEmptyDraft("workspace-1");

  assert.equal(draft.workspaceId, "workspace-1");
  assert.equal(draft.kind, "document");
  assert.equal(draft.isNew, true);
  assert.match(draft.content, /Neues Objekt/);
});

test("mapDocumentToDraft preserves kanban document metadata", () => {
  const draft = mapDocumentToDraft({
    id: "document-1",
    workspaceId: "workspace-1",
    parentId: null,
    kind: "kanban",
    sortOrder: 0,
    title: "Roadmap",
    slug: "roadmap",
    content: "## Board-Notizen",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: "user-admin",
    updatedByUserId: "user-admin"
  });

  assert.equal(draft.kind, "kanban");
  assert.equal(draft.title, "Roadmap");
  assert.equal(draft.isNew, false);
});

test("slugify normalizes titles into stable slugs", () => {
  assert.equal(slugify("  Plainbase Release 1.0!  "), "plainbase-release-1-0");
  assert.equal(slugify("Mehr   Raum"), "mehr-raum");
});

test("countWords handles empty and filled content", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("  eins   zwei drei "), 3);
});
