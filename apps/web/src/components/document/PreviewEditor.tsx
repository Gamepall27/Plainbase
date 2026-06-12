import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";
import type { MarkdownBlockRendererExtension } from "@plainbase/addon-sdk";
import type { Document } from "@plainbase/shared";
import type { FormattingAction } from "../../editor/markdown-format";
import { htmlToMarkdown } from "../../editor/html-to-markdown";
import { renderMarkdownToSafeHtml } from "../../lib/markdown-rendering";

type PreviewEditorProps = {
  canEdit: boolean;
  content: string;
  currentDocument: Document | null;
  markdownBlockRenderers: MarkdownBlockRendererExtension<string>[];
  workspaceId: string | null;
  onContentChange: (content: string) => void;
};

export type PreviewEditorHandle = {
  applyFormatting: (action: FormattingAction) => void;
};

export const PreviewEditor = forwardRef<PreviewEditorHandle, PreviewEditorProps>(
  function PreviewEditor(
    {
      canEdit,
      content,
      currentDocument,
      markdownBlockRenderers,
      workspaceId,
      onContentChange
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const lastSyncedContentRef = useRef("");

    useEffect(() => {
      const editor = editorRef.current;

      if (!editor || document.activeElement === editor) {
        return;
      }

      if (lastSyncedContentRef.current === content) {
        return;
      }

      editor.innerHTML =
        content.trim().length === 0
          ? "<p><br></p>"
          : renderMarkdownToSafeHtml({
              content,
              currentDocument,
              markdownBlockRenderers,
              workspaceId
            });
      lastSyncedContentRef.current = content;
    }, [content, currentDocument, markdownBlockRenderers, workspaceId]);

    useImperativeHandle(
      ref,
      () => ({
        applyFormatting: (action) => {
          applyEditorFormatting(action);
        }
      }),
      [canEdit]
    );

    function syncContent() {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const nextContent = htmlToMarkdown(editor);
      lastSyncedContentRef.current = nextContent;
      onContentChange(nextContent);
    }

    function applyEditorFormatting(action: FormattingAction) {
      const editor = editorRef.current;

      if (!editor || !canEdit) {
        return;
      }

      editor.focus();

      switch (action) {
        case "heading":
          document.execCommand("formatBlock", false, "h1");
          break;
        case "bold":
          document.execCommand("bold");
          break;
        case "italic":
          document.execCommand("italic");
          break;
        case "list":
          document.execCommand("insertUnorderedList");
          break;
        case "codeblock":
          document.execCommand("formatBlock", false, "pre");
          break;
      }

      syncContent();
    }

    function handleKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
      if (!canEdit || event.key !== " ") {
        return;
      }

      if (convertMarkdownShortcut()) {
        syncContent();
      }
    }

    function convertMarkdownShortcut() {
      const block = getCurrentBlock(editorRef.current);

      if (!block) {
        return false;
      }

      const text = block.textContent ?? "";
      const trimmedText = text.trim();

      if (/^#{1,3}$/.test(trimmedText)) {
        replaceBlock(block, `h${trimmedText.length}`);
        return true;
      }

      if (trimmedText === "-") {
        replaceBlockWithList(block, "ul");
        return true;
      }

      if (trimmedText === "1.") {
        replaceBlockWithList(block, "ol");
        return true;
      }

      if (trimmedText === ">") {
        replaceBlock(block, "blockquote");
        return true;
      }

      if (trimmedText === "```") {
        replaceBlock(block, "pre");
        return true;
      }

      return false;
    }

    return (
      <div
        ref={editorRef}
        className={
          content.trim().length === 0
            ? "markdown-preview preview-editor is-empty"
            : "markdown-preview preview-editor"
        }
        contentEditable={canEdit}
        suppressContentEditableWarning
        data-placeholder="Direkt hier schreiben..."
        onInput={syncContent}
        onKeyUp={handleKeyUp}
      />
    );
  }
);

function getCurrentBlock(editor: HTMLElement | null) {
  const selection = window.getSelection();
  const anchorNode = selection?.anchorNode;

  if (!editor || !anchorNode || !editor.contains(anchorNode)) {
    return null;
  }

  const startElement =
    anchorNode.nodeType === Node.ELEMENT_NODE
      ? (anchorNode as HTMLElement)
      : anchorNode.parentElement;

  return startElement?.closest(
    "p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre"
  ) as HTMLElement | null;
}

function replaceBlock(block: HTMLElement, tagName: string) {
  const replacement = document.createElement(tagName);
  replacement.append(document.createElement("br"));
  block.replaceWith(replacement);
  placeCaretAtStart(replacement);
}

function replaceBlockWithList(block: HTMLElement, tagName: "ul" | "ol") {
  const list = document.createElement(tagName);
  const item = document.createElement("li");

  item.append(document.createElement("br"));
  list.append(item);
  block.replaceWith(list);
  placeCaretAtStart(item);
}

function placeCaretAtStart(element: HTMLElement) {
  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
