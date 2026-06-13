import type { DocumentKind } from "@plainbase/shared";

export type EditorDraft = {
  id: string | null;
  workspaceId: string;
  parentId: string | null;
  kind: DocumentKind;
  title: string;
  slug: string;
  content: string;
  isNew: boolean;
};
