import { useEffect, useState } from "react";
import type {
  Addon,
  DemoUser,
  Document,
  Role,
  RoleName,
  Ticket,
  Workspace
} from "@plainbase/shared";
import {
  canCreateDocument,
  canCreateTicket,
  canEditDocument,
  canManageAddons
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

  async function changeRole(roleName: RoleName) {
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

  function createDocumentDraft() {
    if (!selectedWorkspaceId) {
      return;
    }

    setSelectedDocumentId(null);
    setDocumentState(null);
    setDraft(createEmptyDraft(selectedWorkspaceId));
    setHasUnsavedChanges(false);
    setSaveState({ status: "idle" });
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

  const activeRole =
    demoUserState.status === "success" ? demoUserState.data.role.name : null;
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
      selectedWorkspaceId,
      selectedDocumentId,
      draft,
      hasUnsavedChanges,
      saveState,
      roleSwitchStatus,
      pendingAddonId
    },
    data: {
      activeRole,
      workspaces,
      documents,
      addons,
      tickets,
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
      mayManageAddons: canManageAddons(activeRole),
      mayCreateTicket: canCreateTicket(activeRole)
    },
    actions: {
      setSelectedWorkspaceId,
      setSelectedDocumentId,
      changeRole,
      createDocumentDraft,
      saveDocument,
      updateDraft,
      toggleAddon
    }
  };
}
