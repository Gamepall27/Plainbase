export function htmlToMarkdown(root: HTMLElement) {
  return Array.from(root.childNodes)
    .map((node) => blockToMarkdown(node))
    .filter((line) => line.trim().length > 0)
    .join("\n\n");
}

function blockToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return readText(node);
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();

  if (/^h[1-6]$/.test(tagName)) {
    const level = Number(tagName.slice(1));

    return `${"#".repeat(level)} ${inlineToMarkdown(node)}`.trim();
  }

  if (tagName === "ul") {
    return Array.from(node.children)
      .map((child) => `- ${inlineToMarkdown(child)}`.trim())
      .join("\n");
  }

  if (tagName === "ol") {
    return Array.from(node.children)
      .map((child, index) => `${index + 1}. ${inlineToMarkdown(child)}`.trim())
      .join("\n");
  }

  if (tagName === "blockquote") {
    return inlineToMarkdown(node)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (tagName === "pre") {
    return ["```text", node.textContent?.trim() ?? "", "```"].join("\n");
  }

  if (tagName === "section" && node.classList.contains("addon-renderer-block")) {
    return node.textContent?.trim() ?? "";
  }

  return inlineToMarkdown(node);
}

function inlineToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return readText(node);
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes)
    .map((child) => inlineToMarkdown(child))
    .join("");

  if (tagName === "strong" || tagName === "b") {
    return `**${children}**`;
  }

  if (tagName === "em" || tagName === "i") {
    return `*${children}*`;
  }

  if (tagName === "code") {
    return `\`${node.textContent ?? ""}\``;
  }

  if (tagName === "br") {
    return "\n";
  }

  if (tagName === "li") {
    return children.trim();
  }

  return children;
}

function readText(node: Node) {
  return node.textContent?.replace(/\u00a0/g, " ") ?? "";
}
