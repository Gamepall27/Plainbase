export type EditorDraft = {
  id: string | null;
  workspaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  content: string;
  isNew: boolean;
};
