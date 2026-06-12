import { useEffect, useRef, useState } from "react";
import type {
  Addon,
  DemoUser,
  Document,
  Role,
  Ticket,
  Workspace
} from "@plainbase/shared";
import {
  canCreateDocument,
  canCreateTicket,
  canEditDocument,
  canManageAddons
} from "@plainbase/shared";
import { AddonRegistry } from "./addons/addon-registry";
import { apiClient, ApiClientError } from "./api/client";
import { DocumentEditorPane } from "./components/DocumentEditorPane";
import type { DocumentEditorPaneHandle } from "./components/DocumentEditorPane";
import { EditorFormattingToolbar } from "./components/EditorFormattingToolbar";
import { MarkdownPreview } from "./components/MarkdownPreview";
import type { EditorDraft } from "./editor/types";

type LoadState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type SidebarFolder = {
  id: string;
  title: string;
  items: SidebarItem[];
};

type SidebarItem = {
  id: string;
  title: string;
  slug?: string;
  documentId?: string;
  disabled?: boolean;
  children?: SidebarItem[];
};

type RightPanelTab = "tickets" | "links" | "notes";
type TicketFilter = Ticket["status"];

const rightPanelTabs: Array<{
  id: RightPanelTab;
  label: string;
}> = [
  { id: "tickets", label: "Tickets" },
  { id: "links", label: "Verknuepfungen" },
  { id: "notes", label: "Notizen" }
];

const quickLinks = [
  "Alle Dokumente",
  "Favoriten",
  "Kuerzlich geoeffnet"
];

