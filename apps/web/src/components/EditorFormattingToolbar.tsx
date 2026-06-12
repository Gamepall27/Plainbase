import type { FormattingAction } from "../editor/markdown-format";

type EditorFormattingToolbarProps = {
  disabled: boolean;
  onApply: (action: FormattingAction) => void;
};

const actions: Array<{
  action: FormattingAction;
  label: string;
  title: string;
}> = [
  { action: "heading", label: "H1", title: "Ueberschrift" },
  { action: "bold", label: "B", title: "Fett" },
  { action: "italic", label: "I", title: "Kursiv" },
  { action: "list", label: "List", title: "Liste" },
  { action: "codeblock", label: "</>", title: "Codeblock" }
];

const staticActions = ["Link", "Bild"];

export function EditorFormattingToolbar({
  disabled,
  onApply
}: EditorFormattingToolbarProps) {
  return (
    <div className="editor-formatting-toolbar">
      <span className="toolbar-mode-label">Preview bearbeiten</span>
      {actions.map((item) => (
        <button
          key={item.action}
          type="button"
          className="format-icon-button"
          disabled={disabled}
          onClick={() => onApply(item.action)}
          title={item.title}
        >
          {item.label}
        </button>
      ))}

      <span className="toolbar-divider" />

      {staticActions.map((label) => (
        <button
          key={label}
          type="button"
          className="format-icon-button muted"
          disabled
          title={label}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
