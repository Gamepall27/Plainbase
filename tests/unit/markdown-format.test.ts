import assert from "node:assert/strict";
import test from "node:test";
import { applyFormatting } from "../../apps/web/src/editor/markdown-format.ts";

test("applyFormatting inserts headings at the current line", () => {
  const result = applyFormatting("Plainbase", 0, "Plainbase".length, "heading");

  assert.equal(result.content, "# Plainbase");
  assert.equal(result.selectionStart, 2);
  assert.equal(result.selectionEnd, "# Plainbase".length);
});

test("applyFormatting creates list and code block fallbacks", () => {
  const listResult = applyFormatting("", 0, 0, "list");
  assert.equal(listResult.content, "- Eintrag 1\n- Eintrag 2");

  const codeResult = applyFormatting("", 0, 0, "codeblock");
  assert.equal(codeResult.content, "```text\nCode hier\n```");
});

test("applyFormatting wraps selected text for bold and italic", () => {
  const boldResult = applyFormatting("Wichtig", 0, 7, "bold");
  assert.equal(boldResult.content, "**Wichtig**");

  const italicResult = applyFormatting("Text", 0, 4, "italic");
  assert.equal(italicResult.content, "*Text*");
});
