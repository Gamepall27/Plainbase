import { useEffect, useRef, useState } from "react";

type AnimatedCreateTabButtonProps = {
  onCreateTab: () => void;
};

export function AnimatedCreateTabButton({
  onCreateTab
}: AnimatedCreateTabButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleCreateTab() {
    if (isAnimating) {
      return;
    }

    setIsAnimating(true);
    setIsExpanded(false);

    frameRef.current = window.requestAnimationFrame(() => {
      setIsExpanded(true);
    });

    timeoutRef.current = window.setTimeout(() => {
      onCreateTab();
      setIsExpanded(false);
      setIsAnimating(false);
    }, 220);
  }

  if (isAnimating) {
    return (
      <div
        className={
          isExpanded
            ? "document-tab document-tab-ghost active is-expanded"
            : "document-tab document-tab-ghost active"
        }
        aria-hidden="true"
      >
        <span className="document-tab-plus-symbol">+</span>
        <span className="document-tab-title">Neuer Tab</span>
        <span className="document-tab-close">x</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Neuen Tab anlegen"
      className="document-tab-add"
      onClick={handleCreateTab}
    >
      +
    </button>
  );
}
