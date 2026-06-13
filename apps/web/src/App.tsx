import { useEffect, useState } from "react";
import type { DocumentKind } from "@plainbase/shared";
import type { SidebarPanelContext } from "@plainbase/addon-sdk";
import type { RightPanelTab, TicketFilter } from "./app/types";
import { AdminToolsPanel } from "./components/admin/AdminToolsPanel";
import { DocumentWorkspace } from "./components/document/DocumentWorkspace";
import { AppTopbar } from "./components/layout/AppTopbar";
import { SettingsDialog } from "./components/layout/SettingsDialog";
import { FeatureStrip } from "./components/layout/FeatureStrip";
import { RightSidebar } from "./components/right-panel/RightSidebar";
import { LeftSidebar } from "./components/sidebar/LeftSidebar";
import { useWorkspaceApp } from "./hooks/useWorkspaceApp";
import { buildSidebarFolders } from "./lib/sidebar-model";

export function App() {
  const { actions, data, permissions, state } = useWorkspaceApp();
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    getInitialTheme()
  );
  const [activePanelTab, setActivePanelTab] = useState<RightPanelTab>("tickets");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("Open");
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("plainbase-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!permissions.mayManageUsers && isAdminToolsOpen) {
      setIsAdminToolsOpen(false);
    }
  }, [isAdminToolsOpen, permissions.mayManageUsers]);

  const documentFolders = buildSidebarFolders(data.documents, state.draft);
  const currentTabTitle =
    state.draft?.title.trim() || data.selectedDocument?.title || "Neues Objekt";
  const linkedDocuments = data.documents
    .filter(
      (document) =>
        document.kind === "document" &&
        document.id !== state.selectedDocumentId
    )
    .slice(0, 3);
  const addonPanelContext: SidebarPanelContext = {
    activeAddonIds: data.activeAddonIds,
    currentDocument: data.selectedDocument,
    demoRoleName: data.activeRole,
    tickets: data.tickets,
    workspaceId: state.selectedWorkspaceId
  };

  async function handleCreateEntry(kind: DocumentKind) {
    setIsAdminToolsOpen(false);
    const created = await actions.createEntry(kind);

    if (created?.kind === "document") {
      setShowSourceEditor(true);
    }
  }

  function handleOpenAdminTools() {
    setIsAdminToolsOpen(true);
  }

  return (
    <div className="workspace-frame">
      <AppTopbar
        activeRole={data.activeRole}
        demoUserState={state.demoUserState}
        roleSwitchStatus={state.roleSwitchStatus}
        selectedWorkspace={data.selectedWorkspace}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSignIn={(identifier, password) =>
          actions.signIn(identifier, password)
        }
        onSignOut={() => void actions.signOut()}
      />

      <div className="workspace-layout">
        <LeftSidebar
          addonPanelContext={addonPanelContext}
          addons={data.addons}
          documentsState={state.documentsState}
          documentFolders={documentFolders}
          leftSidebarPanels={data.leftSidebarPanels}
          mayCreateDocument={permissions.mayCreateDocument}
          mayDeleteDocument={permissions.mayDeleteDocument}
          mayEditDocument={permissions.mayEditDocument}
          mayManageAddons={permissions.mayManageAddons}
          pendingAddonId={state.pendingAddonId}
          selectedDocumentId={state.selectedDocumentId}
          selectedWorkspaceId={state.selectedWorkspaceId}
          tickets={data.tickets}
          workspacesState={state.workspacesState}
          onAddonToggle={(addonId) => void actions.toggleAddon(addonId)}
          onDocumentDelete={(documentId) =>
            actions.deleteDocumentInTree(documentId)
          }
          onDocumentMove={(documentId, targetDocumentId, placement) =>
            void actions.moveDocumentInTree(documentId, targetDocumentId, placement)
          }
          onDocumentRename={(documentId, title) =>
            actions.renameDocumentInTree(documentId, title)
          }
          onDocumentSelect={actions.setSelectedDocumentId}
          onCreateEntry={(kind) => void handleCreateEntry(kind)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onWorkspaceSelect={actions.setSelectedWorkspaceId}
        />

        {isAdminToolsOpen ? (
          <AdminToolsPanel
            roles={data.roles}
            selectedWorkspace={data.selectedWorkspace}
            selectedWorkspaceName={data.selectedWorkspace?.name ?? null}
            userMutationStatus={state.userMutationStatus}
            usersState={state.usersState}
            workspaceMutationStatus={state.workspaceMutationStatus}
            workspacesState={state.workspacesState}
            onClose={() => setIsAdminToolsOpen(false)}
            onUserCreate={actions.createUser}
            onUserUpdate={actions.updateUser}
            onUserDelete={actions.deleteUser}
            onWorkspaceCreate={actions.createWorkspace}
          />
        ) : (
          <DocumentWorkspace
            activeRole={data.activeRole}
            currentTabTitle={currentTabTitle}
            documentState={state.documentState}
            draft={state.draft}
            hasUnsavedChanges={state.hasUnsavedChanges}
            markdownBlockRenderers={data.markdownBlockRenderers}
            mayCreateDocument={permissions.mayCreateDocument}
            mayEditDocument={permissions.mayEditDocument}
            roleSwitchStatus={state.roleSwitchStatus}
            saveState={state.saveState}
            selectedDocument={data.selectedDocument}
            selectedWorkspace={data.selectedWorkspace}
            selectedWorkspaceId={state.selectedWorkspaceId}
            showSourceEditor={showSourceEditor}
            usersState={state.usersState}
            mayManageUsers={permissions.mayManageUsers}
            onCreateEntry={(kind) => void handleCreateEntry(kind)}
            onDraftChange={actions.updateDraft}
            onOpenAdminTools={handleOpenAdminTools}
            onSaveDocument={() => void actions.saveDocument()}
            onShowSourceEditorChange={setShowSourceEditor}
          />
        )}

        <RightSidebar
          activePanelTab={activePanelTab}
          addonPanelContext={addonPanelContext}
          addonRegistryState={state.addonRegistryState}
          addonWarnings={data.addonWarnings}
          documents={data.documents}
          linkedDocuments={linkedDocuments}
          mayCreateTicket={permissions.mayCreateTicket}
          rightSidebarPanels={data.rightSidebarPanels}
          ticketFilter={ticketFilter}
          tickets={data.tickets}
          onDocumentSelect={actions.setSelectedDocumentId}
          onPanelTabChange={setActivePanelTab}
          onTicketFilterChange={setTicketFilter}
        />
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        selectedWorkspace={data.selectedWorkspace}
        theme={theme}
        demoAuth={state.demoUserState.status === "success" ? state.demoUserState.data : null}
        onClose={() => setIsSettingsOpen(false)}
        onThemeToggle={() =>
          setTheme((current) => (current === "light" ? "dark" : "light"))
        }
      />

      <FeatureStrip />
    </div>
  );
}

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light" as const;
  }

  const storedTheme = window.localStorage.getItem("plainbase-theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
