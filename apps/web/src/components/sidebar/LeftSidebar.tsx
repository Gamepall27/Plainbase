import { useEffect, useState } from "react";
import type { DocumentKind } from "@plainbase/shared";
import type { SidebarPanelContext, SidebarPanelExtension } from "@plainbase/addon-sdk";
import type { Addon, Document, Ticket, Workspace } from "@plainbase/shared";
import type { ReactNode } from "react";
import type { LoadState, MainView, QuickLinkId, SidebarFolder } from "../../app/types";
import { quickLinks } from "../../lib/sidebar-model";
import { CreateObjectMenuButton } from "../layout/CreateObjectMenuButton";
import { SidebarTreeItem } from "./SidebarTreeItem";

type LeftSidebarProps = {
  activeMainView: MainView;
  addonPanelContext: SidebarPanelContext;
  addons: Addon[];
  documentsState: LoadState<Document[]>;
  documentFolders: SidebarFolder[];
  leftSidebarPanels: SidebarPanelExtension<ReactNode>[];
  mayCreateDocument: boolean;
  mayDeleteDocument: boolean;
  mayEditDocument: boolean;
  mayManageAddons: boolean;
  pendingAddonId: string | null;
  selectedDocumentId: string | null;
  selectedWorkspaceId: string | null;
  tickets: Ticket[];
  workspacesState: LoadState<Workspace[]>;
  onAddonToggle: (addonId: string) => void;
  onDocumentMove: (
    documentId: string,
    targetDocumentId: string,
    placement: "before" | "inside" | "after"
  ) => void;
  onDocumentDelete: (documentId: string) => Promise<boolean>;
  onDocumentRename: (documentId: string, title: string) => Promise<boolean>;
  onDocumentSelect: (documentId: string) => void;
  onCreateEntry: (kind: DocumentKind) => void;
  onOpenSettings: () => void;
  onQuickLinkSelect: (linkId: QuickLinkId) => void;
  onWorkspaceSelect: (workspaceId: string) => void;
};

