import { useState } from "react";
import type { DragEvent } from "react";
import type { SidebarItem } from "../../app/types";

type SidebarTreeItemProps = {
  collapsedFolderIds: string[];
  draggedDocumentId: string | null;
  editingItemId: string | null;
  editingTitle: string;
  item: SidebarItem;
  selectedDocumentId: string | null;
  onDocumentMove: (
    documentId: string,
    targetDocumentId: string,
    placement: "before" | "inside" | "after"
  ) => void;
  onContextMenu: (item: SidebarItem, x: number, y: number) => void;
  onDragEnd: () => void;
  onDragStart: (documentId: string) => void;
  onEditingTitleChange: (title: string) => void;
  onFolderToggle: (folderId: string) => void;
  onRenameCancel: () => void;
  onRenameCommit: (item: SidebarItem) => void;
  onSelect: (documentId: string) => void;
};

export function SidebarTreeItem({
  collapsedFolderIds,
  draggedDocumentId,
  editingItemId,
  editingTitle,
  item,
  selectedDocumentId,
  onDocumentMove,
  onContextMenu,
  onDragEnd,
  onDragStart,
  onEditingTitleChange,
  onFolderToggle,
  onRenameCancel,
  onRenameCommit,
  onSelect
}: SidebarTreeItemProps) {
  const [activeDropPlacement, setActiveDropPlacement] = useState<
    "before" | "inside" | "after" | null
  >(null);
  const isFolder = item.kind === "folder";
  const isCollapsed = isFolder && collapsedFolderIds.includes(item.id);
  const isEditing = editingItemId === item.id;
  const isSelected = item.documentId === selectedDocumentId;
  const isDraggable = Boolean(item.documentId) && item.kind === "document" && !item.disabled;
  const className = [
    isFolder ? "tree-folder-button" : "tree-document-item",
    isSelected ? "active" : "",
    activeDropPlacement === "inside" ? "drag-over" : "",
    item.disabled ? "placeholder" : ""
  ]
    .filter(Boolean)
    .join(" ");

  function allowDrop(
    event: DragEvent<HTMLElement>,
    placement: "before" | "inside" | "after"
  ) {
    if (!draggedDocumentId || draggedDocumentId === item.id) {
      return;
    }

    event.preventDefault();
    setActiveDropPlacement(placement);
  }

  function handleDrop(
    event: DragEvent<HTMLElement>,
    placement: "before" | "inside" | "after"
  ) {
    if (!draggedDocumentId || draggedDocumentId === item.id) {
      setActiveDropPlacement(null);
      return;
    }

    event.preventDefault();
    setActiveDropPlacement(null);
    onDocumentMove(draggedDocumentId, item.id, placement);
  }

  return (
    <div className="tree-item">
      <div
        className={
          activeDropPlacement === "before"
            ? "tree-drop-indicator active"
            : "tree-drop-indicator"
        }
        onDragOver={(event) => allowDrop(event, "before")}
        onDragLeave={() => setActiveDropPlacement(null)}
        onDrop={(event) => handleDrop(event, "before")}
      />

      {isFolder ? (
        isEditing ? (
          <div className={className}>
            <span className="tree-chevron">{isCollapsed ? ">" : "v"}</span>
            <span className="tree-folder-icon">#</span>
            <input
              className="tree-item-input"
              autoFocus
              value={editingTitle}
              onBlur={() => onRenameCommit(item)}
              onChange={(event) => onEditingTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onRenameCommit(item);
                }

                if (event.key === "Escape") {
                  onRenameCancel();
                }
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className={className}
            onClick={() => onFolderToggle(item.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              onContextMenu(item, event.clientX, event.clientY);
            }}
            onDragOver={(event) => allowDrop(event, "inside")}
            onDragLeave={() => setActiveDropPlacement(null)}
            onDrop={(event) => handleDrop(event, "inside")}
          >
            <span className="tree-chevron">{isCollapsed ? ">" : "v"}</span>
            <span className="tree-folder-icon">#</span>
            <span>{item.title}</span>
          </button>
        )
      ) : item.documentId ? (
        isEditing ? (
          <div className={className}>
            <span className="tree-document-icon">[]</span>
            <input
              className="tree-item-input"
              autoFocus
              value={editingTitle}
              onBlur={() => onRenameCommit(item)}
              onChange={(event) => onEditingTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onRenameCommit(item);
                }

                if (event.key === "Escape") {
                  onRenameCancel();
                }
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            draggable={isDraggable}
            className={className}
            onClick={() => onSelect(item.documentId!)}
            onContextMenu={(event) => {
              event.preventDefault();
              onContextMenu(item, event.clientX, event.clientY);
            }}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              onDragStart(item.documentId!);
            }}
            onDragEnd={onDragEnd}
            onDragOver={(event) => allowDrop(event, "inside")}
            onDragLeave={() => setActiveDropPlacement(null)}
            onDrop={(event) => handleDrop(event, "inside")}
          >
            <span className="tree-document-icon">[]</span>
            <span>{item.title}</span>
          </button>
        )
      ) : (
        <div className="tree-document-item placeholder">
          <span className="tree-document-icon">[]</span>
          <span>{item.title}</span>
        </div>
      )}

      {!isCollapsed && item.children && item.children.length > 0 && (
        <div className="tree-item-children">
          {item.children.map((child) => (
            <SidebarTreeItem
              key={child.id}
              collapsedFolderIds={collapsedFolderIds}
              draggedDocumentId={draggedDocumentId}
              editingItemId={editingItemId}
              editingTitle={editingTitle}
              item={child}
              selectedDocumentId={selectedDocumentId}
              onDocumentMove={onDocumentMove}
              onContextMenu={onContextMenu}
              onDragEnd={onDragEnd}
              onDragStart={onDragStart}
              onEditingTitleChange={onEditingTitleChange}
              onFolderToggle={onFolderToggle}
              onRenameCancel={onRenameCancel}
              onRenameCommit={onRenameCommit}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      <div
        className={
          activeDropPlacement === "after"
            ? "tree-drop-indicator active"
            : "tree-drop-indicator"
        }
        onDragOver={(event) => allowDrop(event, "after")}
        onDragLeave={() => setActiveDropPlacement(null)}
        onDrop={(event) => handleDrop(event, "after")}
      />
    </div>
  );
}
