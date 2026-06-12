import { useRef } from "react";
import type { MarkdownBlockRendererExtension } from "@plainbase/addon-sdk";
import type { Document, RoleName, User, Workspace } from "@plainbase/shared";
import type { LoadState, SaveState } from "../../app/types";
import { countWords } from "../../lib/document-draft";
import { formatTimestamp } from "../../lib/formatters";
import type { EditorDraft } from "../../editor/types";
import type { FormattingAction } from "../../editor/markdown-format";
import {
  DocumentEditorPane,
  type DocumentEditorPaneHandle
} from "../DocumentEditorPane";
import { EditorFormattingToolbar } from "../EditorFormattingToolbar";
import {
  PreviewEditor,
  type PreviewEditorHandle
} from "./PreviewEditor";

type DocumentWorkspaceProps = {
  activeRole: RoleName | null;
  currentTabTitle: string;
  documentState: LoadState<Document> | null;
  draft: EditorDraft | null;
  hasUnsavedChanges: boolean;
  markdownBlockRenderers: MarkdownBlockRendererExtension<string>[];
  mayCreateDocument: boolean;
  mayEditDocument: boolean;
  mayManageUsers: boolean;
  saveState: SaveState;
  selectedDocument: Document | null;
  selectedWorkspace: Workspace | null;
  selectedWorkspaceId: string | null;
  showSourceEditor: boolean;
  roleSwitchStatus: SaveState;
  usersState: LoadState<User[]>;
  onDraftChange: (draft: EditorDraft) => void;
  onNewDocument: () => void;
  onOpenAdminTools: () => void;
  onSaveDocument: () => void;
  onShowSourceEditorChange: (show: boolean) => void;
};

export function DocumentWorkspace({
  activeRole,
  currentTabTitle,
  documentState,
  draft,
  hasUnsavedChanges,
  markdownBlockRenderers,
  mayCreateDocument,
  mayEditDocument,
  mayManageUsers,
  saveState,
  selectedDocument,
  selectedWorkspace,
  selectedWorkspaceId,
  showSourceEditor,
  roleSwitchStatus,
  usersState,
  onDraftChange,
  onNewDocument,
  onOpenAdminTools,
  onSaveDocument,
  onShowSourceEditorChange
}: DocumentWorkspaceProps) {
  const previewEditorRef = useRef<PreviewEditorHandle | null>(null);
  const sourceEditorRef = useRef<DocumentEditorPaneHandle | null>(null);
  const wordCount = countWords(draft?.content ?? "");

  function applyFormatting(action: FormattingAction) {
    previewEditorRef.current?.applyFormatting(action);
  }

  return (
    <section className="main-stage">
      <div className="document-tabs">
        <button type="button" className="document-tab active">
          <span>{currentTabTitle}</span>
          <span className="document-tab-close">x</span>
        </button>
        <button
          type="button"
          className="document-tab-add"
          onClick={onNewDocument}
        >
          +
        </button>
      </div>

      <div className="document-shell">
        <DocumentToolbar
          mayEditDocument={mayEditDocument}
          saveState={saveState}
          showSourceEditor={showSourceEditor}
          canSave={
            Boolean(draft) &&
            mayEditDocument &&
            hasUnsavedChanges &&
            saveState.status !== "saving"
          }
          onApplyFormatting={applyFormatting}
          onSaveDocument={onSaveDocument}
          onToggleSource={() => onShowSourceEditorChange(!showSourceEditor)}
        />

        <WorkspaceNotices
          roleSwitchStatus={roleSwitchStatus}
          saveState={saveState}
        />

        {documentState?.status === "loading" && (
          <div className="document-loading">Lade Dokument...</div>
        )}
        {documentState?.status === "error" && (
          <p className="feedback error">{documentState.message}</p>
        )}

        <section className="document-canvas">
          <div className="document-preview-header">
            <div>
              <p className="canvas-eyebrow">
                {selectedWorkspace?.name ?? "Workspace"}
              </p>
              {draft && mayEditDocument ? (
                <input
                  className="canvas-title-input"
                  value={draft.title}
                  placeholder="Untitled document"
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      title: event.target.value
                    })
                  }
                />
              ) : (
                <h1 className="canvas-title">{currentTabTitle}</h1>
              )}
            </div>
            <div className="canvas-status-stack">
              {mayManageUsers && (
                <button
                  type="button"
                  className="workspace-admin-button"
                  onClick={onOpenAdminTools}
                >
                  Admin-Tools
                  {usersState.status === "success" && (
                    <span className="workspace-admin-count">
                      {usersState.data.length}
                    </span>
                  )}
                </button>
              )}
              <span className="role-pill">{activeRole ?? "Demo"}</span>
              {hasUnsavedChanges && (
                <span className="unsaved-pill">Ungespeichert</span>
              )}
            </div>
          </div>

          {mayManageUsers && (
            <div className="workspace-admin-hint">
              <strong>Admin:</strong> Oeffne die Admin-Tools, um Nutzer anzulegen,
              zu bearbeiten oder zu entfernen.
            </div>
          )}

          {selectedDocument?.slug === "welcome" && (
            <div className="document-callout">
              Plainbase ist deine zentrale Wissensbasis fuer das Team.
            </div>
          )}

          <PreviewEditor
            ref={previewEditorRef}
            canEdit={mayEditDocument}
            content={draft?.content ?? ""}
            currentDocument={selectedDocument}
            markdownBlockRenderers={markdownBlockRenderers}
            workspaceId={selectedWorkspaceId}
            onContentChange={(content) => {
              if (!draft) {
                return;
              }

              onDraftChange({
                ...draft,
                content
              });
            }}
          />

          <div className="document-tip">
            <strong>Tipp:</strong> Nutze die Add-ons in der rechten Seitenleiste,
            um Tickets, Diagramme und mehr zu verwalten.
          </div>
        </section>

        <div className="document-meta-bar">
          <div className="document-meta-left">
            <button
              type="button"
              className="meta-toggle"
              onClick={() => onShowSourceEditorChange(!showSourceEditor)}
            >
              {showSourceEditor ? "Source ausblenden" : "Markdown anzeigen"}
            </button>
            <span>
              Zuletzt geaendert: {formatTimestamp(selectedDocument?.updatedAt)}
            </span>
          </div>
          <div className="document-meta-right">
            <span>{activeRole ? `von ${activeRole}` : "Nicht angemeldet"}</span>
            <span>Woerter: {wordCount}</span>
          </div>
        </div>

        {showSourceEditor && (
          <div className="source-editor-shell">
            <DocumentEditorPane
              ref={sourceEditorRef}
              canEdit={mayEditDocument}
              draft={draft}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={saveState.status === "saving"}
              message={saveState.status === "success" ? saveState.message : null}
              onDraftChange={onDraftChange}
            />
          </div>
        )}
      </div>
    </section>
  );
}

