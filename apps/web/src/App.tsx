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
import type { MainView, QuickLinkId } from "./app/types";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export function App() {
  const { actions, data, permissions, state } = useWorkspaceApp();
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getInitialThemePreference()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );
  const [activePanelTab, setActivePanelTab] = useState<RightPanelTab>("tickets");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("Open");
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const theme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("plainbase-theme", themePreference);
  }, [themePreference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncSystemTheme(event?: MediaQueryListEvent) {
      setSystemTheme(event?.matches ?? mediaQuery.matches ? "dark" : "light");
    }

    syncSystemTheme();
    mediaQuery.addEventListener("change", syncSystemTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  useEffect(() => {
    if (!permissions.mayManageUsers && isAdminToolsOpen) {
      setIsAdminToolsOpen(false);
    }
  }, [isAdminToolsOpen, permissions.mayManageUsers]);

  const documentFolders = buildSidebarFolders(data.documents, state.draft);
  const activeMainView: MainView =
    state.activeTabView === "tickets" ? "tickets" : "document";
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

    if (created?.kind && created.kind !== "folder") {
      setShowSourceEditor(true);
    }
  }

  function handleCreateTab() {
    setIsAdminToolsOpen(false);
    actions.createTab();
    setShowSourceEditor(true);
  }

  function handleOpenAdminTools() {
    setIsAdminToolsOpen(true);
  }

  function handleSelectDocument(documentId: string) {
    actions.setSelectedDocumentId(documentId);
  }

  function handleQuickLinkSelect(linkId: QuickLinkId) {
    if (linkId === "tickets") {
      actions.openTicketsTab();
      return;
    }

    actions.focusDocumentTab();
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
          activeMainView={activeMainView}
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
          onDocumentSelect={handleSelectDocument}
          onCreateEntry={(kind) => void handleCreateEntry(kind)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onQuickLinkSelect={handleQuickLinkSelect}
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
            activeTabView={state.activeTabView}
            documentState={state.documentState}
            documents={data.documents}
            draft={state.draft}
            hasUnsavedChanges={state.hasUnsavedChanges}
            markdownBlockRenderers={data.markdownBlockRenderers}
            mayEditDocument={permissions.mayEditDocument}
            roleSwitchStatus={state.roleSwitchStatus}
            saveState={state.saveState}
            selectedDocument={data.selectedDocument}
            selectedWorkspace={data.selectedWorkspace}
            selectedWorkspaceId={state.selectedWorkspaceId}
            showSourceEditor={showSourceEditor}
            tabs={state.tabs}
            tickets={data.tickets}
            usersState={state.usersState}
            mayManageUsers={permissions.mayManageUsers}
            onCreateTab={handleCreateTab}
            onDraftChange={actions.updateDraft}
            onDocumentSelect={handleSelectDocument}
            onOpenAdminTools={handleOpenAdminTools}
            onSaveDocument={() => void actions.saveDocument()}
            onShowSourceEditorChange={setShowSourceEditor}
            onTabClose={actions.closeTab}
            onTabSelect={actions.setActiveTabId}
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
          onDocumentSelect={handleSelectDocument}
          onPanelTabChange={setActivePanelTab}
          onTicketFilterChange={setTicketFilter}
        />
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        selectedWorkspace={data.selectedWorkspace}
        theme={theme}
        themePreference={themePreference}
        demoAuth={state.demoUserState.status === "success" ? state.demoUserState.data : null}
        onClose={() => setIsSettingsOpen(false)}
        onThemeChange={setThemePreference}
      />

      <FeatureStrip />
    </div>
  );
}

function getInitialThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = window.localStorage.getItem("plainbase-theme");

  if (
    storedTheme === "light" ||
    storedTheme === "dark" ||
    storedTheme === "system"
  ) {
    return storedTheme;
  }

  return "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
