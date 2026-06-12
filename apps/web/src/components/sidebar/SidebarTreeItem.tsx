import type { SidebarItem } from "../../app/types";

type SidebarTreeItemProps = {
  item: SidebarItem;
  selectedDocumentId: string | null;
  onSelect: (documentId: string) => void;
};

export function SidebarTreeItem({
  item,
  selectedDocumentId,
  onSelect
}: SidebarTreeItemProps) {
  const isSelected = item.documentId === selectedDocumentId;
  const className = isSelected ? "tree-document-item active" : "tree-document-item";

  return (
    <div className="tree-item">
      {item.documentId ? (
        <button
          type="button"
          className={className}
          onClick={() => onSelect(item.documentId!)}
        >
          <span className="tree-document-icon">[]</span>
          <span>{item.title}</span>
        </button>
      ) : (
        <div className="tree-document-item placeholder">
          <span className="tree-document-icon">[]</span>
          <span>{item.title}</span>
        </div>
      )}

      {item.children && item.children.length > 0 && (
        <div className="tree-item-children">
          {item.children.map((child) => (
            <SidebarTreeItem
              key={child.id}
              item={child}
              selectedDocumentId={selectedDocumentId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
