import { forwardRef, useImperativeHandle, useRef } from "react";
import type { EditorDraft } from "../editor/types";
import {
  applyFormatting,
  type FormattingAction
} from "../editor/markdown-format";

type DocumentEditorPaneProps = {
  canEdit: boolean;
  draft: EditorDraft | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  message?: string | null;
  onDraftChange: (draft: EditorDraft) => void;
};

export type DocumentEditorPaneHandle = {
  applyFormatting: (action: FormattingAction) => void;
};

export const DocumentEditorPane = forwardRef<
  DocumentEditorPaneHandle,
  DocumentEditorPaneProps
>(function DocumentEditorPane(
  {
    canEdit,
    draft,
    hasUnsavedChanges,
    isSaving,
    message,
    onDraftChange
  },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleApplyFormatting(action: FormattingAction) {
    if (!draft || !textareaRef.current || !canEdit) {
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

  useImperativeHandle(
    ref,
    () => ({
      applyFormatting: handleApplyFormatting
    }),
    [canEdit, draft]
  );

  return (
    <section className="source-editor-card">
      <div className="source-editor-header">
        <div>
          <p className="section-label">Markdown-Quelle</p>
          <h3>Source Editor</h3>
        </div>
        <div className="source-editor-status">
          {hasUnsavedChanges && <span>Ungespeichert</span>}
          {isSaving && <span>Speichere...</span>}
          {message && !hasUnsavedChanges && <span>{message}</span>}
        </div>
      </div>

      {draft ? (
        <>
          <div className="source-editor-fields">
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

          <textarea
            ref={textareaRef}
            className="source-editor-textarea"
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
              Die aktive Rolle darf die Quelle nur lesen.
            </p>
          )}
        </>
      ) : (
        <div className="empty-state">
          <h3>Kein Dokument ausgewaehlt</h3>
          <p>Lege ein neues Dokument an oder waehle links eines aus.</p>
        </div>
      )}
    </section>
  );
});
