import { useEffect, useRef, useState } from "react";
import type { DocumentKind } from "@plainbase/shared";

type CreateObjectMenuButtonProps = {
  ariaLabel: string;
  className: string;
  disabled?: boolean;
  label: string;
  onSelect: (kind: DocumentKind) => void;
};

export function CreateObjectMenuButton({
  ariaLabel,
  className,
  disabled = false,
  label,
  onSelect
}: CreateObjectMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        shellRef.current &&
        event.target instanceof Node &&
        !shellRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(kind: DocumentKind) {
    onSelect(kind);
    setIsOpen(false);
  }

  return (
    <div className="create-object-menu-shell" ref={shellRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={className}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        {label}
      </button>

      {isOpen && (
        <div className="create-object-menu" role="menu">
          <button
            type="button"
            className="create-object-menu-button"
            role="menuitem"
            onClick={() => handleSelect("document")}
          >
            Dokument
          </button>
          <button
            type="button"
            className="create-object-menu-button"
            role="menuitem"
            onClick={() => handleSelect("kanban")}
          >
            Kanban Board
          </button>
          <button
            type="button"
            className="create-object-menu-button"
            role="menuitem"
            onClick={() => handleSelect("folder")}
          >
            Ordner
          </button>
        </div>
      )}
    </div>
  );
}
