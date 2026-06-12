import type { Document } from "@plainbase/shared";
import type { SidebarFolder, SidebarItem } from "../app/types";

export const quickLinks = [
  "Alle Dokumente",
  "Favoriten",
  "Kuerzlich geoeffnet"
];

export const staticFolders: SidebarFolder[] = [
  {
    id: "handbook",
    title: "Handbuch",
    items: [
      { id: "handbook-started", title: "Getting Started", disabled: true },
      { id: "handbook-rules", title: "Richtlinien", disabled: true }
    ]
  },
  {
    id: "projects",
    title: "Projekte",
    items: [
      { id: "project-relaunch", title: "Website Relaunch", disabled: true },
      { id: "project-mobile", title: "Mobile App", disabled: true }
    ]
  },
  {
    id: "archive",
    title: "Archiv",
    items: [{ id: "archive-notes", title: "Alte Notizen", disabled: true }]
  }
];

export function buildSidebarFolders(documents: Document[]): SidebarFolder[] {
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

  return [
    {
      id: "workspace-documents",
      title: "Willkommen",
      items: topLevelItems
    }
  ];
}
