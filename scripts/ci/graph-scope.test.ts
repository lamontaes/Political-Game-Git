// The graph scope (scripts/ci/graph-scope.mjs): a whole-game check runs only
// for a change to a file it plays (owner, Nov 18). Each case builds a small
// repository, so no town or seed is involved.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
// @ts-expect-error plain module script
import { scopeFor } from "./graph-scope.mjs";

const root = mkdtempSync(path.join(tmpdir(), "graph-scope-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const put = (file: string, text: string) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
};
put("package.json", '{"scripts":{"make":"node tools/make.mjs"}}');
put(
  "entry.mjs",
  'import { a } from "./src/a.js";\nconst d = "data/rows.json";\nawait import(`./plugins/${a}.ts`);\n',
);
put("src/a.ts", 'import b from "./b/index";\nexport const a = 1;\n');
put("src/b/index.ts", "export default 2;\n");
put("data/rows.json", '{"x":"data/more.json"}');
put("data/more.json", "{}");
put("plugins/one.ts", "export {};\n");
put("plugins/one.test.ts", "export {};\n");
put("src/unrelated.ts", "export {};\n");
put("docs/notes.md", "# notes\n");
put("docs/pool/items/x.md", "# item\n");
put("art/pic.png", "x");
put("tools/make.mjs", "export {};\n");
execFileSync("git", ["init", "-q"], { cwd: root });
execFileSync("git", ["add", "-A"], { cwd: root });

const run = (
  changed: string[],
  always: string[] = [".github/workflows/x.yml"],
) => scopeFor({ root, entries: ["entry.mjs"], changed, always }).run as boolean;

describe("graph scope", () => {
  it("runs for a file the entry reaches by import, index folder, string or template", () => {
    for (const f of [
      "entry.mjs",
      "src/a.ts",
      "src/b/index.ts",
      "data/rows.json",
      "data/more.json",
      "plugins/one.ts",
    ])
      expect(run([f]), f).toBe(true);
  });
  it("skips a file the entry never reaches, and docs, pool items, art and tests of a folder", () => {
    for (const f of [
      "src/unrelated.ts",
      "docs/notes.md",
      "docs/pool/items/x.md",
      "art/pic.png",
      "plugins/one.test.ts",
    ])
      expect(run([f]), f).toBe(false);
  });
  it("always runs for the toolchain and the always list, and when no file list was read", () => {
    expect(run(["package.json"])).toBe(true);
    expect(run(["tsconfig.json"])).toBe(true);
    expect(run([".github/workflows/x.yml"])).toBe(true);
    expect(run(["scripts/ci/graph-scope.mjs"])).toBe(true);
    expect(run([])).toBe(true);
  });
  it("runs when any one of several changed files is played", () => {
    expect(run(["docs/notes.md", "src/a.ts"])).toBe(true);
    expect(run(["docs/notes.md", "src/unrelated.ts"])).toBe(false);
  });
});