const staticFolders: SidebarFolder[] = [
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

export function App() {
  const sourceEditorRef = useRef<DocumentEditorPaneHandle | null>(null);
  const [workspacesState, setWorkspacesState] = useState<LoadState<Workspace[]>>({
    status: "loading"
  });
  const [documentsState, setDocumentsState] = useState<LoadState<Document[]>>({
    status: "loading"
  });
  const [documentState, setDocumentState] = useState<LoadState<Document> | null>(
    null
  );
  const [addonsState, setAddonsState] = useState<LoadState<Addon[]>>({
    status: "loading"
  });
  const [rolesState, setRolesState] = useState<LoadState<Role[]>>({
    status: "loading"
  });
  const [addonRegistryState, setAddonRegistryState] = useState<
    LoadState<AddonRegistry>
  >({
    status: "loading"
  });
  const [demoUserState, setDemoUserState] = useState<LoadState<DemoUser>>({
    status: "loading"
  });
  const [ticketsState, setTicketsState] = useState<LoadState<Ticket[]>>({
    status: "loading"
  });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [roleSwitchStatus, setRoleSwitchStatus] = useState<SaveState>({
    status: "idle"
  });
  const [pendingAddonId, setPendingAddonId] = useState<string | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<RightPanelTab>("tickets");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("Open");
  const [showSourceEditor, setShowSourceEditor] = useState(false);

  useEffect(() => {
    void loadShellData();
  }, []);

  useEffect(() => {
    if (addonsState.status !== "success") {
      return;
    }

    try {
      setAddonRegistryState({
        status: "success",
        data: AddonRegistry.fromAddons(addonsState.data)
      });
    } catch (error) {
      setAddonRegistryState({
        status: "error",
        message: getErrorMessage(error)
      });
    }
  }, [addonsState]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setDocumentsState({ status: "error", message: "Kein Workspace gewaehlt." });
      setTicketsState({ status: "error", message: "Kein Workspace gewaehlt." });
      return;
    }

    void loadWorkspaceData(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setDocumentState(null);
      return;
    }

    void loadDocument(selectedDocumentId);
  }, [selectedDocumentId]);

  async function loadShellData() {
    const [workspacesResult, addonsResult, rolesResult, demoUserResult] =
      await Promise.allSettled([
        apiClient.getWorkspaces(),
        apiClient.getAddons(),
        apiClient.getRoles(),
        apiClient.getDemoUser()
      ]);

    if (workspacesResult.status === "fulfilled") {
      setWorkspacesState({ status: "success", data: workspacesResult.value });

      const firstWorkspaceId = workspacesResult.value[0]?.id ?? null;
      setSelectedWorkspaceId((current) => current ?? firstWorkspaceId);
    } else {
      setWorkspacesState({
        status: "error",
        message: getErrorMessage(workspacesResult.reason)
      });
    }

    if (addonsResult.status === "fulfilled") {
      setAddonsState({ status: "success", data: addonsResult.value });
    } else {
      setAddonsState({
        status: "error",
        message: getErrorMessage(addonsResult.reason)
      });
    }

    if (rolesResult.status === "fulfilled") {
      setRolesState({ status: "success", data: rolesResult.value });
    } else {
      setRolesState({
        status: "error",
        message: getErrorMessage(rolesResult.reason)
      });
    }

    if (demoUserResult.status === "fulfilled") {
      setDemoUserState({ status: "success", data: demoUserResult.value });
    } else {
      setDemoUserState({
        status: "error",
        message: getErrorMessage(demoUserResult.reason)
      });
    }
  }

  async function loadWorkspaceData(workspaceId: string) {
    setDocumentsState({ status: "loading" });
    setTicketsState({ status: "loading" });

    const [documentsResult, ticketsResult] = await Promise.allSettled([
      apiClient.getDocuments(workspaceId),
      apiClient.getTickets(workspaceId)
    ]);

    if (documentsResult.status === "fulfilled") {
      const documents = documentsResult.value;
      setDocumentsState({ status: "success", data: documents });

      setSelectedDocumentId((currentDocumentId) => {
        if (
          currentDocumentId &&
          documents.some((item) => item.id === currentDocumentId)
        ) {
          return currentDocumentId;
        }

        const nextDocumentId = documents[0]?.id ?? null;

        if (!nextDocumentId) {
          setDraft(createEmptyDraft(workspaceId));
          setHasUnsavedChanges(false);
        }

        return nextDocumentId;
      });
    } else {
      setDocumentsState({
        status: "error",
        message: getErrorMessage(documentsResult.reason)
      });
    }

    if (ticketsResult.status === "fulfilled") {
      setTicketsState({ status: "success", data: ticketsResult.value });
    } else {
      setTicketsState({
        status: "error",
        message: getErrorMessage(ticketsResult.reason)
      });
    }
  }

  async function loadDocument(documentId: string) {
    setDocumentState({ status: "loading" });

    try {
      const document = await apiClient.getDocument(documentId);
      setDocumentState({ status: "success", data: document });
      setDraft(mapDocumentToDraft(document));
      setHasUnsavedChanges(false);
      setSaveState({ status: "idle" });
    } catch (error) {
      setDocumentState({
        status: "error",
        message: getErrorMessage(error)
      });
    }
  }

  async function handleRoleChange(roleName: Role["name"]) {
    setRoleSwitchStatus({ status: "saving" });

    try {
      const demoUser = await apiClient.switchDemoRole(roleName);
      setDemoUserState({ status: "success", data: demoUser });
      setRoleSwitchStatus({
        status: "success",
        message: `Aktive Rolle ist jetzt ${demoUser.role.name}.`
      });
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
    }
  }

  function handleNewDocument() {
    if (!selectedWorkspaceId) {
      return;
    }

    setSelectedDocumentId(null);
    setDocumentState(null);
    setDraft(createEmptyDraft(selectedWorkspaceId));
    setHasUnsavedChanges(false);
    setSaveState({ status: "idle" });
    setShowSourceEditor(true);
  }

  async function handleSaveDocument() {
    if (!draft || !selectedWorkspaceId) {
      return;
    }

    setSaveState({ status: "saving" });

    try {
      const title = draft.title.trim() || "Untitled document";
      const slug = draft.slug.trim() || slugify(title);

      const savedDocument = draft.isNew
        ? await apiClient.createDocument({
            workspaceId: selectedWorkspaceId,
            parentId: draft.parentId,
            title,
            slug,
            content: draft.content
          })
        : await apiClient.updateDocument(draft.id!, {
            parentId: draft.parentId,
            title,
            slug,
            content: draft.content
          });

      setDraft(mapDocumentToDraft(savedDocument));
      setSelectedDocumentId(savedDocument.id);
      setHasUnsavedChanges(false);
      setSaveState({
        status: "success",
        message: `"${savedDocument.title}" wurde gespeichert.`
      });

      await loadWorkspaceData(selectedWorkspaceId);
    } catch (error) {
      setSaveState({
        status: "error",
        message: getErrorMessage(error)
      });
    }
  }

  function handleDraftChange(nextDraft: EditorDraft) {
    setDraft((current) => {
      if (!current) {
        return nextDraft;
      }

      const shouldUpdateSlug =
        current.slug === "" || current.slug === slugify(current.title);

      return {
        ...nextDraft,
        slug:
          nextDraft.slug === current.slug && shouldUpdateSlug
            ? slugify(nextDraft.title)
            : slugify(nextDraft.slug)
      };
    });
    setHasUnsavedChanges(true);
    setSaveState({ status: "idle" });
  }

  async function handleAddonToggle(addonId: string) {
    setPendingAddonId(addonId);

    try {
      const updatedAddon = await apiClient.toggleAddon(addonId);

      setAddonsState((current) => {
        if (current.status !== "success") {
          return current;
        }

        return {
          status: "success",
          data: current.data.map((addon) =>
            addon.id === updatedAddon.id ? updatedAddon : addon
          )
        };
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message: getErrorMessage(error)
      });
    } finally {
      setPendingAddonId(null);
    }
  }

  const activeRole =
    demoUserState.status === "success" ? demoUserState.data.role.name : null;
  const mayCreateDocument = canCreateDocument(activeRole);
  const mayEditDocument = canEditDocument(activeRole);
  const mayManageAddons = canManageAddons(activeRole);
  const mayCreateTicket = canCreateTicket(activeRole);
  const workspaces =
    workspacesState.status === "success" ? workspacesState.data : [];
  const documents =
    documentsState.status === "success" ? documentsState.data : [];
  const addons = addonsState.status === "success" ? addonsState.data : [];
  const tickets = ticketsState.status === "success" ? ticketsState.data : [];
  const addonRegistry =
    addonRegistryState.status === "success" ? addonRegistryState.data : null;
  const activeAddonIds = addonRegistry?.getActiveAddonIds() ?? [];
  const leftSidebarPanels = addonRegistry?.getSidebarPanels("left") ?? [];
  const rightSidebarPanels = addonRegistry?.getSidebarPanels("right") ?? [];
  const markdownBlockRenderers =
    addonRegistry?.getMarkdownBlockRenderers() ?? [];
  const addonWarnings = addonRegistry?.getWarnings() ?? [];
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedDocument =
    documentState?.status === "success" ? documentState.data : null;
  const addonPanelContext = {
    activeAddonIds,
    currentDocument: selectedDocument,
    demoRoleName: activeRole,
    tickets,
    workspaceId: selectedWorkspaceId
  };
  const activeTickets = tickets.filter((ticket) => ticket.status === ticketFilter);
  const selectedTicketCount = activeTickets.length;
  const documentFolders = buildSidebarFolders(documents);
  const linkedDocuments = documents
    .filter((document) => document.id !== selectedDocumentId)
    .slice(0, 3);
  const currentTabTitle = draft?.title.trim() || selectedDocument?.title || "Welcome";
  const wordCount = countWords(draft?.content ?? "");

  return (
    <div className="workspace-frame">
      <header className="app-topbar">
        <div className="brand-lockup">
          <div className="brand-badge">PB</div>
          <span className="brand-name">Plainbase</span>
        </div>

        <div className="topbar-workspace-pill">
          <span className="topbar-workspace-icon">[]</span>
          <span>{selectedWorkspace?.name ?? "Workspace"}</span>
        </div>

        <div className="topbar-spacer" />

        <div className="topbar-role">
          <span>Rolle:</span>
          <select
            className="toolbar-select"
            value={activeRole ?? ""}
            disabled={
              rolesState.status !== "success" || roleSwitchStatus.status === "saving"
            }
            onChange={(event) =>
              void handleRoleChange(event.target.value as Role["name"])
            }
          >
            {rolesState.status === "success" &&
              rolesState.data.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
          </select>
        </div>

        <div className="topbar-avatar">
          {demoUserState.status === "success"
            ? getInitials(demoUserState.data.user.name)
            : "PB"}
        </div>

        <div className="topbar-icon-row">
          <button className="topbar-icon-button" type="button">
            Theme
          </button>
          <button className="topbar-icon-button" type="button">
            Alerts
          </button>
          <button className="topbar-icon-button" type="button">
            Share
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="left-sidebar">
          <section className="left-panel-card">
            <p className="rail-heading">Workspace</p>
            {workspacesState.status === "loading" && <p>Lade Workspaces...</p>}
            {workspacesState.status === "error" && (
              <p className="feedback error">{workspacesState.message}</p>
            )}
            {workspacesState.status === "success" && (
              <select
                className="sidebar-select"
                value={selectedWorkspaceId ?? ""}
                onChange={(event) => setSelectedWorkspaceId(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
          </section>

          <section className="left-panel-card">
            <div className="left-nav-links">
              {quickLinks.map((link) => (
                <button key={link} type="button" className="left-nav-link">
                  <span className="left-nav-link-icon">+</span>
                  <span>{link}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="left-panel-card">
            <div className="section-heading-row">
              <p className="rail-heading">Dokumente</p>
              <button
                type="button"
                className="tree-action-button"
                onClick={handleNewDocument}
                disabled={!mayCreateDocument}
              >
                +
              </button>
            </div>

            {documentsState.status === "loading" && <p>Lade Dokumente...</p>}
            {documentsState.status === "error" && (
              <p className="feedback error">{documentsState.message}</p>
            )}
            {documentsState.status === "success" && (
              <div className="sidebar-tree">
                {documentFolders.map((folder) => (
                  <div key={folder.id} className="tree-folder">
                    <div className="tree-folder-label">
                      <span className="tree-chevron">v</span>
                      <span>{folder.title}</span>
                    </div>
                    <div className="tree-folder-content">
                      {folder.items.map((item) => (
                        <SidebarTreeItem
                          key={item.id}
                          item={item}
                          selectedDocumentId={selectedDocumentId}
                          onSelect={setSelectedDocumentId}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {staticFolders.map((folder) => (
                  <div key={folder.id} className="tree-folder">
                    <div className="tree-folder-label">
                      <span className="tree-chevron">v</span>
                      <span>{folder.title}</span>
                    </div>
                    <div className="tree-folder-content">
                      {folder.items.map((item) => (
                        <SidebarTreeItem
                          key={item.id}
                          item={item}
                          selectedDocumentId={selectedDocumentId}
                          onSelect={setSelectedDocumentId}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="left-panel-card">
            <p className="rail-heading">Add-ons</p>
            {addons.map((addon) => (
              <label key={addon.id} className="addon-check-row">
                <span className="addon-check">
                  <input
                    type="checkbox"
                    checked={addon.enabled}
                    disabled={!mayManageAddons || pendingAddonId === addon.id}
                    onChange={() => void handleAddonToggle(addon.id)}
                  />
                </span>
                <span className="addon-check-label">{addon.name}</span>
                {addon.name === "Tickets" && (
                  <span className="addon-counter-badge">
                    {tickets.filter((ticket) => ticket.status === "Open").length}
                  </span>
                )}
              </label>
            ))}

            {leftSidebarPanels.map((panel) => (
              <section key={panel.id} className="embedded-addon-panel">
                <h4>{panel.title}</h4>
                {panel.render(addonPanelContext)}
              </section>
            ))}
          </section>

          <button type="button" className="settings-button" disabled>
            Einstellungen
          </button>
        </aside>

        <section className="main-stage">
          <div className="document-tabs">
            <button type="button" className="document-tab active">
              <span>{currentTabTitle}</span>
              <span className="document-tab-close">x</span>
            </button>
            <button
              type="button"
              className="document-tab-add"
              onClick={handleNewDocument}
              disabled={!mayCreateDocument}
            >
              +
            </button>
          </div>

          <div className="document-shell">
            <div className="document-toolbar">
              <div className="toolbar-left">
                <button
                  type="button"
                  className="toolbar-round-button"
                  disabled
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="toolbar-round-button"
                  disabled
                >
                  Redo
                </button>
              </div>

              <EditorFormattingToolbar
                disabled={!mayEditDocument}
                onApply={(action) => {
                  setShowSourceEditor(true);
                  requestAnimationFrame(() => {
                    sourceEditorRef.current?.applyFormatting(action);
                  });
                }}
              />

              <div className="toolbar-right">
                <button
                  type="button"
                  className="toolbar-secondary-button"
                  onClick={() => setShowSourceEditor((current) => !current)}
                >
                  {showSourceEditor ? "Preview" : "Markdown"}
                </button>
                <button
                  type="button"
                  className="toolbar-primary-button"
                  onClick={() => void handleSaveDocument()}
                  disabled={
                    !draft ||
                    !mayEditDocument ||
                    !hasUnsavedChanges ||
                    saveState.status === "saving"
                  }
                >
                  {saveState.status === "saving" ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </div>

            {(roleSwitchStatus.status !== "idle" || saveState.status !== "idle") && (
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
            )}

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
                  <h1 className="canvas-title">{currentTabTitle}</h1>
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

              <MarkdownPreview
                content={draft?.content ?? ""}
                currentDocument={selectedDocument}
                markdownBlockRenderers={markdownBlockRenderers}
                workspaceId={selectedWorkspaceId}
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
                  onClick={() => setShowSourceEditor((current) => !current)}
                >
                  {showSourceEditor ? "Source ausblenden" : "Markdown anzeigen"}
                </button>
                <span>Zuletzt geaendert: {formatTimestamp(selectedDocument?.updatedAt)}</span>
              </div>
              <div className="document-meta-right">
                <span>{activeRole ? `von ${activeRole}` : "Demo-User"}</span>
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
                  message={
                    saveState.status === "success" ? saveState.message : null
                  }
                  onDraftChange={handleDraftChange}
                />
              </div>
            )}
          </div>
        </section>

        <aside className="right-sidebar">
          <div className="context-tabs">
            {rightPanelTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  tab.id === activePanelTab ? "context-tab active" : "context-tab"
                }
                onClick={() => setActivePanelTab(tab.id)}
              >
                <span>{tab.label}</span>
                {tab.id === "tickets" && (
                  <span className="tab-count">
                    {tickets.filter((ticket) => ticket.status === "Open").length}
                  </span>
                )}
              </button>
            ))}
            <button type="button" className="context-close-button">
              x
            </button>
          </div>

          {activePanelTab === "tickets" && (
            <div className="right-panel-section">
              <div className="ticket-filter-row">
                {(["Open", "In Progress", "Done"] as TicketFilter[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={
                      status === ticketFilter
                        ? "ticket-filter-chip active"
                        : "ticket-filter-chip"
                    }
                    onClick={() => setTicketFilter(status)}
                  >
                    {formatTicketFilterLabel(status)} {countTicketsByStatus(tickets, status)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="new-ticket-button"
                disabled={!mayCreateTicket}
              >
                + Neues Ticket
              </button>

              <div className="ticket-card-list">
                {activeTickets.length === 0 && (
                  <div className="empty-ticket-state">
                    Keine Tickets fuer diesen Status vorhanden.
                  </div>
                )}
                {activeTickets.map((ticket, index) => (
                  <article key={ticket.id} className="ticket-card">
                    <div className="ticket-card-head">
                      <h3>{ticket.title}</h3>
                      <span className={getTicketStatusClassName(ticket.status)}>
                        {formatTicketFilterLabel(ticket.status)}
                      </span>
                    </div>
                    <p className="ticket-code">#T-{1001 + index}</p>
                    <dl className="ticket-meta-list">
                      <div>
                        <dt>Dokument:</dt>
                        <dd>{getTicketDocumentTitle(ticket, documents)}</dd>
                      </div>
                      <div>
                        <dt>Beschreibung:</dt>
                        <dd>{ticket.description}</dd>
                      </div>
                    </dl>
                    <div className="ticket-card-footer">
                      <span>{formatTimestamp(ticket.updatedAt)}</span>
                      <span className={getPriorityClassName(index)}>
                        {getPriorityLabel(index)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <button type="button" className="inline-link-button">
                Alle Tickets anzeigen
              </button>
            </div>
          )}

          {activePanelTab === "links" && (
            <div className="right-panel-section">
              <div className="link-card">
                <h3>Verknuepfungen</h3>
                <div className="link-list">
                  {linkedDocuments.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      className="linked-document-row"
                      onClick={() => setSelectedDocumentId(document.id)}
                    >
                      <span>{document.title}</span>
                      <span>oeffnen</span>
                    </button>
                  ))}
                  {linkedDocuments.length === 0 && (
                    <p className="sidebar-copy">Noch keine Verknuepfungen verfuegbar.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activePanelTab === "notes" && (
            <div className="right-panel-section">
              {addonRegistryState.status === "error" && (
                <p className="feedback error">{addonRegistryState.message}</p>
              )}
              {addonWarnings.map((warning) => (
                <p key={warning} className="feedback error">
                  {warning}
                </p>
              ))}

              {rightSidebarPanels.map((panel) => (
                <section key={panel.id} className="addon-panel-card">
                  <h3>{panel.title}</h3>
                  {panel.render(addonPanelContext)}
                </section>
              ))}

              {rightSidebarPanels.length === 0 && (
                <div className="empty-ticket-state">
                  Keine Add-on-Panels aktiv.
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <section className="feature-strip">
        <article className="feature-card">
          <div className="feature-icon">[]</div>
          <div>
            <h3>Navigation</h3>
            <p>Workspaces, Dokumente, Favoriten, Add-ons und Einstellungen.</p>
          </div>
        </article>
        <article className="feature-card">
          <div className="feature-icon">/</div>
          <div>
            <h3>Bearbeitung im Preview-Modus</h3>
            <p>Direkt im fertigen Layout arbeiten und die Markdown-Quelle nur bei Bedarf einblenden.</p>
          </div>
        </article>
        <article className="feature-card">
          <div className="feature-icon">+</div>
          <div>
            <h3>Add-on Panels</h3>
            <p>Erweiterungen wie Tickets, Diagramme und eigene Tools direkt integriert.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

type SidebarTreeItemProps = {
  item: SidebarItem;
  selectedDocumentId: string | null;
  onSelect: (documentId: string) => void;
};

function SidebarTreeItem({
  item,
  selectedDocumentId,
  onSelect
}: SidebarTreeItemProps) {
  const isSelected = item.documentId === selectedDocumentId;
  const className = isSelected ? "tree-document-item active" : "tree-document-item";

  return (
    <div className="tree-item">
      {item.documentId ? (
        <button
          type="button"
          className={className}
          onClick={() => onSelect(item.documentId!)}
        >
          <span className="tree-document-icon">[]</span>
          <span>{item.title}</span>
        </button>
      ) : (
        <div className="tree-document-item placeholder">
          <span className="tree-document-icon">[]</span>
          <span>{item.title}</span>
        </div>
      )}

      {item.children && item.children.length > 0 && (
        <div className="tree-item-children">
          {item.children.map((child) => (
            <SidebarTreeItem
              key={child.id}
              item={child}
              selectedDocumentId={selectedDocumentId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildSidebarFolders(documents: Document[]): SidebarFolder[] {
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

function countTicketsByStatus(tickets: Ticket[], status: TicketFilter) {
  return tickets.filter((ticket) => ticket.status === status).length;
}

function getTicketDocumentTitle(ticket: Ticket, documents: Document[]) {
  if (!ticket.documentId) {
    return "Kein Dokument";
  }

  return (
    documents.find((document) => document.id === ticket.documentId)?.title ??
    "Nicht verknuepft"
  );
}

function formatTicketFilterLabel(status: TicketFilter) {
  if (status === "Open") {
    return "Offen";
  }

  if (status === "In Progress") {
    return "In Progress";
  }

  return "Erledigt";
}

function getTicketStatusClassName(status: Ticket["status"]) {
  if (status === "Open") {
    return "ticket-badge open";
  }

  if (status === "In Progress") {
    return "ticket-badge progress";
  }

  return "ticket-badge done";
}

function getPriorityClassName(index: number) {
  if (index === 0) {
    return "ticket-priority high";
  }

  if (index === 1) {
    return "ticket-priority medium";
  }

  return "ticket-priority low";
}

function getPriorityLabel(index: number) {
  if (index === 0) {
    return "Hoch";
  }

  if (index === 1) {
    return "Mittel";
  }

  return "Normal";
}

function countWords(value: string) {
  const matches = value.trim().match(/\S+/g);
  return matches?.length ?? 0;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "unbekannt";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createEmptyDraft(workspaceId: string): EditorDraft {
  return {
    id: null,
    workspaceId,
    parentId: null,
    title: "",
    slug: "",
    content: "# Neues Dokument\n",
    isNew: true
  };
}

function mapDocumentToDraft(document: Document): EditorDraft {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    parentId: document.parentId,
    title: document.title,
    slug: document.slug,
    content: document.content,
    isNew: false
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unbekannter Fehler.";
}
