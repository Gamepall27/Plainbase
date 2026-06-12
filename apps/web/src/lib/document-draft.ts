import type { Document } from "@plainbase/shared";
import type { EditorDraft } from "../editor/types";

export function createEmptyDraft(workspaceId: string): EditorDraft {
  return {
    id: null,
    workspaceId,
    parentId: null,
    title: "",
    slug: "",
    content: "# Neues Dokument\n",
    isNew: true
  };
}

export function mapDocumentToDraft(document: Document): EditorDraft {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    parentId: document.parentId,
    title: document.title,
    slug: document.slug,
    content: document.content,
    isNew: false
  };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function countWords(value: string) {
  const matches = value.trim().match(/\S+/g);
  return matches?.length ?? 0;
}
