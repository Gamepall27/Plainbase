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
      kind: document.kind,
      parentId: document.parentId,
      sortOrder: document.sortOrder,
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
      kind: "document",
      parentId: null,
      sortOrder: -1,
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
      items: sortSidebarItems(topLevelItems)
    }
  ];
}

function sortSidebarItems(items: SidebarItem[]): SidebarItem[] {
  return [...items]
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      if (left.kind !== right.kind) {
        return left.kind === "folder" ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    })
    .map((item) => ({
      ...item,
      children: item.children ? sortSidebarItems(item.children) : []
    }));
}
