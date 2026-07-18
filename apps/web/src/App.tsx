import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { DocumentKind } from "@plainbase/shared";
import type { SidebarPanelContext } from "@plainbase/addon-sdk";
import type { RightPanelTab, TicketFilter } from "./app/types";
import { DocumentWorkspace } from "./components/document/DocumentWorkspace";
import { AuthActionDialog } from "./components/layout/AuthActionDialog";
import { AppTopbar } from "./components/layout/AppTopbar";
import { InitialSetupDialog } from "./components/layout/InitialSetupDialog";
import { SettingsDialog } from "./components/layout/SettingsDialog";
import { FeatureStrip } from "./components/layout/FeatureStrip";
import { RightSidebar } from "./components/right-panel/RightSidebar";
import { LeftSidebar } from "./components/sidebar/LeftSidebar";
import { useWorkspaceApp } from "./hooks/useWorkspaceApp";
import { buildSidebarFolders } from "./lib/sidebar-model";
import type { MainView, QuickLinkId } from "./app/types";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
type SidebarSide = "left" | "right";

const leftSidebarStorageKey = "plainbase-left-sidebar-width";
const rightSidebarStorageKey = "plainbase-right-sidebar-width";
const leftSidebarDefaultWidth = 260;
const rightSidebarDefaultWidth = 306;
const leftSidebarMinWidth = 220;
const leftSidebarMaxWidth = 420;
const rightSidebarMinWidth = 240;
const rightSidebarMaxWidth = 460;