export function LeftSidebar({
  activeMainView,
  addonPanelContext,
  addons,
  documentsState,
  documentFolders,
  leftSidebarPanels,
  mayCreateDocument,
  mayDeleteDocument,
  mayEditDocument,
  mayManageAddons,
  pendingAddonId,
  selectedDocumentId,
  selectedWorkspaceId,
  tickets,
  workspacesState,
  onAddonToggle,
  onDocumentDelete,
  onDocumentMove,
  onDocumentRename,
  onDocumentSelect,
  onCreateEntry,
  onOpenSettings,
  onQuickLinkSelect,
  onWorkspaceSelect
}: LeftSidebarProps) {
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    item: SidebarFolder["items"][number];
    x: number;
    y: number;
  } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isWorkspaceDocumentsCollapsed, setIsWorkspaceDocumentsCollapsed] =
    useState(false);

  useEffect(() => {
    const storageKey = `plainbase-collapsed-folders:${selectedWorkspaceId ?? "default"}`;
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      setCollapsedFolderIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as string[];
      setCollapsedFolderIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCollapsedFolderIds([]);
    }
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const storageKey = `plainbase-collapsed-folders:${selectedWorkspaceId ?? "default"}`;
    window.localStorage.setItem(storageKey, JSON.stringify(collapsedFolderIds));
  }, [collapsedFolderIds, selectedWorkspaceId]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function handlePointerDown() {
      setContextMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    setContextMenu(null);
    setEditingItemId(null);
  }, [selectedWorkspaceId]);

  function toggleFolder(folderId: string) {
    setCollapsedFolderIds((current) =>
      current.includes(folderId)
        ? current.filter((item) => item !== folderId)
        : [...current, folderId]
    );
  }

  async function handleDeleteCurrentItem() {
    if (!contextMenu?.item.documentId) {
      return;
    }

    const deleted = await onDocumentDelete(contextMenu.item.documentId);

    if (deleted) {
      setContextMenu(null);
    }
  }

  function handleStartRename(item: SidebarFolder["items"][number]) {
    setContextMenu(null);
    setEditingItemId(item.id);
    setEditingTitle(item.title);
  }

  async function handleRenameCommit(item: SidebarFolder["items"][number]) {
    if (!item.documentId) {
      setEditingItemId(null);
      return;
    }

    const renamed = await onDocumentRename(item.documentId, editingTitle);

    if (renamed) {
      setEditingItemId(null);
      setEditingTitle("");
    }
  }

  return (
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
            onChange={(event) => onWorkspaceSelect(event.target.value)}
          >
            {workspacesState.data.map((workspace) => (
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
            <button
              key={link.id}
              type="button"
              className={
                (link.id === "tickets" && activeMainView === "tickets") ||
                (link.id === "all-documents" && activeMainView === "document")
                  ? "left-nav-link active"
                  : "left-nav-link"
              }
              onClick={() => onQuickLinkSelect(link.id)}
            >
              <span className="left-nav-link-icon">+</span>
              <span>{link.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="left-panel-card">
        <div className="section-heading-row">
          <p className="rail-heading">Objekte</p>
          <CreateObjectMenuButton
            ariaLabel="Neues Objekt anlegen"
            className="tree-action-button"
            disabled={!mayCreateDocument}
            label="+"
            onSelect={onCreateEntry}
          />
        </div>

        {documentsState.status === "loading" && <p>Lade Dokumente...</p>}
        {documentsState.status === "error" && (
          <p className="feedback error">{documentsState.message}</p>
        )}
        {documentsState.status === "success" && (
          <div className="sidebar-tree">
            {documentFolders.length === 0 && (
              <p className="sidebar-copy">
                Noch keine Objekte vorhanden. Erstelle dein erstes Objekt ueber `+`.
              </p>
            )}
            {documentFolders.map((folder) => (
              <div key={folder.id} className="tree-folder">
                <button
                  type="button"
                  className="tree-folder-label tree-folder-label-button"
                  onClick={() =>
                    setIsWorkspaceDocumentsCollapsed((current) => !current)
                  }
                >
                  <span className="tree-chevron">
                    {isWorkspaceDocumentsCollapsed ? ">" : "v"}
                  </span>
                  <span>{folder.title}</span>
                </button>
                {!isWorkspaceDocumentsCollapsed && (
                  <div className="tree-folder-content">
                    {folder.items.map((item) => (
                      <SidebarTreeItem
                        key={item.id}
                        collapsedFolderIds={collapsedFolderIds}
                        draggedDocumentId={draggedDocumentId}
                        editingItemId={editingItemId}
                        editingTitle={editingTitle}
                        item={item}
                        selectedDocumentId={selectedDocumentId}
                        onDocumentMove={onDocumentMove}
                        onContextMenu={(contextItem, x, y) =>
                          setContextMenu({ item: contextItem, x, y })
                        }
                        onDragEnd={() => setDraggedDocumentId(null)}
                        onDragStart={setDraggedDocumentId}
                        onEditingTitleChange={setEditingTitle}
                        onFolderToggle={toggleFolder}
                        onRenameCancel={() => {
                          setEditingItemId(null);
                          setEditingTitle("");
                        }}
                        onRenameCommit={handleRenameCommit}
                        onSelect={onDocumentSelect}
                      />
                    ))}
                  </div>
                )}
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
                onChange={() => onAddonToggle(addon.id)}
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

      <button type="button" className="settings-button" onClick={onOpenSettings}>
        Einstellungen
      </button>

      {contextMenu && (
        <div
          className="tree-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {mayEditDocument && (
            <button
              type="button"
              className="tree-context-menu-button"
              onClick={() => handleStartRename(contextMenu.item)}
            >
              Umbenennen
            </button>
          )}
          {mayDeleteDocument && (
            <button
              type="button"
              className="tree-context-menu-button tree-context-menu-button-danger"
              onClick={() => void handleDeleteCurrentItem()}
            >
              Loeschen
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
