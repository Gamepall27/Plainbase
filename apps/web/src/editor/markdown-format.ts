export type FormattingAction =
  | "heading"
  | "bold"
  | "italic"
  | "list"
  | "codeblock";

type FormatResult = {
  content: string;
  selectionStart: number;
  selectionEnd: number;
};

export function applyFormatting(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  action: FormattingAction
) {
  switch (action) {
    case "heading":
      return insertHeading(content, selectionStart, selectionEnd);
    case "bold":
      return wrapSelection(content, selectionStart, selectionEnd, "**", "**", "fetter Text");
    case "italic":
      return wrapSelection(content, selectionStart, selectionEnd, "*", "*", "kursiver Text");
    case "list":
      return insertList(content, selectionStart, selectionEnd);
    case "codeblock":
      return wrapSelection(
        content,
        selectionStart,
        selectionEnd,
        "```text\n",
        "\n```",
        "Code hier"
      );
  }
}

function insertHeading(
  content: string,
  selectionStart: number,
  selectionEnd: number
): FormatResult {
  const lineStart = content.lastIndexOf("\n", Math.max(selectionStart - 1, 0)) + 1;
  const selected = content.slice(selectionStart, selectionEnd).trim();
  const headingText = selected || "Neue Ueberschrift";
  const prefix = content.slice(0, lineStart);
  const suffix = content.slice(selectionEnd);
  const replacement = `# ${headingText}`;

  return {
    content: `${prefix}${replacement}${suffix}`,
    selectionStart: lineStart + 2,
    selectionEnd: lineStart + replacement.length
  };
}

function insertList(
  content: string,
  selectionStart: number,
  selectionEnd: number
) {
  const selected = content.slice(selectionStart, selectionEnd).trim();

  if (selected.length === 0) {
    return replaceSelection(
      content,
      selectionStart,
      selectionEnd,
      "- Eintrag 1\n- Eintrag 2",
      2,
      10
    );
  }

  const prefixed = selected
    .split(/\r?\n/)
    .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
    .join("\n");

  return replaceSelection(
    content,
    selectionStart,
    selectionEnd,
    prefixed,
    0,
    prefixed.length
  );
}

function wrapSelection(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  fallbackText: string
) {
  const selected = content.slice(selectionStart, selectionEnd);
  const value = selected || fallbackText;
  const replacement = `${before}${value}${after}`;
  const selectionOffset = selected ? before.length : before.length;
  const selectionLength = value.length;

  return replaceSelection(
    content,
    selectionStart,
    selectionEnd,
    replacement,
    selectionOffset,
    selectionOffset + selectionLength
  );
}

function replaceSelection(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  replacement: string,
  relativeSelectionStart: number,
  relativeSelectionEnd: number
): FormatResult {
  const nextContent =
    content.slice(0, selectionStart) +
    replacement +
    content.slice(selectionEnd);

  return {
    content: nextContent,
    selectionStart: selectionStart + relativeSelectionStart,
    selectionEnd: selectionStart + relativeSelectionEnd
  };
}
