import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import baseline from "./kit-only-ui-baseline.json";

/**
 * Every piece of UI comes from the UI kit, nothing invented (owner: "Every
 * single piece of UI, not just the menu, needs to come from the UI kit.
 * Every single piece, nothing invented"; screen-to-mock skill). The kit lives
 * in src/bench/ui/. A file anywhere else under src/bench that builds markup
 * itself (calls `el(` or `createElement(`, sets `innerHTML` to markup, calls
 * `insertAdjacentHTML`, or writes an HTML tag in a template literal) is
 * drawing a screen outside the kit.
 *
 * What was already there is counted by file in kit-only-ui-baseline.json; a
 * count may only go down, and a file reaching zero leaves the list. Move the
 * piece into a kit part (or use one) instead of raising a count.
 */

const ROOT = path.resolve(__dirname, "../..");

/** Shipped bench code outside the kit. Browser checks and tests are not UI. */
export function isScreenCode(file: string): boolean {
  return (
    /^src\/bench\/.*\.(mjs|js|ts|tsx)$/.test(file) &&
    !file.startsWith("src/bench/ui/") &&
    !/\.(test|spec)\.(mjs|js|ts|tsx)$/.test(file) &&
    !/\.browser\.mjs$/.test(file) &&
    !/\.d\.m?ts$/.test(file)
  );
}

const TAG =
  "(?:div|span|p|button|section|article|header|footer|nav|main|aside|ul|ol|li|h[1-6]|img|a|table|thead|tbody|tr|td|th|label|input|select|option|textarea|svg|strong|em|small|figure|canvas|dl|dt|dd|br|hr)";

const SHAPES: readonly { name: string; pattern: RegExp }[] = [
  { name: "el(", pattern: /(?<![\w.$])el\(/g },
  { name: "createElement(", pattern: /\bcreateElement(?:NS)?\(/g },
  {
    name: "innerHTML markup",
    pattern: /\b(?:inner|outer)HTML\s*\+?=\s*[`"'][^\n]*</g,
  },
  { name: "insertAdjacentHTML", pattern: /\binsertAdjacentHTML\(/g },
  {
    name: "HTML in a template literal",
    pattern: new RegExp(`\`[^\`]*<${TAG}[\\s>/]`, "g"),
  },
];

/** Markup-building calls in one file's source, comments removed. */
export function markupCount(source: string): number {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
    // The kit's own definition of `el`, if a file re-exports it, is not a use.
    .replace(/function el\(/g, "");
  return SHAPES.reduce(
    (sum, { pattern }) => sum + (code.match(pattern)?.length ?? 0),
    0,
  );
}

function counts(): Map<string, number> {
  const files = execFileSync("git", ["ls-files", "src/bench"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(isScreenCode);
  const out = new Map<string, number>();
  for (const file of files) {
    const n = markupCount(readFileSync(path.join(ROOT, file), "utf8"));
    if (n > 0) out.set(file, n);
  }
  return out;
}

describe("UI comes only from the kit", () => {
  const found = counts();
  const known = baseline as Record<string, number>;

  it("builds no new markup outside src/bench/ui/", () => {
    const over = [...found]
      .filter(([file, n]) => n > (known[file] ?? 0))
      .map(
        ([file, n]) =>
          `${file}: ${n} markup builders, ${known[file] ?? 0} known. Use or add a kit part in src/bench/ui/.`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a known count as soon as a piece moves into the kit", () => {
    const stale = Object.entries(known)
      .filter(([file, n]) => (found.get(file) ?? 0) < n)
      .map(
        ([file, n]) =>
          `${file}: lower ${n} to ${found.get(file) ?? 0} in tests/guards/kit-only-ui-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("catches each shape and leaves kit calls alone", () => {
    for (const source of [
      'const box = el("div", { class: "x" });',
      'const n = document.createElement("span");',
      "node.innerHTML = `<p>${text}</p>`;",
      'node.insertAdjacentHTML("beforeend", html);',
      'const html = `<div class="row">${name}</div>`;',
    ])
      expect(markupCount(source), source).toBeGreaterThan(0);
    for (const source of [
      "const row = listRow({ label, value });",
      "const n = model.el(3);",
      'node.textContent = "<not markup>";',
      '// el("div") in a comment',
      "const a = `${x} < ${y}`;",
    ])
      expect(markupCount(source), source).toBe(0);
  });
});
