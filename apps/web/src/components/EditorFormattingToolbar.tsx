import type { FormattingAction } from "../editor/markdown-format";

type EditorFormattingToolbarProps = {
  disabled: boolean;
  onApply: (action: FormattingAction) => void;
};

const actions: Array<{
  action: FormattingAction;
  label: string;
}> = [
  { action: "heading", label: "Ueberschrift" },
  { action: "bold", label: "Fett" },
  { action: "italic", label: "Kursiv" },
  { action: "list", label: "Liste" },
  { action: "codeblock", label: "Codeblock" }
];

export function EditorFormattingToolbar({
  disabled,
  onApply
}: EditorFormattingToolbarProps) {
  return (
    <div className="editor-formatting-toolbar">
      {actions.map((item) => (
        <button
          key={item.action}
          type="button"
          className="ghost-button small"
          disabled={disabled}
          onClick={() => onApply(item.action)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
