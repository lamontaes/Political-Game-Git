import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
// @ts-expect-error plain JavaScript module with no types
import {
  findPromoted,
  lastPromoted,
  mainPackageJson,
  promote,
} from "../../scripts/promote/promote.mjs";

// The promote step, on a small repository built here: one plain commit on top
// of main with the test files gone, a refusal when the work commit is not a
// descendant of the last promoted one, and a package.json for main.
const dirs: string[] = [];
afterAll(() =>
  dirs.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

function g(dir: string, ...args: string[]) {
  return execFileSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@example.com",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@example.com",
    },
  }).trim();
}
function put(dir: string, files: Record<string, string>) {
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    writeFileSync(path.join(dir, f), text);
  }
  g(dir, "add", "-A");
}
const quiet = () => {};

describe("promote: the commit on main", () => {
  function setup() {
    const dir = mkdtempSync(path.join(tmpdir(), "promote-run-"));
    dirs.push(dir);
    g(dir, "init", "-q", "-b", "main");
    put(dir, { "src/a.ts": "export const a = 1;\n", "README.md": "x\n" });
    g(dir, "commit", "-qm", "start");
    g(dir, "checkout", "-q", "-b", "dev");
    put(dir, {
      "src/b.ts": "export const b = 2;\n",
      "src/b.test.ts": 'import { b } from "./b";\n',
      "package.json": JSON.stringify({
        version: "1.0.0",
        scripts: {
          build: "vite build",
          test: "vitest run",
          "test:x": "vitest run src/b.test.ts",
          check: "npm run test",
        },
      }),
    });
    g(dir, "commit", "-qm", "work");
    return dir;
  }

  it("makes one commit on top of main, with no test files, naming the work sha", () => {
    const dir = setup();
    const mainTip = g(dir, "rev-parse", "main");
    const work = g(dir, "rev-parse", "HEAD");
    const commit = promote(
      dir,
      { work: "HEAD", main: "main", remote: "origin", push: false },
      quiet,
    );
    expect(g(dir, "rev-parse", `${commit}^`)).toBe(mainTip);
    expect(g(dir, "log", "-1", "--format=%s", commit)).toBe(
      `Promote ${work}: the game without test files`,
    );
    const files = g(dir, "ls-tree", "-r", "--name-only", commit).split("\n");
    expect(files).toContain("src/b.ts");
    expect(files).not.toContain("src/b.test.ts");
    const pkg = JSON.parse(g(dir, "show", `${commit}:package.json`));
    expect(pkg.version).toBe("1.0.0");
    expect(Object.keys(pkg.scripts)).toEqual(["build"]);
  });

  it("moves forward only: the same commit, then a side branch, are refused", () => {
    const dir = setup();
    const first = promote(
      dir,
      { work: "HEAD", main: "main", remote: "origin", push: false },
      quiet,
    );
    g(dir, "update-ref", "refs/heads/main", first);
    const work1 = g(dir, "rev-parse", "HEAD");
    expect(lastPromoted(dir, "main")).toBe(work1);
    expect(
      promote(
        dir,
        { work: "HEAD", main: "main", remote: "origin", push: false },
        quiet,
      ),
    ).toBeNull();
    put(dir, { "src/c.ts": "export const c = 3;\n" });
    g(dir, "commit", "-qm", "more work");
    const second = promote(
      dir,
      { work: "HEAD", main: "main", remote: "origin", push: false },
      quiet,
    );
    expect(g(dir, "rev-parse", `${second}^`)).toBe(first);
    g(dir, "update-ref", "refs/heads/main", second);
    // A side branch cut before the last promoted commit does not descend from it.
    g(dir, "checkout", "-q", "-b", "side", work1);
    put(dir, { "src/d.ts": "export const d = 4;\n" });
    g(dir, "commit", "-qm", "side");
    expect(() =>
      promote(
        dir,
        { work: "HEAD", main: "main", remote: "origin", push: false },
        quiet,
      ),
    ).toThrow(/does not descend/);
    expect(existsSync(path.join(dir, "src/c.ts"))).toBe(false);
  });

  it("finds the main commit that carries an older work commit, and none for one never promoted", () => {
    const dir = setup();
    const first = promote(
      dir,
      { work: "HEAD", main: "main", remote: "origin", push: false },
      quiet,
    );
    g(dir, "update-ref", "refs/heads/main", first);
    const work1 = g(dir, "rev-parse", "HEAD");
    put(dir, { "src/c.ts": "export const c = 3;\n" });
    g(dir, "commit", "-qm", "more work");
    const work2 = g(dir, "rev-parse", "HEAD");
    const second = promote(
      dir,
      { work: "HEAD", main: "main", remote: "origin", push: false },
      quiet,
    );
    g(dir, "update-ref", "refs/heads/main", second);
    // A rerun for the older work commit finds its own promote, not the newest.
    expect(findPromoted(dir, "main", work1)).toBe(first);
    expect(findPromoted(dir, "main", work2)).toBe(second);
    put(dir, { "src/e.ts": "export const e = 5;\n" });
    g(dir, "commit", "-qm", "unpromoted");
    expect(findPromoted(dir, "main", g(dir, "rev-parse", "HEAD"))).toBeNull();
  });

  it("drops the desktop package's test script too, and keeps its other scripts", () => {
    const dir = setup();
    put(dir, {
      "desktop/package.json": JSON.stringify({
        name: "desktop",
        scripts: {
          stage: "node scripts/stage.mjs",
          test: 'node --test "tests/**/*.test.mjs"',
        },
      }),
      "desktop/tests/a.test.mjs": "// a test\n",
    });
    g(dir, "commit", "-qm", "desktop");
    const commit = promote(
      dir,
      { work: "HEAD", main: "main", remote: "origin", push: false },
      quiet,
    );
    const pkg = JSON.parse(g(dir, "show", `${commit}:desktop/package.json`));
    expect(Object.keys(pkg.scripts)).toEqual(["stage"]);
    const files = g(dir, "ls-tree", "-r", "--name-only", commit).split("\n");
    expect(files).not.toContain("desktop/tests/a.test.mjs");
    // The work branch keeps its own copy.
    expect(
      Object.keys(
        JSON.parse(g(dir, "show", "HEAD:desktop/package.json")).scripts,
      ),
    ).toEqual(["stage", "test"]);
  });

  it("refuses a dirty tree", () => {
    const dir = setup();
    writeFileSync(path.join(dir, "src/b.ts"), "changed\n");
    expect(() =>
      promote(
        dir,
        { work: "HEAD", main: "main", remote: "origin", push: false },
        quiet,
      ),
    ).toThrow(/changes/);
  });

  it("drops scripts that run tests, keeps the version", () => {
    const text = JSON.stringify({
      version: "2.0.0",
      scripts: {
        a: "node x.mjs",
        t: "vitest run",
        u: "npm run t",
        v: "node tests/y.test.ts",
      },
    });
    const out = JSON.parse(mainPackageJson(text, ["tests/y.test.ts"]));
    expect(out.version).toBe("2.0.0");
    expect(Object.keys(out.scripts)).toEqual(["a"]);
  });
});
