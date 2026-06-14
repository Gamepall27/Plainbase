import { useEffect, useRef, useState } from "react";
import type { MarkdownBlockRendererExtension } from "@plainbase/addon-sdk";
import type {
  Document,
  Role,
  RoleName,
  Ticket,
  User,
  Workspace
} from "@plainbase/shared";
import type {
  LoadState,
  SaveState,
  WorkspaceTab,
  WorkspaceTabView
} from "../../app/types";
import { countWords } from "../../lib/document-draft";
import { formatTimestamp } from "../../lib/formatters";
import {
  formatTicketFilterLabel,
  getTicketStatusClassName
} from "../../lib/ticket-format";
import type { EditorDraft } from "../../editor/types";
import type { FormattingAction } from "../../editor/markdown-format";
import { MarkdownPreview } from "../MarkdownPreview";
import {
  DocumentEditorPane,
  type DocumentEditorPaneHandle
} from "../DocumentEditorPane";
import { EditorFormattingToolbar } from "../EditorFormattingToolbar";
import { AdminToolsPanel } from "../admin/AdminToolsPanel";
import { AnimatedCreateTabButton } from "../layout/AnimatedCreateTabButton";
import { TicketsWorkspaceContent } from "../tickets/TicketsWorkspaceView";
import {
  PreviewEditor,
  type PreviewEditorHandle
} from "./PreviewEditor";

type DocumentWorkspaceProps = {
  activeRole: RoleName | null;
  activeTabView: WorkspaceTabView;
  documentState: LoadState<Document> | null;
  documents: Document[];
  draft: EditorDraft | null;
  hasUnsavedChanges: boolean;
  markdownBlockRenderers: MarkdownBlockRendererExtension<string>[];
  mayEditDocument: boolean;
  mayManageUsers: boolean;
  invitationMutationStatus: SaveState;
  saveState: SaveState;
  roles: Role[];
  selectedDocument: Document | null;
  selectedWorkspace: Workspace | null;
  selectedWorkspaceName: string | null;
  selectedWorkspaceId: string | null;
  showSourceEditor: boolean;
  tabs: WorkspaceTab[];
  roleSwitchStatus: SaveState;
  tickets: Ticket[];
  userMutationStatus: SaveState;
  usersState: LoadState<User[]>;
  workspaceMutationStatus: SaveState;
  workspacesState: LoadState<Workspace[]>;
  onCloseAdminTab: () => void;
  onCreateTab: () => void;
  onDraftChange: (draft: EditorDraft) => void;
  onDocumentSelect: (documentId: string) => void;
  onInvitationCreate: (input: {
    name: string;
    username: string;
    email: string;
    roleId: string;
    avatarUrl: string | null;
  }) => Promise<string | null>;
  onSaveDocument: () => void;
  onShowSourceEditorChange: (show: boolean) => void;
  onTabClose: (tabId: string) => void;
  onTabSelect: (tabId: string) => void;
  onUserCreate: (input: {
    name: string;
    username: string;
    email: string;
    roleId: string;
    password: string;
    avatarUrl: string | null;
  }) => Promise<boolean>;
  onUserDelete: (userId: string) => Promise<boolean>;
  onUserUpdate: (
    userId: string,
    input: {
      name?: string;
      username?: string;
      email?: string;
      roleId?: string;
      password?: string;
      avatarUrl?: string | null;
    }
  ) => Promise<boolean>;
  onWorkspaceCreate: (input: {
    name: string;
    slug: string;
    rootPath: string;
  }) => Promise<boolean>;
};

