import { useEffect, useState } from "react";
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
  canEditDocument,
  canManageAddons
} from "@plainbase/shared";
import { AddonRegistry } from "./addons/addon-registry";
import { apiClient, ApiClientError } from "./api/client";
import { DocumentEditorPane } from "./components/DocumentEditorPane";
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

export function App() {
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
        if (currentDocumentId && documents.some((item) => item.id === currentDocumentId)) {
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
    demoUserState.status === "success" ? demoUserState.data.role.name : undefined;
  const demoUser =
    demoUserState.status === "success" ? demoUserState.data : null;
  const mayCreateDocument = canCreateDocument(demoUser);
  const mayEditDocument = canEditDocument(demoUser);
  const mayManageAddons = canManageAddons(demoUser);
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
  const addonPanelContext = {
    activeAddonIds,
    currentDocument:
      documentState?.status === "success" ? documentState.data : null,
    demoRoleName: activeRole ?? null,
    tickets,
    workspaceId: selectedWorkspaceId
  };

  return (
    <main className="workspace-app">
      <aside className="left-sidebar">
        <div className="sidebar-section">
          <p className="section-label">Workspace</p>
          {workspacesState.status === "loading" && <p>Lade Workspaces...</p>}
          {workspacesState.status === "error" && (
            <p className="feedback error">{workspacesState.message}</p>
          )}
          {workspacesState.status === "success" && (
            <select
              className="field"
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
        </div>

        <div className="sidebar-section">
          <div className="section-heading-row">
            <p className="section-label">Dokumente</p>
            <span className="section-count">{documents.length}</span>
          </div>
          {documentsState.status === "loading" && <p>Lade Dokumente...</p>}
          {documentsState.status === "error" && (
            <p className="feedback error">{documentsState.message}</p>
          )}
          {documentsState.status === "success" && (
            <ul className="sidebar-list">
              {documents.map((document) => (
                <li key={document.id}>
                  <button
                    className={
                      document.id === selectedDocumentId
                        ? "sidebar-item active"
                        : "sidebar-item"
                    }
                    onClick={() => setSelectedDocumentId(document.id)}
                  >
                    <span className="sidebar-item-title">{document.title}</span>
                    <span className="sidebar-item-meta">{document.slug}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar-section">
          <div className="section-heading-row">
            <p className="section-label">Add-ons</p>
            <span className="section-count">{addons.length}</span>
          </div>
          {addonsState.status === "loading" && <p>Lade Add-ons...</p>}
          {addonsState.status === "error" && (
            <p className="feedback error">{addonsState.message}</p>
          )}
          {addonsState.status === "success" && (
            <ul className="sidebar-list">
              {addons.map((addon) => (
                <li key={addon.id} className="addon-list-item">
                  <div>
                    <span className="sidebar-item-title">{addon.name}</span>
                    <span className="sidebar-item-meta">
                      {addon.enabled ? "aktiv" : "deaktiviert"}
                    </span>
                  </div>
                  {mayManageAddons && (
                    <button
                      className="ghost-button small"
                      disabled={pendingAddonId === addon.id}
                      onClick={() => void handleAddonToggle(addon.id)}
                    >
                      {pendingAddonId === addon.id
                        ? "..."
                        : addon.enabled
                          ? "Aus"
                          : "An"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {leftSidebarPanels.map((panel) => (
          <section key={panel.id} className="sidebar-section addon-panel">
            <div className="section-heading-row">
              <div>
                <h3>{panel.title}</h3>
              </div>
            </div>
            {panel.render(addonPanelContext)}
          </section>
        ))}
      </aside>

      <section className="main-stage">
        <header className="top-toolbar">
          <div className="toolbar-actions">
            <button
              className="primary-button"
              onClick={handleNewDocument}
              disabled={!selectedWorkspaceId || !mayCreateDocument}
            >
              Neues Dokument
            </button>
            <button
              className="secondary-button"
              onClick={() => void handleSaveDocument()}
              disabled={!draft || !mayEditDocument || !hasUnsavedChanges || saveState.status === "saving"}
            >
              {saveState.status === "saving" ? "Speichert..." : "Speichern"}
            </button>
          </div>

          <div className="toolbar-actions">
            <div className="role-switcher">
              <label htmlFor="role-select">Demo-Rolle</label>
              <select
                id="role-select"
                className="field"
                value={activeRole ?? ""}
                disabled={rolesState.status !== "success" || roleSwitchStatus.status === "saving"}
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
            <button className="ghost-button" disabled>
              Einstellungen
            </button>
          </div>
        </header>

        <div className="toolbar-status-row">
          <div>
            <p className="eyebrow">Aktiver Demo-User</p>
            {demoUserState.status === "loading" && <p>Lade Benutzer...</p>}
            {demoUserState.status === "error" && (
              <p className="feedback error">{demoUserState.message}</p>
            )}
            {demoUserState.status === "success" && (
              <p className="toolbar-status-text">
                {demoUserState.data.user.name} ({demoUserState.data.role.name})
              </p>
            )}
            {hasUnsavedChanges && (
              <p className="unsaved-banner">
                Dieses Dokument hat ungespeicherte Aenderungen.
              </p>
            )}
          </div>
          <div className="toolbar-feedback-group">
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
        </div>

        <div className="editor-split">
          <div>
            {documentState?.status === "loading" && <p>Lade Dokument...</p>}
            {documentState?.status === "error" && (
              <p className="feedback error">{documentState.message}</p>
            )}
            <DocumentEditorPane
              canEdit={mayEditDocument}
              draft={draft}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={saveState.status === "saving"}
              message={saveState.status === "success" ? saveState.message : null}
              onDraftChange={handleDraftChange}
            />
          </div>

          <section className="preview-pane">
            <div className="pane-header">
              <div>
                <p className="section-label">Markdown-Vorschau</p>
                <h2>Live Preview</h2>
              </div>
            </div>

            <MarkdownPreview
              content={draft?.content ?? ""}
              currentDocument={
                documentState?.status === "success" ? documentState.data : null
              }
              markdownBlockRenderers={markdownBlockRenderers}
              workspaceId={selectedWorkspaceId}
            />
          </section>
        </div>
      </section>

      <aside className="right-sidebar">
        <div className="sidebar-section">
          <p className="section-label">Add-on-Panels</p>
          <p className="sidebar-copy">
            Platz fuer kontextuelle Panels aus aktivierten Add-ons.
          </p>
          {addonRegistryState.status === "error" && (
            <p className="feedback error">{addonRegistryState.message}</p>
          )}
          {addonWarnings.map((warning) => (
            <p key={warning} className="feedback error">
              {warning}
            </p>
          ))}
        </div>

        {addonsState.status === "success" &&
          addons.map((addon) => (
            <section key={addon.id} className="addon-panel">
              <div className="section-heading-row">
                <div>
                  <h3>{addon.name}</h3>
                  <p className="panel-subtitle">Version {addon.version}</p>
                </div>
                <span className={addon.enabled ? "status-pill on" : "status-pill off"}>
                  {addon.enabled ? "aktiv" : "aus"}
                </span>
              </div>

              <p className="sidebar-copy">{addon.description}</p>
              <div className="addon-placeholder">
                {addon.enabled
                  ? "Aktiviertes Add-on. Panels und Renderer werden ueber die Registry eingebunden."
                  : "Add-on ist deaktiviert und liefert aktuell keine Erweiterungen."}
              </div>
            </section>
          ))}

        {rightSidebarPanels.map((panel) => (
          <section key={panel.id} className="addon-panel">
            <div className="section-heading-row">
              <div>
                <h3>{panel.title}</h3>
              </div>
            </div>
            {panel.render(addonPanelContext)}
          </section>
        ))}
      </aside>
    </main>
  );
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
