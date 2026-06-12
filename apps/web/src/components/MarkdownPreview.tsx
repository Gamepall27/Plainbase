import type { MarkdownBlockRendererExtension } from "@plainbase/addon-sdk";
import type { Document } from "@plainbase/shared";
import { renderMarkdownToSafeHtml } from "../lib/markdown-rendering";

type MarkdownPreviewProps = {
  content: string;
  currentDocument: Document | null;
  markdownBlockRenderers: MarkdownBlockRendererExtension<string>[];
  workspaceId: string | null;
};

export function MarkdownPreview({
  content,
  currentDocument,
  markdownBlockRenderers,
  workspaceId
}: MarkdownPreviewProps) {
  const safeHtml = renderMarkdownToSafeHtml({
    content,
    currentDocument,
    markdownBlockRenderers,
    workspaceId
  });

  if (content.trim().length === 0) {
    return <p className="preview-empty">Noch kein Inhalt vorhanden.</p>;
  }

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