export function DocumentWorkspace({
  activeRole,
  activeTabView,
  documentState,
  documents,
  draft,
  hasUnsavedChanges,
  markdownBlockRenderers,
  mayEditDocument,
  mayManageUsers,
  invitationMutationStatus,
  saveState,
  roles,
  selectedDocument,
  selectedWorkspace,
  selectedWorkspaceName,
  selectedWorkspaceId,
  showSourceEditor,
  tabs,
  roleSwitchStatus,
  tickets,
  userMutationStatus,
  usersState,
  workspaceMutationStatus,
  workspacesState,
  onCloseAdminTab,
  onCreateTab,
  onDraftChange,
  onDocumentSelect,
  onInvitationCreate,
  onSaveDocument,
  onShowSourceEditorChange,
  onTabClose,
  onTabSelect,
  onUserCreate,
  onUserDelete,
  onUserUpdate,
  onWorkspaceCreate
}: DocumentWorkspaceProps) {
  const previewEditorRef = useRef<PreviewEditorHandle | null>(null);
  const sourceEditorRef = useRef<DocumentEditorPaneHandle | null>(null);
  const previousTabIdsRef = useRef<string[]>(tabs.map((tab) => tab.id));
  const enteringTimeoutRef = useRef<number | null>(null);
  const closingTimeoutRef = useRef<number | null>(null);
  const wordCount = countWords(draft?.content ?? "");
  const isAdminTab = activeTabView === "admin";
  const isTicketsTab = activeTabView === "tickets";
  const isEmptyTab = activeTabView === "empty";
  const isKanbanBoard = selectedDocument?.kind === "kanban";
  const currentTabTitle =
    draft?.title.trim() || selectedDocument?.title || "Neuer Tab";
  const [enteringTabId, setEnteringTabId] = useState<string | null>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);

  useEffect(() => {
    const previousTabIds = previousTabIdsRef.current;
    const addedActiveTab = tabs.find(
      (tab) => tab.isActive && !previousTabIds.includes(tab.id)
    );

    if (addedActiveTab) {
      setEnteringTabId(addedActiveTab.id);

      if (enteringTimeoutRef.current !== null) {
        window.clearTimeout(enteringTimeoutRef.current);
      }

      enteringTimeoutRef.current = window.setTimeout(() => {
        setEnteringTabId(null);
      }, 240);
    }

    previousTabIdsRef.current = tabs.map((tab) => tab.id);

    return () => {
      if (enteringTimeoutRef.current !== null) {
        window.clearTimeout(enteringTimeoutRef.current);
      }

      if (closingTimeoutRef.current !== null) {
        window.clearTimeout(closingTimeoutRef.current);
      }
    };
  }, [tabs]);

  function applyFormatting(action: FormattingAction) {
    previewEditorRef.current?.applyFormatting(action);
  }

  function handleTabClose(tabId: string) {
    if (closingTabId !== null) {
      return;
    }

    setClosingTabId(tabId);

    if (closingTimeoutRef.current !== null) {
      window.clearTimeout(closingTimeoutRef.current);
    }

    closingTimeoutRef.current = window.setTimeout(() => {
      onTabClose(tabId);
      setClosingTabId(null);
    }, 240);
  }

  return (
    <section className="main-stage">
      <div className="document-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={getDocumentTabClassName(tab, enteringTabId, closingTabId)}
          >
            <button
              type="button"
              className="document-tab-trigger"
              disabled={closingTabId === tab.id}
              onClick={() => onTabSelect(tab.id)}
            >
              {tab.isDirty && <span className="document-tab-dirty" aria-hidden="true" />}
              <span className="document-tab-title">{tab.title}</span>
            </button>
            <button
              type="button"
              className="document-tab-close"
              aria-label={`${tab.title} schliessen`}
              disabled={closingTabId === tab.id}
              onClick={() => handleTabClose(tab.id)}
            >
              x
            </button>
          </div>
        ))}
        <AnimatedCreateTabButton onCreateTab={onCreateTab} />
      </div>

      {isAdminTab ? (
        <AdminToolsPanel
          roles={roles}
          selectedWorkspace={selectedWorkspace}
          selectedWorkspaceName={selectedWorkspaceName}
          invitationMutationStatus={invitationMutationStatus}
          userMutationStatus={userMutationStatus}
          usersState={usersState}
          workspaceMutationStatus={workspaceMutationStatus}
          workspacesState={workspacesState}
          onClose={onCloseAdminTab}
          onInvitationCreate={onInvitationCreate}
          onUserCreate={onUserCreate}
          onUserUpdate={onUserUpdate}
          onUserDelete={onUserDelete}
          onWorkspaceCreate={onWorkspaceCreate}
        />
      ) : isEmptyTab ? (
        <div className="document-shell document-shell-empty" />
      ) : isTicketsTab ? (
        <TicketsWorkspaceContent
          documents={documents}
          selectedWorkspace={selectedWorkspace}
          tickets={tickets}
          onDocumentSelect={onDocumentSelect}
        />
      ) : (
        <div className="document-shell">
        <DocumentToolbar
          isKanbanBoard={isKanbanBoard}
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
              <span className="role-pill">{activeRole ?? "Demo"}</span>
              {hasUnsavedChanges && (
                <span className="unsaved-pill">Ungespeichert</span>
              )}
            </div>
          </div>

          {selectedDocument?.slug === "welcome" && (
            <div className="document-callout">
              Plainbase ist deine zentrale Wissensbasis fuer das Team.
            </div>
          )}

          {isKanbanBoard ? (
            <KanbanBoardPreview
              content={draft?.content ?? ""}
              currentDocument={selectedDocument}
              markdownBlockRenderers={markdownBlockRenderers}
              tickets={tickets}
              workspaceId={selectedWorkspaceId}
            />
          ) : (
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
          )}

          {!isEmptyTab && (
            <div className="document-tip">
              <strong>Tipp:</strong>{" "}
              {isKanbanBoard
                ? "Das Board zeigt die aktuellen Workspace-Tickets gruppiert nach Status."
                : "Nutze die Add-ons in der rechten Seitenleiste, um Tickets, Diagramme und mehr zu verwalten."}
            </div>
          )}
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
      )}
    </section>
  );
}

