import type { SidebarPanelContext, SidebarPanelExtension } from "@plainbase/addon-sdk";
import type { Addon, Document, Ticket, Workspace } from "@plainbase/shared";
import type { ReactNode } from "react";
import type { LoadState, SidebarFolder } from "../../app/types";
import { quickLinks } from "../../lib/sidebar-model";
import { SidebarTreeItem } from "./SidebarTreeItem";

type LeftSidebarProps = {
  addonPanelContext: SidebarPanelContext;
  addons: Addon[];
  documentsState: LoadState<Document[]>;
  documentFolders: SidebarFolder[];
  leftSidebarPanels: SidebarPanelExtension<ReactNode>[];
  mayCreateDocument: boolean;
  mayManageAddons: boolean;
  pendingAddonId: string | null;
  selectedDocumentId: string | null;
  selectedWorkspaceId: string | null;
  tickets: Ticket[];
  workspacesState: LoadState<Workspace[]>;
  onAddonToggle: (addonId: string) => void;
  onDocumentSelect: (documentId: string) => void;
  onNewDocument: () => void;
  onOpenSettings: () => void;
  onWorkspaceSelect: (workspaceId: string) => void;
};

export function LeftSidebar({
  addonPanelContext,
  addons,
  documentsState,
  documentFolders,
  leftSidebarPanels,
  mayCreateDocument,
  mayManageAddons,
  pendingAddonId,
  selectedDocumentId,
  selectedWorkspaceId,
  tickets,
  workspacesState,
  onAddonToggle,
  onDocumentSelect,
  onNewDocument,
  onOpenSettings,
  onWorkspaceSelect
}: LeftSidebarProps) {
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
            <button key={link} type="button" className="left-nav-link">
              <span className="left-nav-link-icon">+</span>
              <span>{link}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="left-panel-card">
        <div className="section-heading-row">
          <p className="rail-heading">Objekte</p>
          <button
            type="button"
            className="tree-action-button"
            onClick={onNewDocument}
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
            {documentFolders.length === 0 && (
              <p className="sidebar-copy">
                Noch keine Objekte vorhanden. Erstelle dein erstes Objekt ueber `+`.
              </p>
            )}
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
                      onSelect={onDocumentSelect}
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
    </aside>
  );
}
