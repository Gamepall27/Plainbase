import type { MarkdownBlockRendererExtension } from "@plainbase/addon-sdk";
import type { Document } from "@plainbase/shared";
import DOMPurify from "dompurify";
import { marked } from "marked";

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
  const contentWithAddonBlocks = applyMarkdownBlockRenderers(
    content,
    markdownBlockRenderers,
    currentDocument,
    workspaceId
  );
  const rawHtml = marked.parse(contentWithAddonBlocks, {
    async: false,
    breaks: true,
    gfm: true
  }) as string;
  const safeHtml = DOMPurify.sanitize(rawHtml);

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

function applyMarkdownBlockRenderers(
  content: string,
  renderers: MarkdownBlockRendererExtension<string>[],
  currentDocument: Document | null,
  workspaceId: string | null
) {
  return content.replace(
    /```([a-z0-9_-]+)\n([\s\S]*?)```/gi,
    (match, language, code) => {
      const renderer = renderers.find(
        (item) => item.language.toLowerCase() === String(language).toLowerCase()
      );

      if (!renderer) {
        return match;
      }

      const rendered = renderer.render({
        code: String(code).trim(),
        currentDocument,
        language: String(language),
        workspaceId
      });

      return rendered ?? match;
    }
  );
}