export function App() {
  const { actions, data, permissions, state } = useWorkspaceApp();
  const [authAction, setAuthAction] = useState<AuthAction>(() => getAuthAction());
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getInitialThemePreference()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );
  const [activePanelTab, setActivePanelTab] = useState<RightPanelTab>("tickets");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("Open");
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() =>
    readSidebarWidth(leftSidebarStorageKey, leftSidebarDefaultWidth)
  );
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() =>
    readSidebarWidth(rightSidebarStorageKey, rightSidebarDefaultWidth)
  );
  const theme = themePreference === "system" ? systemTheme : themePreference;
  const showTicketUi = state.activeTabView === "tickets";
  const workspaceLayoutStyle = {
    "--left-sidebar-width": `${leftSidebarWidth}px`,
    "--right-sidebar-width": `${rightSidebarWidth}px`
  } as CSSProperties;

  useEffect(() => {
    if (!showTicketUi && activePanelTab === "tickets") {
      setActivePanelTab("links");
      return;
    }

    if (showTicketUi && activePanelTab !== "tickets") {
      setActivePanelTab("tickets");
    }
  }, [activePanelTab, showTicketUi]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("plainbase-theme", themePreference);
  }, [themePreference]);

  useEffect(() => {
    window.localStorage.setItem(leftSidebarStorageKey, String(leftSidebarWidth));
  }, [leftSidebarWidth]);

  useEffect(() => {
    window.localStorage.setItem(rightSidebarStorageKey, String(rightSidebarWidth));
  }, [rightSidebarWidth]);

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
    if (
      state.onboardingState.status === "success" &&
      state.onboardingState.data.state === "bootstrap_required"
    ) {
      setIsInitialSetupOpen(true);
    }
  }, [state.onboardingState]);

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
    tickets: showTicketUi ? data.tickets : [],
    workspaceId: state.selectedWorkspaceId
  };

  async function handleCreateEntry(kind: DocumentKind) {
    const created = await actions.createEntry(kind);

    if (created?.kind && created.kind !== "folder") {
      setShowSourceEditor(true);
    }
  }

  function handleCreateTab() {
    actions.createTab();
    setShowSourceEditor(true);
  }

  function handleSelectDocument(documentId: string) {
    actions.setSelectedDocumentId(documentId);
  }

  function handleQuickLinkSelect(linkId: QuickLinkId) {
    if (linkId === "tickets") {
      actions.openTicketsTab();
      return;
    }

    if (linkId === "admin-tools") {
      actions.openAdminTab();
      return;
    }

    actions.focusDocumentTab();
  }

  function handleCloseAuthAction() {
    window.history.replaceState({}, "", window.location.pathname);
    setAuthAction(null);
  }

  function handleSidebarResizeStart(
    side: SidebarSide,
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (window.innerWidth <= 1280) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = side === "left" ? leftSidebarWidth : rightSidebarWidth;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handlePointerMove(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - startX;

      if (side === "left") {
        setLeftSidebarWidth(
          clamp(
            startWidth + deltaX,
            leftSidebarMinWidth,
            leftSidebarMaxWidth
          )
        );
        return;
      }

      setRightSidebarWidth(
        clamp(
          startWidth - deltaX,
          rightSidebarMinWidth,
          rightSidebarMaxWidth
        )
      );
    }

    function handlePointerUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div className="workspace-frame">
      <AppTopbar
        activeRole={data.activeRole}
        demoUserState={state.demoUserState}
        onboardingState={state.onboardingState}
        roleSwitchStatus={state.roleSwitchStatus}
        selectedWorkspace={data.selectedWorkspace}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInitialSetup={() => setIsInitialSetupOpen(true)}
        onSignIn={(identifier, password) =>
          actions.signIn(identifier, password)
        }
        onRequestPasswordReset={(identifier) =>
          actions.requestPasswordReset(identifier)
        }
        onSignOut={() => void actions.signOut()}
      />

      <div className="workspace-layout" style={workspaceLayoutStyle}>
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
          mayManageUsers={permissions.mayManageUsers}
          pendingAddonId={state.pendingAddonId}
          selectedDocumentId={state.selectedDocumentId}
          selectedWorkspaceId={state.selectedWorkspaceId}
          showTicketUi={showTicketUi}
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
          onDocumentOpenInNewTab={(documentId) =>
            actions.openDocumentInNewTab(documentId)
          }
          onCreateEntry={(kind) => void handleCreateEntry(kind)}
          onOpenAdminTools={actions.openAdminTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onQuickLinkSelect={handleQuickLinkSelect}
          onWorkspaceSelect={actions.setSelectedWorkspaceId}
        />

        <div
          className="sidebar-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Linke Seitenleiste groesse aendern"
          onPointerDown={(event) => handleSidebarResizeStart("left", event)}
        />

        <DocumentWorkspace
          activeRole={data.activeRole}
          activeTabView={state.activeTabView}
          documentState={state.documentState}
          documents={data.documents}
          draft={state.draft}
          hasUnsavedChanges={state.hasUnsavedChanges}
          invitationMutationStatus={state.invitationMutationStatus}
          markdownBlockRenderers={data.markdownBlockRenderers}
          mayEditDocument={permissions.mayEditDocument}
          mayManageUsers={permissions.mayManageUsers}
          onboarding={data.onboarding}
          roleSwitchStatus={state.roleSwitchStatus}
          roles={data.roles}
          saveState={state.saveState}
          selectedDocument={data.selectedDocument}
          selectedWorkspace={data.selectedWorkspace}
          selectedWorkspaceName={data.selectedWorkspace?.name ?? null}
          selectedWorkspaceId={state.selectedWorkspaceId}
          showSourceEditor={showSourceEditor}
          tabs={state.tabs}
          tickets={data.tickets}
          userMutationStatus={state.userMutationStatus}
          usersState={state.usersState}
          workspaceMutationStatus={state.workspaceMutationStatus}
          workspacesState={state.workspacesState}
          onCloseAdminTab={() => {
            const activeAdminTab = state.tabs.find(
              (tab) => tab.isActive && tab.view === "admin"
            );

            if (activeAdminTab) {
              actions.closeTab(activeAdminTab.id);
            }
          }}
          onCreateTab={handleCreateTab}
          onDraftChange={actions.updateDraft}
          onDocumentSelect={handleSelectDocument}
          onInvitationCreate={actions.createInvitation}
          onSaveDocument={() => void actions.saveDocument()}
          onShowSourceEditorChange={setShowSourceEditor}
          onTabClose={actions.closeTab}
          onTabSelect={actions.setActiveTabId}
          onUserCreate={actions.createUser}
          onUserDelete={actions.deleteUser}
          onUserUpdate={actions.updateUser}
          onWorkspaceCreate={actions.createWorkspace}
          onWorkspaceImport={actions.importWorkspace}
          onWorkspaceDelete={actions.deleteWorkspace}
          onWorkspaceUpdate={actions.updateWorkspace}
        />

        <div
          className="sidebar-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Rechte Seitenleiste groesse aendern"
          onPointerDown={(event) => handleSidebarResizeStart("right", event)}
        />

        <RightSidebar
          activePanelTab={activePanelTab}
          addonPanelContext={addonPanelContext}
          addonRegistryState={state.addonRegistryState}
          addonWarnings={data.addonWarnings}
          documents={data.documents}
          linkedDocuments={linkedDocuments}
          mayCreateTicket={permissions.mayCreateTicket}
          rightSidebarPanels={data.rightSidebarPanels}
          showTicketUi={showTicketUi}
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

      {authAction && (
        <AuthActionDialog
          mode={authAction.mode}
          status={state.roleSwitchStatus}
          onClose={handleCloseAuthAction}
          onSubmit={async (password) => {
            if (authAction.mode === "invite") {
              return actions.acceptInvitation(authAction.token, password);
            }

            return actions.resetPassword(authAction.token, password);
          }}
        />
      )}

      {isInitialSetupOpen && (
        <InitialSetupDialog
          status={state.setupStatus}
          onClose={() => setIsInitialSetupOpen(false)}
          onSubmit={(input) => actions.bootstrapInstallation(input)}
        />
      )}

      <FeatureStrip />
    </div>
  );
}

function readSidebarWidth(storageKey: string, fallback: number) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedWidth = Number(window.localStorage.getItem(storageKey));

  return Number.isFinite(storedWidth) && storedWidth > 0
    ? storedWidth
    : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

type AuthAction =
  | {
      mode: "invite" | "reset";
      token: string;
    }
  | null;

function getAuthAction(): AuthAction {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite");

  if (inviteToken) {
    return {
      mode: "invite",
      token: inviteToken
    };
  }

  const resetToken = params.get("reset");

  if (resetToken) {
    return {
      mode: "reset",
      token: resetToken
    };
  }

  return null;
}
