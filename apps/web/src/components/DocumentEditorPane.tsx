import { useRef } from "react";
import type { EditorDraft } from "../editor/types";
import {
  applyFormatting,
  type FormattingAction
} from "../editor/markdown-format";
import { EditorFormattingToolbar } from "./EditorFormattingToolbar";

type DocumentEditorPaneProps = {
  canEdit: boolean;
  draft: EditorDraft | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  message?: string | null;
  onDraftChange: (draft: EditorDraft) => void;
};

export function DocumentEditorPane({
  canEdit,
  draft,
  hasUnsavedChanges,
  isSaving,
  message,
  onDraftChange
}: DocumentEditorPaneProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleApplyFormatting(action: FormattingAction) {
    if (!draft || !textareaRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    const result = applyFormatting(
      draft.content,
      textarea.selectionStart,
      textarea.selectionEnd,
      action
    );

    onDraftChange({
      ...draft,
      content: result.content
    });

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <section className="editor-pane">
      <div className="pane-header">
        <div>
          <p className="section-label">Markdown-Editor</p>
          <h2>{draft?.isNew ? "Neues Dokument" : draft?.title || "Dokument"}</h2>
        </div>
        <div className="editor-status-stack">
          {hasUnsavedChanges && (
            <p className="unsaved-indicator">Ungespeicherte Aenderungen</p>
          )}
          {isSaving && <p className="editor-meta-text">Speichere Dokument...</p>}
          {message && !hasUnsavedChanges && (
            <p className="editor-meta-text">{message}</p>
          )}
        </div>
      </div>

      {draft ? (
        <>
          <div className="document-fields">
            <label className="field-group">
              <span>Titel</span>
              <input
                aria-label="Titel"
                className="field"
                value={draft.title}
                disabled={!canEdit}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    title: event.target.value
                  })
                }
              />
            </label>

            <label className="field-group">
              <span>Slug</span>
              <input
                aria-label="Slug"
                className="field"
                value={draft.slug}
                disabled={!canEdit}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    slug: event.target.value
                  })
                }
              />
            </label>
          </div>

          <EditorFormattingToolbar
            disabled={!canEdit}
            onApply={handleApplyFormatting}
          />

          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={draft.content}
            disabled={!canEdit}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                content: event.target.value
              })
            }
          />

          {!canEdit && (
            <p className="hint-text">
              Die aktive Rolle darf den Editor nur lesen.
            </p>
          )}
        </>
      ) : (
        <div className="empty-state">
          <h3>Kein Dokument ausgewaehlt</h3>
          <p>
            Waehle links ein Dokument aus oder lege ein neues Dokument im
            aktiven Workspace an.
          </p>
        </div>
      )}
    </section>
  );
}
