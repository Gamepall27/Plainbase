import assert from "node:assert/strict";
import test from "node:test";
import type { Document } from "@plainbase/shared";
import { buildSidebarFolders, quickLinks } from "../../apps/web/src/lib/sidebar-model.ts";

const documents: Document[] = [
  {
    id: "folder-1",
    workspaceId: "workspace-1",
    parentId: null,
    kind: "folder",
    sortOrder: 0,
    title: "Specs",
    slug: "specs",
    content: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: "user-admin",
    updatedByUserId: "user-admin"
  },
  {
    id: "document-2",
    workspaceId: "workspace-1",
    parentId: "folder-1",
    kind: "document",
    sortOrder: 1,
    title: "API",
    slug: "api",
    content: "# API",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: "user-admin",
    updatedByUserId: "user-admin"
  },
  {
    id: "document-1",
    workspaceId: "workspace-1",
    parentId: null,
    kind: "document",
    sortOrder: 2,
    title: "Welcome",
    slug: "welcome",
    content: "# Welcome",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: "user-admin",
    updatedByUserId: "user-admin"
  }
];

test("quick links expose the default navigation entries", () => {
  assert.deepEqual(
    quickLinks.map((entry) => entry.id),
    ["all-documents", "favorites", "recent", "tickets"]
  );
});

test("buildSidebarFolders sorts folders first, nests children and injects draft placeholders", () => {
  const folders = buildSidebarFolders(documents, {
    id: null,
    workspaceId: "workspace-1",
    parentId: null,
    kind: "document",
    title: "  Neuer Entwurf ",
    slug: "neuer-entwurf",
    content: "",
    isNew: true
  });

  assert.equal(folders.length, 1);
  assert.equal(folders[0]?.title, "Eigene Objekte");
  assert.equal(folders[0]?.items[0]?.id, "draft-object");
  assert.equal(folders[0]?.items[1]?.id, "folder-1");
  assert.equal(folders[0]?.items[2]?.id, "document-1");
  assert.equal(folders[0]?.items[1]?.children?.[0]?.id, "document-2");
});

test("buildSidebarFolders returns an empty array without documents or drafts", () => {
  assert.deepEqual(buildSidebarFolders([], null), []);
});