type DocumentToolbarProps = {
  canSave: boolean;
  mayEditDocument: boolean;
  saveState: SaveState;
  showSourceEditor: boolean;
  onApplyFormatting: (action: FormattingAction) => void;
  onSaveDocument: () => void;
  onToggleSource: () => void;
};

function DocumentToolbar({
  canSave,
  mayEditDocument,
  saveState,
  showSourceEditor,
  onApplyFormatting,
  onSaveDocument,
  onToggleSource
}: DocumentToolbarProps) {
  return (
    <div className="document-toolbar">
      <div className="toolbar-left">
        <button type="button" className="toolbar-round-button" disabled>
          Undo
        </button>
        <button type="button" className="toolbar-round-button" disabled>
          Redo
        </button>
      </div>

      <EditorFormattingToolbar
        disabled={!mayEditDocument}
        onApply={onApplyFormatting}
      />

      <div className="toolbar-right">
        <button
          type="button"
          className="toolbar-secondary-button"
          onClick={onToggleSource}
        >
          {showSourceEditor ? "Preview" : "Markdown"}
        </button>
        <button
          type="button"
          className="toolbar-primary-button"
          onClick={onSaveDocument}
          disabled={!canSave}
        >
          {saveState.status === "saving" ? "Speichert..." : "Speichern"}
        </button>
      </div>
    </div>
  );
}

type WorkspaceNoticesProps = {
  roleSwitchStatus: SaveState;
  saveState: SaveState;
};

function WorkspaceNotices({ roleSwitchStatus, saveState }: WorkspaceNoticesProps) {
  if (roleSwitchStatus.status === "idle" && saveState.status === "idle") {
    return null;
  }

  return (
    <div className="workspace-notices">
      {roleSwitchStatus.status === "error" && (
        <p className="feedback error">{roleSwitchStatus.message}</p>
      )}
      {roleSwitchStatus.status === "success" && (
        <p className="feedback success">{roleSwitchStatus.message}</p>
      )}
      {saveState.status === "error" && (
        <p className="feedback error">{saveState.message}</p>
      )}
      {saveState.status === "success" && (
        <p className="feedback success">{saveState.message}</p>
      )}
    </div>
  );
}
