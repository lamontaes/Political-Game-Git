import { readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * One screen renderer per menu type (owner, Oct 27, AGENTS.md): every list
 * beside its detail is `rosterScreen` (src/bench/ui/roster-screen.mjs), and
 * every bar of tabs is `tabBar` (src/bench/ui/tab.mjs). A second list part or
 * a hand-built tab nav is a duplicate (play-six-list-and-detail-screens-
 * build-their-own). The Calendar's month and Travel's picture tiles are not a
 * list beside a page and keep their own parts (Fable B, Nov 11).
 *
 * Shapes it refuses, in shipped bench code outside the file that owns them:
 * - a pick list nav (`el("nav", { className: "pick-list ...` ), the roster's own list;
 * - a tab nav (`el("nav", { className: "... tab-rail` or `"tabs`), the tab bar's own;
 * - a tab made one by one (`makeTab(`), which only the tab bar builds.
 */

const ROOT = path.resolve(__dirname, "../..");
const BENCH = path.join(ROOT, "src/bench");

const RULES: readonly { name: string; owner: string; pattern: RegExp }[] = [
  {
    name: "a second list-beside-detail part (a pick list nav)",
    owner: "src/bench/ui/roster-screen.mjs",
    pattern: /el\(\s*"nav"\s*,\s*\{\s*className:\s*[`"'][^`"']*\bpick-list\b/g,
  },
  {
    name: "a hand-built tab nav",
    owner: "src/bench/ui/tab.mjs",
    pattern:
      /el\(\s*"nav"\s*,\s*\{\s*className:\s*[`"'][^`"']*\b(?:tab-rail|tabs)\b/g,
  },
  {
    name: "a tab made outside the tab bar",
    owner: "src/bench/ui/tab.mjs",
    pattern: /(?<![\w.$])makeTab\(/g,
  },
];

/** Shipped bench code: not tests or browser checks. */
function screenFiles(dir = BENCH): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "node_modules" ? [] : screenFiles(full);
    return /\.(mjs|js|ts)$/.test(entry.name) &&
      !/\.(test|spec)\.(mjs|js|ts)$/.test(entry.name) &&
      !/\.browser\.mjs$/.test(entry.name) &&
      !/\.d\.m?ts$/.test(entry.name)
      ? [path.relative(ROOT, full).split(path.sep).join("/")]
      : [];
  });
}

/** Every place a rule's shape appears outside its owner, as "file: shape". */
export function duplicates(
  files: readonly { file: string; text: string }[],
): string[] {
  return files.flatMap(({ file, text }) =>
    RULES.filter(
      (rule) => file !== rule.owner && (text.match(rule.pattern)?.length ?? 0),
    ).map((rule) => `${file}: ${rule.name}`),
  );
}

describe("one list-beside-detail part and one tab bar", () => {
  it("no screen builds its own list beside a detail or its own tabs", () => {
    const files = screenFiles().map((file) => ({
      file,
      text: readFileSync(path.join(ROOT, file), "utf8"),
    }));
    expect(files.length).toBeGreaterThan(20);
    expect(duplicates(files)).toEqual([]);
  });

  it("fails on a second list part or a hand-built tab nav in a test copy", () => {
    const copy = (text: string) => [{ file: "src/bench/ui/copy.mjs", text }];
    expect(
      duplicates(copy('el("nav", { className: "pick-list my-list" });')),
    ).toEqual([
      "src/bench/ui/copy.mjs: a second list-beside-detail part (a pick list nav)",
    ]);
    expect(
      duplicates(
        copy('const bar = el("nav", { className: "tabs tab-rail" });'),
      ),
    ).toEqual(["src/bench/ui/copy.mjs: a hand-built tab nav"]);
    expect(duplicates(copy("makeTab({ key: 'a' });"))).toEqual([
      "src/bench/ui/copy.mjs: a tab made outside the tab bar",
    ]);
    // The owners themselves may build their shapes.
    expect(
      duplicates([
        {
          file: "src/bench/ui/roster-screen.mjs",
          text: 'el("nav", { className: "pick-list roster" });',
        },
      ]),
    ).toEqual([]);
  });
});
