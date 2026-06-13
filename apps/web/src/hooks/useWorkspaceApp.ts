import { useEffect, useState } from "react";
import type {
  Addon,
  DemoAuth,
  Document,
  DocumentKind,
  Role,
  RoleName,
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
import type { LoadState, SaveState } from "../app/types";
import type { EditorDraft } from "../editor/types";
import { getErrorMessage } from "../lib/app-errors";
import {
  createEmptyDraft,
  mapDocumentToDraft,
  slugify
} from "../lib/document-draft";

export function useWorkspaceApp() {
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
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [roleSwitchStatus, setRoleSwitchStatus] = useState<SaveState>({
    status: "idle"
  });
  const [userMutationStatus, setUserMutationStatus] = useState<SaveState>({
    status: "idle"
  });
  const [workspaceMutationStatus, setWorkspaceMutationStatus] = useState<SaveState>({
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

  useEffect(() => {
    if (!selectedDocumentId) {
      setDocumentState(null);
      return;
    }

    void loadDocument(selectedDocumentId);
  }, [selectedDocumentId]);

  async function loadShellData() {
    const [
      workspacesResult,
      addonsResult,
      rolesResult,
      demoUserResult,
      usersResult
    ] =
      await Promise.allSettled([
        apiClient.getWorkspaces(),
        apiClient.getAddons(),
        apiClient.getRoles(),
        apiClient.getDemoUser(),
        apiClient.getUsers()
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

      setSelectedDocumentId((currentDocumentId) => {
        const selectedDocument =
          currentDocumentId
            ? documents.find((item) => item.id === currentDocumentId)
            : null;

        if (
          currentDocumentId &&
          selectedDocument &&
          selectedDocument.kind !== "folder"
        ) {
          return currentDocumentId;
        }

        const nextDocumentId =
          documents.find((item) => item.kind !== "folder")?.id ?? null;

        if (!nextDocumentId) {
          if (documents.length === 0) {
            setDraft(createEmptyDraft(workspaceId));
          } else {
            setDraft(null);
          }
          setHasUnsavedChanges(false);
          setDocumentState(null);
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

  async function changeRole(roleName: RoleName) {
    setRoleSwitchStatus({ status: "saving" });

    try {
      const demoUser = await apiClient.switchDemoRole(roleName);
      setDemoUserState({ status: "success", data: demoUser });
      setRoleSwitchStatus({
        status: "success",
        message:
          demoUser.authType === "demo"
            ? `Aktive Rolle ist jetzt ${demoUser.role.name}.`
            : "Demo-Session wurde aktualisiert."
      });
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
    }
  }

  async function signIn(identifier: string, password: string) {
    setRoleSwitchStatus({ status: "saving" });

    try {
      const demoAuth = await apiClient.signInDemoUser({
        identifier,
        password
      });
      setDemoUserState({ status: "success", data: demoAuth });
      setRoleSwitchStatus({
        status: "success",
        message:
          demoAuth.authType === "demo"
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
      const demoAuth = await apiClient.signOutDemoUser();
      setDemoUserState({ status: "success", data: demoAuth });
      setRoleSwitchStatus({
        status: "success",
        message: "Demo-Session wurde beendet."
      });
    } catch (error) {
      setRoleSwitchStatus({
        status: "error",
        message: getErrorMessage(error)
      });
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
        setSelectedDocumentId(createdDocument.id);
        setDocumentState({ status: "success", data: createdDocument });
        setDraft(mapDocumentToDraft(createdDocument));
        setHasUnsavedChanges(false);
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

  function updateDraft(nextDraft: EditorDraft) {
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
      const selectedDraft = draft?.id === documentId ? draft : null;
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

      if (selectedDraft?.id === documentId) {
        setDocumentState({ status: "success", data: updatedDocument });
        setDraft(mapDocumentToDraft(updatedDocument));
        setHasUnsavedChanges(false);
      }

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

      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(null);
        setDocumentState(null);
        setDraft(null);
        setHasUnsavedChanges(false);
      }

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
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedDocument =
    documentState?.status === "success" ? documentState.data : null;

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
      selectedDocumentId,
      draft,
      hasUnsavedChanges,
      saveState,
      roleSwitchStatus,
      userMutationStatus,
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
      signIn,
      changeRole,
      signOut,
      createEntry,
      renameDocumentInTree,
      deleteDocumentInTree,
      moveDocumentInTree,
      saveDocument,
      updateDraft,
      toggleAddon,
      createUser,
      updateUser,
      deleteUser,
      createWorkspace
    }
  };
}

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
