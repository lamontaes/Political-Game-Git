import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module with no types
import { analyze, isTestByName } from "../../scripts/promote/test-files.mjs";

// The promote rule's own check: what counts as a test file, on a small
// repository built here (no game files are read).
describe("promote: which files are test files", () => {
  it("names tests by name and place", () => {
    for (const f of [
      "src/core2/life.test.ts",
      "src/bench/ad-buy.browser.mjs",
      "scripts/roadmap/next-feature.node-test.ts",
      "tests/guards/one-history.test.ts",
      "tests/support/anything.ts",
      "desktop/tests/fixtures/release-feeds/v1/files.json",
      "data/research/macro/test_research.py",
      "desktop/scripts/smoke-test.mjs",
    ]) {
      expect(isTestByName(f), f).toBe(true);
    }
    for (const f of [
      "src/core2/life.ts",
      "docs/lanes/proof/first-minutes.browser.mjs",
      "scripts/promote/test-files.mjs",
      "src/core2/data/testing.json",
    ]) {
      expect(isTestByName(f), f).toBe(false);
    }
  });

  const dirs: string[] = [];
  afterAll(() =>
    dirs.forEach((d) => rmSync(d, { recursive: true, force: true })),
  );

  function repo(files: Record<string, string>) {
    const dir = mkdtempSync(path.join(tmpdir(), "promote-rule-"));
    dirs.push(dir);
    execFileSync("git", ["init", "-q"], { cwd: dir });
    for (const [f, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      writeFileSync(path.join(dir, f), text);
    }
    execFileSync("git", ["add", "-A"], { cwd: dir });
    return dir;
  }

  it("lists a kit only tests import, keeps a module only its own test imports", () => {
    const dir = repo({
      "src/a.ts": "export const a = 1;\n",
      "src/a.test.ts":
        'import { a } from "./a"; import { k } from "./a-test-kit";\n',
      "src/a-test-kit.ts": "export const k = 1;\n",
    });
    const r = analyze(dir);
    expect(r.all).toEqual(["src/a-test-kit.ts", "src/a.test.ts"]);
  });

  it("keeps a test-named file a script imports, and what it imports", () => {
    const dir = repo({
      "scripts/run.ts": 'import { p } from "../tests/place";\n',
      "tests/place.ts":
        'import { q } from "./support/q";\nexport const p = 1;\n',
      "tests/support/q.ts": "export const q = 1;\n",
      "tests/other.test.ts": 'import { p } from "./place";\n',
    });
    const r = analyze(dir);
    expect(r.all).toEqual(["tests/other.test.ts"]);
    expect(r.stay.has("tests/place.ts")).toBe(true);
  });

  it("does not let a runner string or a package script save a test", () => {
    const dir = repo({
      "package.json": '{"scripts":{"t":"vitest run tests/x.test.ts"}}\n',
      "scripts/guards.ts": 'run("tests/x.test.ts");\n',
      "tests/x.test.ts": "export {};\n",
    });
    expect(analyze(dir).all).toEqual(["tests/x.test.ts"]);
  });

  it("lists a fixture only tests read, not a baseline a script reads", () => {
    const dir = repo({
      "src/b.test.ts":
        'import f from "./fixtures/in.json"; import b from "./b-baseline.json";\n',
      "src/fixtures/in.json": "{}\n",
      "src/b-baseline.json": "{}\n",
      "scripts/check.ts": 'import b from "../src/b-baseline.json";\n',
    });
    expect(analyze(dir).all).toEqual(["src/b.test.ts", "src/fixtures/in.json"]);
  });
});
