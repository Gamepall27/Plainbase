import type { Document } from "@plainbase/shared";
import type { EditorDraft } from "../editor/types";
import type { SidebarFolder, SidebarItem } from "../app/types";

export const quickLinks = [
  "Alle Dokumente",
  "Favoriten",
  "Kuerzlich geoeffnet"
];

export function buildSidebarFolders(
  documents: Document[],
  draft: EditorDraft | null
): SidebarFolder[] {
  const documentMap = new Map<string, SidebarItem>();

  for (const document of documents) {
    documentMap.set(document.id, {
      id: document.id,
      title: document.title,
      slug: document.slug,
      documentId: document.id,
      children: []
    });
  }

  const topLevelItems: SidebarItem[] = [];

  for (const document of documents) {
    const item = documentMap.get(document.id);

    if (!item) {
      continue;
    }

    if (document.parentId) {
      const parent = documentMap.get(document.parentId);

      if (parent) {
        parent.children = [...(parent.children ?? []), item];
        continue;
      }
    }

    topLevelItems.push(item);
  }

  if (draft?.isNew) {
    topLevelItems.unshift({
      id: "draft-object",
      title: draft.title.trim() || "Neues Objekt",
      disabled: true
    });
  }

  if (topLevelItems.length === 0) {
    return [];
  }

  return [
    {
      id: "workspace-documents",
      title: "Eigene Objekte",
      items: topLevelItems
    }
  ];
}