function getDocumentTabClassName(
  tab: WorkspaceTab,
  enteringTabId: string | null,
  closingTabId: string | null
) {
  const classNames = ["document-tab"];

  if (tab.isActive) {
    classNames.push("active");
  }

  if (tab.documentId === null) {
    classNames.push("is-empty");
  }

  if (tab.id === enteringTabId) {
    classNames.push("is-entering");
  }

  if (tab.id === closingTabId) {
    classNames.push("is-closing");
  }

  return classNames.join(" ");
}

type DocumentToolbarProps = {
  canSave: boolean;
  isKanbanBoard: boolean;
  mayEditDocument: boolean;
  saveState: SaveState;
  showSourceEditor: boolean;
  onApplyFormatting: (action: FormattingAction) => void;
  onSaveDocument: () => void;
  onToggleSource: () => void;
};

function DocumentToolbar({
  canSave,
  isKanbanBoard,
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

      {isKanbanBoard ? (
        <div className="toolbar-mode-label">Kanban Board</div>
      ) : (
        <EditorFormattingToolbar
          disabled={!mayEditDocument}
          onApply={onApplyFormatting}
        />
      )}

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

type KanbanBoardPreviewProps = {
  content: string;
  currentDocument: Document | null;
  markdownBlockRenderers: MarkdownBlockRendererExtension<string>[];
  tickets: Ticket[];
  workspaceId: string | null;
};

function KanbanBoardPreview({
  content,
  currentDocument,
  markdownBlockRenderers,
  tickets,
  workspaceId
}: KanbanBoardPreviewProps) {
  const ticketsByStatus = {
    Open: tickets.filter((ticket) => ticket.status === "Open"),
    "In Progress": tickets.filter((ticket) => ticket.status === "In Progress"),
    Done: tickets.filter((ticket) => ticket.status === "Done")
  } satisfies Record<Ticket["status"], Ticket[]>;

  return (
    <div className="kanban-board-layout">
      <div className="kanban-board-grid">
        {(Object.entries(ticketsByStatus) as Array<[Ticket["status"], Ticket[]]>).map(
          ([status, statusTickets]) => (
            <section key={status} className="kanban-column">
              <div className="kanban-column-head">
                <strong>{formatTicketFilterLabel(status)}</strong>
                <span>{statusTickets.length}</span>
              </div>

              <div className="kanban-column-list">
                {statusTickets.length === 0 && (
                  <div className="empty-ticket-state">
                    Keine Tickets in dieser Spalte.
                  </div>
                )}

                {statusTickets.map((ticket) => (
                  <article key={ticket.id} className="kanban-ticket-card">
                    <div className="ticket-card-head">
                      <h3>{ticket.title}</h3>
                      <span className={getTicketStatusClassName(ticket.status)}>
                        {formatTicketFilterLabel(ticket.status)}
                      </span>
                    </div>
                    <p className="ticket-code">{ticket.description}</p>
                    <div className="ticket-card-footer">
                      <span>{formatTimestamp(ticket.updatedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        )}
      </div>

      {content.trim().length > 0 && (
        <section className="kanban-notes-card">
          <p className="section-label">Board-Notizen</p>
          <MarkdownPreview
            content={content}
            currentDocument={currentDocument}
            markdownBlockRenderers={markdownBlockRenderers}
            workspaceId={workspaceId}
          />
        </section>
      )}
    </div>
  );
}
