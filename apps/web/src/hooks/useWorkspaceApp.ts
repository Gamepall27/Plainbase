import { useEffect, useRef, useState } from "react";
import type {
  Addon,
  DemoAuth,
  Document,
  DocumentKind,
  Role,
  Ticket,
  User,
  Workspace
} from "@plainbase/shared";
import {
  canCreateDocument,
  canCreateTicket,
  canDeleteDocument,
  canEditDocument,
  canManageAddons,
  canManageUsers
} from "@plainbase/shared";
import { AddonRegistry } from "../addons/addon-registry";
import { apiClient } from "../api/client";
import type {
  LoadState,
  SaveState,
  WorkspaceTab,
  WorkspaceTabView
} from "../app/types";
import type { EditorDraft } from "../editor/types";
import { getErrorMessage } from "../lib/app-errors";
import { mapDocumentToDraft, slugify } from "../lib/document-draft";

export function useWorkspaceApp() {
  const [workspacesState, setWorkspacesState] = useState<LoadState<Workspace[]>>({
    status: "loading"
  });
  const [documentsState, setDocumentsState] = useState<LoadState<Document[]>>({
    status: "loading"
  });
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
  const [demoUserState, setDemoUserState] = useState<LoadState<DemoAuth>>({
    status: "loading"
  });
  const [ticketsState, setTicketsState] = useState<LoadState<Ticket[]>>({
    status: "loading"
  });
  const [usersState, setUsersState] = useState<LoadState<User[]>>({
    status: "loading"
  });
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );
  const [openTabs, setOpenTabs] = useState<EditorTabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [roleSwitchStatus, setRoleSwitchStatus] = useState<SaveState>({
    status: "idle"
  });
  const [userMutationStatus, setUserMutationStatus] = useState<SaveState>({
    status: "idle"
  });
  const [invitationMutationStatus, setInvitationMutationStatus] = useState<SaveState>({
    status: "idle"
  });
  const [workspaceMutationStatus, setWorkspaceMutationStatus] = useState<SaveState>({
    status: "idle"
  });
  const [pendingAddonId, setPendingAddonId] = useState<string | null>(null);
  const openTabsRef = useRef<EditorTabState[]>([]);
  const activeTabIdRef = useRef<string | null>(null);
  const initializedWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

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
    initializedWorkspaceIdRef.current = null;
    updateTabs([], null);

    if (!selectedWorkspaceId) {
      setDocumentsState({ status: "success", data: [] });
      setTicketsState({ status: "success", data: [] });
      return;
    }

    void loadWorkspaceData(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadWorkspaceData(selectedWorkspaceId, { silent: true });
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedWorkspaceId]);

  async function loadShellData() {
    const [addonsResult, rolesResult, authResult] = await Promise.allSettled([
      apiClient.getAddons(),
      apiClient.getRoles(),
      apiClient.getAuthState()
    ]);

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

    if (authResult.status === "fulfilled") {
      setDemoUserState({ status: "success", data: authResult.value });
    } else {
      setDemoUserState({
        status: "error",
        message: getErrorMessage(authResult.reason)
      });
      setWorkspacesState({ status: "success", data: [] });
      setUsersState({ status: "success", data: [] });
      setSelectedWorkspaceId(null);
      return;
    }

    if (authResult.value.authType !== "session") {
      setWorkspacesState({ status: "success", data: [] });
      setUsersState({ status: "success", data: [] });
      setSelectedWorkspaceId(null);
      return;
    }

    const [workspacesResult, usersResult] = await Promise.allSettled([
      apiClient.getWorkspaces(),
      apiClient.getUsers()
    ]);

    if (workspacesResult.status === "fulfilled") {
      setWorkspacesState({ status: "success", data: workspacesResult.value });

      const firstWorkspaceId = workspacesResult.value[0]?.id ?? null;
      setSelectedWorkspaceId((current) =>
        current && workspacesResult.value.some((workspace) => workspace.id === current)
          ? current
          : firstWorkspaceId
      );
    } else {
      setWorkspacesState({
        status: "error",
        message: getErrorMessage(workspacesResult.reason)
      });
    }

    if (usersResult.status === "fulfilled") {
      setUsersState({ status: "success", data: usersResult.value });
    } else {
      setUsersState({
        status: "error",
        message: getErrorMessage(usersResult.reason)
      });
    }
  }

  async function loadWorkspaceData(
    workspaceId: string,
    options?: {
      silent?: boolean;
    }
  ) {
    if (!options?.silent) {
      setDocumentsState({ status: "loading" });
      setTicketsState({ status: "loading" });
    }

    const [documentsResult, ticketsResult] = await Promise.allSettled([
      apiClient.getDocuments(workspaceId),
      apiClient.getTickets(workspaceId)
    ]);

    if (documentsResult.status === "fulfilled") {
      const documents = documentsResult.value;
      setDocumentsState({ status: "success", data: documents });
      const shouldInitializeTabs =
        initializedWorkspaceIdRef.current !== workspaceId;
      const syncedTabs = syncTabsForWorkspace(
        openTabsRef.current,
        workspaceId,
        documents
      );
      const nextTabs =
        shouldInitializeTabs && syncedTabs.length === 0
          ? createInitialTabs(workspaceId, documents)
          : syncedTabs;

      updateTabs(
        nextTabs,
        resolveActiveTabId(activeTabIdRef.current, nextTabs)
      );
      initializedWorkspaceIdRef.current = workspaceId;
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

  async function signIn(identifier: string, password: string) {
    setRoleSwitchStatus({ status: "saving" });

    try {
      const demoAuth = await apiClient.signIn({
        identifier,
        password
      });
      setDemoUserState({ status: "success", data: demoAuth });
      await loadShellData();
      setRoleSwitchStatus({
        status: "success",
        message:
          demoAuth.authType === "session"
            ? `Angemeldet als ${demoAuth.user.name}.`
            : "Anmeldung fehlgeschlagen."
      });
      return true;
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function signOut() {
    setRoleSwitchStatus({ status: "saving" });

    try {
      const demoAuth = await apiClient.signOut();
      setDemoUserState({ status: "success", data: demoAuth });
      await loadShellData();
      setRoleSwitchStatus({
        status: "success",
        message: "Sitzung wurde beendet."
      });
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
    }
  }

  async function requestPasswordReset(identifier: string) {
    setRoleSwitchStatus({ status: "saving" });

    try {
      const result = await apiClient.requestPasswordReset({ identifier });
      setRoleSwitchStatus({
        status: "success",
        message: result.resetUrl
          ? "Reset-Link wurde erstellt."
          : "Wenn ein Konto existiert, wurde ein Reset-Link erstellt."
      });
      return result.resetUrl;
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return null;
    }
  }

  async function resetPassword(token: string, password: string) {
    setRoleSwitchStatus({ status: "saving" });

    try {
      await apiClient.resetPassword({ token, password });
      setRoleSwitchStatus({
        status: "success",
        message: "Passwort wurde aktualisiert. Bitte melde dich an."
      });
      return true;
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function acceptInvitation(token: string, password: string) {
    setRoleSwitchStatus({ status: "saving" });

    try {
      const authState = await apiClient.acceptInvitation({ token, password });
      setDemoUserState({ status: "success", data: authState });
      await loadShellData();
      setRoleSwitchStatus({
        status: "success",
        message:
          authState.authType === "session"
            ? `Willkommen, ${authState.user.name}.`
            : "Einladung konnte nicht angenommen werden."
      });
      return true;
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function createEntry(kind: DocumentKind) {
    if (!selectedWorkspaceId) {
      return null;
    }

    setSaveState({ status: "saving" });

    try {
      const existingDocuments =
        documentsState.status === "success" ? documentsState.data : [];
      const selectedDocumentId = getActiveTab(openTabsRef.current, activeTabIdRef.current)
        ?.documentId;
      const selectedDocument =
        selectedDocumentId
          ? existingDocuments.find((document) => document.id === selectedDocumentId) ??
            null
          : null;
      const parentId = selectedDocument?.parentId ?? null;
      const siblingDocuments = getSiblingDocuments(existingDocuments, parentId);
      const { title, slug } = createUniqueDocumentIdentity(existingDocuments, kind);
      const createdDocument = await apiClient.createDocument({
        workspaceId: selectedWorkspaceId,
        parentId,
        kind,
        sortOrder: siblingDocuments.length,
        title,
        slug,
        content: getInitialContentForKind(kind)
      });

      if (createdDocument.kind !== "folder") {
        activateDocument(createdDocument);
      }
      setSaveState({
        status: "success",
        message: `${formatDocumentKindLabel(
          createdDocument.kind
        )} "${createdDocument.title}" wurde angelegt.`
      });

      await loadWorkspaceData(selectedWorkspaceId);
      return createdDocument;
    } catch (error) {
      setSaveState({
        status: "error",
        message: getErrorMessage(error)
      });
      return null;
    }
  }

  async function moveDocumentInTree(
    documentId: string,
    targetDocumentId: string,
    placement: "before" | "inside" | "after"
  ) {
    if (!selectedWorkspaceId || documentsState.status !== "success") {
      return false;
    }

    if (documentId === targetDocumentId) {
      return false;
    }

    setSaveState({ status: "saving" });

    try {
      const documents = documentsState.data;
      const draggedDocument =
        documents.find((document) => document.id === documentId) ?? null;
      const targetDocument =
        documents.find((document) => document.id === targetDocumentId) ?? null;

      if (!draggedDocument || !targetDocument) {
        return false;
      }

      if (placement === "inside" && targetDocument.kind !== "folder") {
        await groupDocumentsIntoFolder(
          selectedWorkspaceId,
          documents,
          draggedDocument,
          targetDocument
        );
      } else {
        const nextParentId =
          placement === "inside" ? targetDocument.id : targetDocument.parentId;
        const destinationItems = getSiblingDocuments(documents, nextParentId)
          .filter((item) => item.id !== draggedDocument.id);
        const targetIndex =
          placement === "inside"
            ? destinationItems.length
            : destinationItems.findIndex((item) => item.id === targetDocument.id);
        const insertIndex =
          placement === "before"
            ? targetIndex
            : placement === "after"
              ? targetIndex + 1
              : destinationItems.length;
        const reorderedItems = [
          ...destinationItems.slice(0, insertIndex),
          draggedDocument,
          ...destinationItems.slice(insertIndex)
        ];

        await Promise.all(
          reorderedItems.map((item, index) =>
            apiClient.updateDocument(item.id, {
              parentId: nextParentId,
              sortOrder: index
            })
          )
        );
      }

      setSaveState({
        status: "success",
        message: `"${draggedDocument.title}" wurde verschoben.`
      });
      await loadWorkspaceData(selectedWorkspaceId);
      return true;
    } catch (error) {
      setSaveState({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function saveDocument() {
    const activeTab = getActiveTab(openTabsRef.current, activeTabIdRef.current);

    if (!activeTab || !activeTab.draft || !selectedWorkspaceId) {
      return;
    }

    setSaveState({ status: "saving" });

    try {
      const draft = activeTab.draft;
      const title = draft.title.trim() || "Untitled document";
      const slug = draft.slug.trim() || slugify(title);

      const savedDocument = draft.isNew
        ? await apiClient.createDocument({
            workspaceId: selectedWorkspaceId,
            parentId: draft.parentId,
            kind: draft.kind,
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

      updateTab(activeTab.id, {
        documentId: savedDocument.id,
        draft: mapDocumentToDraft(savedDocument),
        isDirty: false
      });
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

  function updateDraft(nextDraft: EditorDraft) {
    const activeTab = getActiveTab(openTabsRef.current, activeTabIdRef.current);

    if (!activeTab || !activeTab.draft) {
      return;
    }

    const currentDraft = activeTab.draft;
    const shouldUpdateSlug =
      currentDraft.slug === "" || currentDraft.slug === slugify(currentDraft.title);

    updateTab(activeTab.id, {
      draft: {
        ...nextDraft,
        slug:
          nextDraft.slug === currentDraft.slug && shouldUpdateSlug
            ? slugify(nextDraft.title)
            : slugify(nextDraft.slug)
      },
      isDirty: true
    });
    setSaveState({ status: "idle" });
  }

  async function renameDocumentInTree(documentId: string, title: string) {
    if (!selectedWorkspaceId || documentsState.status !== "success") {
      return false;
    }

    const nextTitle = title.trim();

    if (nextTitle === "") {
      return false;
    }

    setSaveState({ status: "saving" });

    try {
      const documents = documentsState.data;
      const currentDocument =
        documents.find((document) => document.id === documentId) ?? null;

      if (!currentDocument) {
        return false;
      }

      const nextSlug = createUniqueSlugForTitle(documents, nextTitle, documentId);
      const selectedTab = openTabsRef.current.find(
        (tab) => tab.documentId === documentId
      );
      const selectedDraft = selectedTab?.draft ?? null;
      const updatePayload = {
        title: nextTitle,
        slug: nextSlug
      } as {
        title: string;
        slug: string;
        content?: string;
      };

      if (selectedDraft) {
        updatePayload.content = selectedDraft.content;
      }

      const updatedDocument = await apiClient.updateDocument(documentId, updatePayload);

      updateTabs(
        openTabsRef.current.map((tab) =>
          tab.documentId === documentId
            ? {
                ...tab,
                draft: mapDocumentToDraft(updatedDocument),
                isDirty: false
              }
            : tab
        ),
        activeTabIdRef.current
      );

      setSaveState({
        status: "success",
        message: `"${updatedDocument.title}" wurde umbenannt.`
      });
      await loadWorkspaceData(selectedWorkspaceId);
      return true;
    } catch (error) {
      setSaveState({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function deleteDocumentInTree(documentId: string) {
    if (!selectedWorkspaceId || documentsState.status !== "success") {
      return false;
    }

    setSaveState({ status: "saving" });

    try {
      const currentDocument =
        documentsState.data.find((document) => document.id === documentId) ?? null;

      if (!currentDocument) {
        return false;
      }

      await apiClient.deleteDocument(documentId);

      closeTabsForDocument(documentId);

      setSaveState({
        status: "success",
        message: `${formatDocumentKindLabel(
          currentDocument.kind
        )} "${currentDocument.title}" wurde geloescht.`
      });
      await loadWorkspaceData(selectedWorkspaceId);
      return true;
    } catch (error) {
      setSaveState({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function toggleAddon(addonId: string) {
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

  async function createUser(input: {
    name: string;
    username: string;
    email: string;
    roleId: string;
    password: string;
    avatarUrl: string | null;
  }) {
    setUserMutationStatus({ status: "saving" });

    try {
      const createdUser = await apiClient.createUser(input);

      setUsersState((current) => {
        if (current.status !== "success") {
          return {
            status: "success",
            data: [createdUser]
          };
        }

        return {
          status: "success",
          data: [...current.data, createdUser].sort((left, right) =>
            left.name.localeCompare(right.name)
          )
        };
      });

      setUserMutationStatus({
        status: "success",
        message: `"${createdUser.name}" wurde angelegt.`
      });
      return true;
    } catch (error) {
      setUserMutationStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function updateUser(
    userId: string,
    input: {
      name?: string;
      username?: string;
      email?: string;
      roleId?: string;
      password?: string;
      avatarUrl?: string | null;
    }
  ) {
    setUserMutationStatus({ status: "saving" });

    try {
      const updatedUser = await apiClient.updateUser(userId, input);

      setUsersState((current) => {
        if (current.status !== "success") {
          return {
            status: "success",
            data: [updatedUser]
          };
        }

        return {
          status: "success",
          data: current.data
            .map((user) => (user.id === updatedUser.id ? updatedUser : user))
            .sort((left, right) => left.name.localeCompare(right.name))
        };
      });

      setUserMutationStatus({
        status: "success",
        message: `"${updatedUser.name}" wurde aktualisiert.`
      });
      return true;
    } catch (error) {
      setUserMutationStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function deleteUser(userId: string) {
    setUserMutationStatus({ status: "saving" });

    try {
      const deletedUserId = await apiClient.deleteUser(userId);

      setUsersState((current) => {
        if (current.status !== "success") {
          return current;
        }

        return {
          status: "success",
          data: current.data.filter((user) => user.id !== deletedUserId)
        };
      });

      setUserMutationStatus({
        status: "success",
        message: "Nutzer wurde entfernt."
      });
      return true;
    } catch (error) {
      setUserMutationStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  async function createInvitation(input: {
    name: string;
    username: string;
    email: string;
    roleId: string;
    avatarUrl: string | null;
  }) {
    setInvitationMutationStatus({ status: "saving" });

    try {
      const invitation = await apiClient.createInvitation(input);
      setInvitationMutationStatus({
        status: "success",
        message: `Einladung fuer "${invitation.email}" wurde erstellt.`
      });
      return invitation.acceptUrl;
    } catch (error) {
      setInvitationMutationStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return null;
    }
  }

  async function createWorkspace(input: {
    name: string;
    slug: string;
    rootPath: string;
  }) {
    setWorkspaceMutationStatus({ status: "saving" });

    try {
      const createdWorkspace = await apiClient.createWorkspace(input);

      setWorkspacesState((current) => {
        if (current.status !== "success") {
          return {
            status: "success",
            data: [createdWorkspace]
          };
        }

        return {
          status: "success",
          data: [...current.data, createdWorkspace].sort((left, right) =>
            left.name.localeCompare(right.name)
          )
        };
      });
      setSelectedWorkspaceId(createdWorkspace.id);
      setWorkspaceMutationStatus({
        status: "success",
        message: `Workspace "${createdWorkspace.name}" wurde angelegt.`
      });
      return true;
    } catch (error) {
      setWorkspaceMutationStatus({
        status: "error",
        message: getErrorMessage(error)
      });
      return false;
    }
  }

  const activeRole =
    demoUserState.status === "success" ? demoUserState.data.role?.name ?? null : null;
  const workspaces =
    workspacesState.status === "success" ? workspacesState.data : [];
  const documents =
    documentsState.status === "success" ? documentsState.data : [];
  const addons = addonsState.status === "success" ? addonsState.data : [];
  const tickets = ticketsState.status === "success" ? ticketsState.data : [];
  const addonRegistry =
    addonRegistryState.status === "success" ? addonRegistryState.data : null;
  const activeTab = getActiveTab(openTabs, activeTabId);
  const activeTabView = activeTab?.view ?? "empty";
  const selectedDocumentId =
    activeTab?.view === "document" ? activeTab.documentId ?? null : null;
  const draft = activeTab?.view === "document" ? activeTab.draft : null;
  const hasUnsavedChanges =
    activeTab?.view === "document" ? activeTab.isDirty : false;
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedDocument =
    selectedDocumentId
      ? documents.find((document) => document.id === selectedDocumentId) ?? null
      : null;
  const documentState = selectedDocument
    ? ({
        status: "success",
        data: selectedDocument
      } satisfies LoadState<Document>)
    : null;
  const tabs: WorkspaceTab[] = openTabs.map((tab) => ({
    id: tab.id,
    documentId: tab.documentId,
    kind:
      tab.view === "tickets"
        ? "tickets"
        : tab.view === "admin"
          ? "admin"
        : tab.draft?.kind ??
          documents.find((document) => document.id === tab.documentId)?.kind ??
          "document",
    view: tab.view,
    title:
      tab.view === "tickets"
        ? "Tickets"
        : tab.view === "admin"
          ? "Admin-Tools"
        : tab.draft?.title.trim() ||
          documents.find((document) => document.id === tab.documentId)?.title ||
          "Neuer Tab",
    isActive: tab.id === activeTabId,
    isDirty: tab.isDirty
  }));

  return {
    state: {
      workspacesState,
      documentsState,
      documentState,
      addonsState,
      rolesState,
      addonRegistryState,
      demoUserState,
      ticketsState,
      usersState,
      selectedWorkspaceId,
      activeTabId,
      activeTabView,
      selectedDocumentId,
      tabs,
      draft,
      hasUnsavedChanges,
      saveState,
      roleSwitchStatus,
      userMutationStatus,
      invitationMutationStatus,
      workspaceMutationStatus,
      pendingAddonId
    },
    data: {
      activeRole,
      workspaces,
      documents,
      addons,
      roles: rolesState.status === "success" ? rolesState.data : [],
      tickets,
      users: usersState.status === "success" ? usersState.data : [],
      selectedWorkspace,
      selectedDocument,
      activeAddonIds: addonRegistry?.getActiveAddonIds() ?? [],
      leftSidebarPanels: addonRegistry?.getSidebarPanels("left") ?? [],
      rightSidebarPanels: addonRegistry?.getSidebarPanels("right") ?? [],
      markdownBlockRenderers: addonRegistry?.getMarkdownBlockRenderers() ?? [],
      addonWarnings: addonRegistry?.getWarnings() ?? []
    },
    permissions: {
      mayCreateDocument: canCreateDocument(activeRole),
      mayEditDocument: canEditDocument(activeRole),
      mayDeleteDocument: canDeleteDocument(activeRole),
      mayManageAddons: canManageAddons(activeRole),
      mayCreateTicket: canCreateTicket(activeRole),
      mayManageUsers: canManageUsers(activeRole)
    },
    actions: {
      setSelectedWorkspaceId,
      setSelectedDocumentId,
      openDocumentInNewTab,
      createTab,
      openTicketsTab,
      openAdminTab,
      focusDocumentTab,
      setActiveTabId: setTabActive,
      closeTab,
      signIn,
      signOut,
      requestPasswordReset,
      resetPassword,
      acceptInvitation,
      createEntry,
      renameDocumentInTree,
      deleteDocumentInTree,
      moveDocumentInTree,
      saveDocument,
      updateDraft,
      toggleAddon,
      createUser,
      createInvitation,
      updateUser,
      deleteUser,
      createWorkspace
    }
  };

  function createTab() {
    if (!selectedWorkspaceId) {
      return;
    }

    const nextTab = createBlankTab(selectedWorkspaceId);
    updateTabs([...openTabsRef.current, nextTab], nextTab.id);
    setSaveState({ status: "idle" });
  }

  function openTicketsTab() {
    const existingTicketsTab = openTabsRef.current.find(
      (tab) => tab.view === "tickets"
    );

    if (existingTicketsTab) {
      updateTabs(openTabsRef.current, existingTicketsTab.id);
      setSaveState({ status: "idle" });
      return;
    }

    if (!selectedWorkspaceId) {
      return;
    }

    const nextTab = createTicketsTab(selectedWorkspaceId);
    updateTabs([...openTabsRef.current, nextTab], nextTab.id);
    setSaveState({ status: "idle" });
  }

  function openAdminTab() {
    const existingAdminTab = openTabsRef.current.find(
      (tab) => tab.view === "admin"
    );

    if (existingAdminTab) {
      updateTabs(openTabsRef.current, existingAdminTab.id);
      setSaveState({ status: "idle" });
      return;
    }

    if (!selectedWorkspaceId) {
      return;
    }

    const nextTab = createAdminTab(selectedWorkspaceId);
    updateTabs([...openTabsRef.current, nextTab], nextTab.id);
    setSaveState({ status: "idle" });
  }

  function focusDocumentTab() {
    const existingDocumentTab = openTabsRef.current.find(
      (tab) => tab.view === "document" || tab.view === "empty"
    );

    if (existingDocumentTab) {
      updateTabs(openTabsRef.current, existingDocumentTab.id);
      setSaveState({ status: "idle" });
      return;
    }

    if (!selectedWorkspaceId) {
      return;
    }

    const nextTab = createBlankTab(selectedWorkspaceId);
    updateTabs([...openTabsRef.current, nextTab], nextTab.id);
    setSaveState({ status: "idle" });
  }

  function setTabActive(tabId: string) {
    if (!openTabsRef.current.some((tab) => tab.id === tabId)) {
      return;
    }

    activeTabIdRef.current = tabId;
    setActiveTabId(tabId);
    setSaveState({ status: "idle" });
  }

  function closeTab(tabId: string) {
    const currentTabs = openTabsRef.current;
    const tabIndex = currentTabs.findIndex((tab) => tab.id === tabId);

    if (tabIndex === -1) {
      return;
    }

    const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);
    const nextActiveTabId =
      activeTabIdRef.current === tabId
        ? nextTabs[tabIndex]?.id ?? nextTabs[tabIndex - 1]?.id ?? null
        : activeTabIdRef.current;

    updateTabs(nextTabs, nextActiveTabId);
    setSaveState({ status: "idle" });
  }

  function activateDocument(document: Document) {
    const existingTab = openTabsRef.current.find(
      (tab) => tab.documentId === document.id
    );

    if (existingTab) {
      updateTabs(openTabsRef.current, existingTab.id);
      return;
    }

    const activeTab = getActiveTab(openTabsRef.current, activeTabIdRef.current);

    if (activeTab && activeTab.view === "empty") {
      updateTabs(
        openTabsRef.current.map((tab) =>
          tab.id === activeTab.id
            ? {
                ...tab,
                view: "document",
                workspaceId: document.workspaceId,
                documentId: document.id,
                draft: mapDocumentToDraft(document),
                isDirty: false
              }
            : tab
        ),
        activeTab.id
      );
      return;
    }

    const nextTab = createDocumentTab(document);
    updateTabs([...openTabsRef.current, nextTab], nextTab.id);
  }

  function setSelectedDocumentId(documentId: string | null) {
    if (!documentId || documentsState.status !== "success") {
      return;
    }

    const document = documentsState.data.find(
      (entry) => entry.id === documentId && entry.kind !== "folder"
    );

    if (!document) {
      return;
    }

    const activeTab = getActiveTab(openTabsRef.current, activeTabIdRef.current);

    if (!activeTab) {
      activateDocument(document);
      return;
    }

    if (activeTab.view === "tickets" || activeTab.view === "admin") {
      const nextTab = createDocumentTab(document);
      updateTabs([...openTabsRef.current, nextTab], nextTab.id);
      return;
    }

    updateTabs(
      openTabsRef.current.map((tab) =>
        tab.id === activeTab.id
          ? {
              ...tab,
              view: "document",
              workspaceId: document.workspaceId,
              documentId: document.id,
              draft: mapDocumentToDraft(document),
              isDirty: false
            }
          : tab
      ),
      activeTab.id
    );
  }

  function openDocumentInNewTab(documentId: string | null) {
    if (!documentId || documentsState.status !== "success") {
      return;
    }

    const document = documentsState.data.find(
      (entry) => entry.id === documentId && entry.kind !== "folder"
    );

    if (!document) {
      return;
    }

    const nextTab = createDocumentTab(document);
    updateTabs([...openTabsRef.current, nextTab], nextTab.id);
  }

  function updateTab(
    tabId: string,
    updates: Partial<Pick<EditorTabState, "documentId" | "draft" | "isDirty">>
  ) {
    updateTabs(
      openTabsRef.current.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              ...updates
            }
          : tab
      ),
      activeTabIdRef.current
    );
  }

  function closeTabsForDocument(documentId: string) {
    const currentTabs = openTabsRef.current;
    const nextTabs = currentTabs.filter((tab) => tab.documentId !== documentId);

    if (nextTabs.length === currentTabs.length) {
      return;
    }

    const activeTabIndex = currentTabs.findIndex(
      (tab) => tab.id === activeTabIdRef.current
    );
    const nextActiveTabId = resolveActiveTabId(
      activeTabIdRef.current,
      nextTabs,
      activeTabIndex
    );

    updateTabs(nextTabs, nextActiveTabId);
  }

  function updateTabs(nextTabs: EditorTabState[], nextActiveTabId: string | null) {
    openTabsRef.current = nextTabs;
    activeTabIdRef.current = nextActiveTabId;
    setOpenTabs(nextTabs);
    setActiveTabId(nextActiveTabId);
  }
}

type EditorTabState = {
  id: string;
  view: WorkspaceTabView;
  workspaceId: string;
  documentId: string | null;
  draft: EditorDraft | null;
  isDirty: boolean;
};

function createUniqueDocumentIdentity(
  documents: Document[],
  kind: DocumentKind,
  baseTitle =
    kind === "folder"
      ? "Neuer Ordner"
      : kind === "kanban"
        ? "Neues Kanban Board"
        : "Untitled document"
) {
  const baseSlug = slugify(baseTitle);
  const existingSlugs = new Set(documents.map((document) => document.slug));

  let index = 1;
  let title = baseTitle;
  let slug = baseSlug;

  while (existingSlugs.has(slug)) {
    index += 1;
    title = `${baseTitle} ${index}`;
    slug = `${baseSlug}-${index}`;
  }

  return { title, slug };
}

function getInitialContentForKind(kind: DocumentKind) {
  if (kind === "folder") {
    return "";
  }

  if (kind === "kanban") {
    return "## Board-Notizen\n";
  }

  return "# Neues Dokument\n";
}

function formatDocumentKindLabel(kind: DocumentKind) {
  if (kind === "folder") {
    return "Ordner";
  }

  if (kind === "kanban") {
    return "Kanban Board";
  }

  return "Dokument";
}

function createUniqueSlugForTitle(
  documents: Document[],
  title: string,
  currentDocumentId?: string
) {
  const baseSlug = slugify(title) || "untitled-document";
  const existingSlugs = new Set(
    documents
      .filter((document) => document.id !== currentDocumentId)
      .map((document) => document.slug)
  );

  let slug = baseSlug;
  let index = 2;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

function getSiblingDocuments(documents: Document[], parentId: string | null) {
  return [...documents]
    .filter((document) => document.parentId === parentId)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.title.localeCompare(right.title);
    });
}

function createDocumentTab(document: Document): EditorTabState {
  return {
    id: createTabId(),
    view: "document",
    workspaceId: document.workspaceId,
    documentId: document.id,
    draft: mapDocumentToDraft(document),
    isDirty: false
  };
}

function createBlankTab(workspaceId: string): EditorTabState {
  return {
    id: createTabId(),
    view: "empty",
    workspaceId,
    documentId: null,
    draft: null,
    isDirty: false
  };
}

function createTicketsTab(workspaceId: string): EditorTabState {
  return {
    id: createTabId(),
    view: "tickets",
    workspaceId,
    documentId: null,
    draft: null,
    isDirty: false
  };
}

function createAdminTab(workspaceId: string): EditorTabState {
  return {
    id: createTabId(),
    view: "admin",
    workspaceId,
    documentId: null,
    draft: null,
    isDirty: false
  };
}

function createInitialTabs(workspaceId: string, _documents: Document[]) {
  return [createBlankTab(workspaceId)];
}

function syncTabsForWorkspace(
  tabs: EditorTabState[],
  workspaceId: string,
  documents: Document[]
) {
  return tabs.flatMap((tab) => {
    if (tab.workspaceId !== workspaceId) {
      return [];
    }

    if (!tab.documentId) {
      return [tab];
    }

    const matchingDocument = documents.find(
      (document) => document.id === tab.documentId && document.kind !== "folder"
    );

    if (!matchingDocument) {
      return [];
    }

    if (tab.isDirty && tab.draft) {
      return [
        {
          ...tab,
          workspaceId: matchingDocument.workspaceId,
          draft: {
            ...tab.draft,
            workspaceId: matchingDocument.workspaceId,
            parentId: matchingDocument.parentId,
            kind: matchingDocument.kind
          }
        }
      ];
    }

    return [
      {
        ...tab,
        workspaceId: matchingDocument.workspaceId,
        draft: mapDocumentToDraft(matchingDocument)
      }
    ];
  });
}

function getActiveTab(tabs: EditorTabState[], activeTabId: string | null) {
  return tabs.find((tab) => tab.id === activeTabId) ?? null;
}

function resolveActiveTabId(
  preferredTabId: string | null,
  tabs: EditorTabState[],
  fallbackIndex = 0
) {
  if (preferredTabId && tabs.some((tab) => tab.id === preferredTabId)) {
    return preferredTabId;
  }

  return tabs[fallbackIndex]?.id ?? tabs[fallbackIndex - 1]?.id ?? tabs[0]?.id ?? null;
}

function createTabId() {
  return `tab-${crypto.randomUUID()}`;
}

async function groupDocumentsIntoFolder(
  workspaceId: string,
  documents: Document[],
  draggedDocument: Document,
  targetDocument: Document
) {
  const parentId = targetDocument.parentId;
  const folderIdentity = createUniqueDocumentIdentity(
    documents,
    "folder",
    `${targetDocument.title} Ordner`
  );
  const folder = await apiClient.createDocument({
    workspaceId,
    parentId,
    kind: "folder",
    sortOrder: targetDocument.sortOrder,
    title: folderIdentity.title,
    slug: folderIdentity.slug,
    content: ""
  });

  await apiClient.updateDocument(targetDocument.id, {
    parentId: folder.id,
    sortOrder: 0
  });

  await apiClient.updateDocument(draggedDocument.id, {
    parentId: folder.id,
    sortOrder: 1
  });
}
