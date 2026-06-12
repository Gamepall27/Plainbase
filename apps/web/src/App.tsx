import { useEffect, useState } from "react";
import type { SidebarPanelContext } from "@plainbase/addon-sdk";
import type { RightPanelTab, TicketFilter } from "./app/types";
import { AdminToolsPanel } from "./components/admin/AdminToolsPanel";
import { DocumentWorkspace } from "./components/document/DocumentWorkspace";
import { AppTopbar } from "./components/layout/AppTopbar";
import { FeatureStrip } from "./components/layout/FeatureStrip";
import { RightSidebar } from "./components/right-panel/RightSidebar";
import { LeftSidebar } from "./components/sidebar/LeftSidebar";
import { useWorkspaceApp } from "./hooks/useWorkspaceApp";
import { buildSidebarFolders } from "./lib/sidebar-model";

export function App() {
  const { actions, data, permissions, state } = useWorkspaceApp();
  const [activePanelTab, setActivePanelTab] = useState<RightPanelTab>("tickets");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("Open");
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState(false);

  useEffect(() => {
    if (!permissions.mayManageUsers && isAdminToolsOpen) {
      setIsAdminToolsOpen(false);
    }
  }, [isAdminToolsOpen, permissions.mayManageUsers]);

  const documentFolders = buildSidebarFolders(data.documents);
  const currentTabTitle =
    state.draft?.title.trim() || data.selectedDocument?.title || "Welcome";
  const linkedDocuments = data.documents
    .filter((document) => document.id !== state.selectedDocumentId)
    .slice(0, 3);
  const addonPanelContext: SidebarPanelContext = {
    activeAddonIds: data.activeAddonIds,
    currentDocument: data.selectedDocument,
    demoRoleName: data.activeRole,
    tickets: data.tickets,
    workspaceId: state.selectedWorkspaceId
  };

  function handleNewDocument() {
    setIsAdminToolsOpen(false);
    actions.createDocumentDraft();
    setShowSourceEditor(true);
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
          mayManageAddons={permissions.mayManageAddons}
          pendingAddonId={state.pendingAddonId}
          selectedDocumentId={state.selectedDocumentId}
          selectedWorkspaceId={state.selectedWorkspaceId}
          tickets={data.tickets}
          workspacesState={state.workspacesState}
          onAddonToggle={(addonId) => void actions.toggleAddon(addonId)}
          onDocumentSelect={actions.setSelectedDocumentId}
          onNewDocument={handleNewDocument}
          onWorkspaceSelect={actions.setSelectedWorkspaceId}
        />

        {isAdminToolsOpen ? (
          <AdminToolsPanel
            roles={data.roles}
            selectedWorkspaceName={data.selectedWorkspace?.name ?? null}
            userMutationStatus={state.userMutationStatus}
            usersState={state.usersState}
            onClose={() => setIsAdminToolsOpen(false)}
            onUserCreate={actions.createUser}
            onUserUpdate={actions.updateUser}
            onUserDelete={actions.deleteUser}
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
            onDraftChange={actions.updateDraft}
            onNewDocument={handleNewDocument}
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

      <FeatureStrip />
    </div>
  );
}
