// The generated index must never stop a checked pull request from merging
// (pool-generated-index-merge-starvation): main moves item statuses while a
// planning branch adds items, and both land by ordinary merges with nothing lost.
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { GOOD } from "./index.test";
import { buildIndexFor, command, indexCheck, reindex, run } from "./index";

const item = (id: string, extra = ""): string =>
  `---\nid: ${id}\ntitle: "Title of ${id}"\narea: laws\nkind: wiring\npriority: 1\nstatus: open\n${extra}---\n\n${GOOD}`;

/** A bare origin whose main holds two items and their index, and a clone of it. */
function world(): {
  origin: string;
  work: string;
  pool: string;
  g: (...a: string[]) => string;
} {
  const dir = mkdtempSync(join(tmpdir(), "pool-merge-"));
  const origin = join(dir, "origin.git");
  const work = join(dir, "work");
  const pool = join(work, "docs", "pool");
  mkdirSync(join(pool, "items"), { recursive: true });
  const g = (...a: string[]): string =>
    execFileSync("git", a, { cwd: work, encoding: "utf8" }).trim();
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", origin]);
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t");
  g("config", "user.name", "t");
  writeFileSync(join(pool, "items", "laws-a.md"), item("laws-a"));
  writeFileSync(join(pool, "items", "laws-parent.md"), item("laws-parent"));
  run(pool, false);
  g("add", ".");
  g("commit", "-qm", "init");
  g("remote", "add", "origin", origin);
  g("push", "-q", "-u", "origin", "main");
  g("fetch", "-q", "origin");
  return { origin, work, pool, g };
}

/** What the index would be if regenerated from main's items, against main's tracked copy. */
function mainIndexIsExact(origin: string): void {
  const clone = mkdtempSync(join(tmpdir(), "pool-main-"));
  execFileSync("git", ["clone", "-q", origin, clone]);
  const pool = join(clone, "docs", "pool");
  expect(readFileSync(join(pool, "INDEX.md"), "utf8")).toBe(
    buildIndexFor(pool),
  );
}

describe("the index never blocks a merge", () => {
  it("a planning branch and two status changes on main both land, nothing lost, index exact after each step", () => {
    const { origin, work, pool, g } = world();
    const cwd = process.cwd();
    process.chdir(work);
    try {
      // A planning branch adds two child items and a Notes line on the parent,
      // and runs the pool command the way a planner does.
      g("checkout", "-q", "-b", "plan");
      writeFileSync(join(pool, "items", "laws-c1.md"), item("laws-c1"));
      writeFileSync(join(pool, "items", "laws-c2.md"), item("laws-c2"));
      appendFileSync(
        join(pool, "items", "laws-parent.md"),
        "\nPlanner: split into laws-c1 and laws-c2.\n",
      );
      expect(command(["reindex", "--local"])).toBeNull();
      g("add", ".");
      g("commit", "-qm", "plan: two children");
      // The branch carries no index change, so its own check passes.
      expect(indexCheck(pool)).toEqual([]);
      g("push", "-q", "origin", "plan");

      // Meanwhile main moves: a claim and a status change, each pushed to main.
      expect(command(["claim", "laws-a", "--branch", "b1"])).toBeNull();
      mainIndexIsExact(origin);
      expect(command(["claim", "laws-parent", "--branch", "b2"])).toBeNull();
      mainIndexIsExact(origin);

      // The merge desk merges the planning branch with an ordinary merge.
      g("fetch", "-q", "origin");
      g("checkout", "-q", "-B", "desk", "origin/main");
      g("merge", "-q", "--no-edit", "origin/plan");
      g("push", "-q", "origin", "HEAD:main");

      // The workflow on main regenerates the index from main's items.
      g("checkout", "-q", "plan");
      expect(reindex()).toBeNull();
      mainIndexIsExact(origin);

      const clone = mkdtempSync(join(tmpdir(), "pool-final-"));
      execFileSync("git", ["clone", "-q", origin, clone]);
      const items = join(clone, "docs", "pool", "items");
      const parent = readFileSync(join(items, "laws-parent.md"), "utf8");
      expect(parent).toContain("status: claimed");
      expect(parent).toContain("claimed-by: b2");
      expect(parent).toContain("Planner: split into laws-c1 and laws-c2.");
      expect(readFileSync(join(items, "laws-a.md"), "utf8")).toContain(
        "claimed-by: b1",
      );
      expect(readFileSync(join(items, "laws-c1.md"), "utf8")).toContain(
        GOOD.slice(0, 40),
      );
      const index = readFileSync(
        join(clone, "docs", "pool", "INDEX.md"),
        "utf8",
      );
      expect(index).toContain("**4 items:** 2 open, 2 claimed");
      expect(index).toContain("laws-c2");
    } finally {
      process.chdir(cwd);
    }
  });

  it("a branch that changes the index fails its check with the fix", () => {
    const { pool, g } = world();
    const cwd = process.cwd();
    process.chdir(join(pool, "..", ".."));
    try {
      g("checkout", "-q", "-b", "stale");
      writeFileSync(join(pool, "items", "laws-c1.md"), item("laws-c1"));
      run(pool, false);
      g("add", ".");
      g("commit", "-qm", "branch writes the index");
      expect(indexCheck(pool).join("\n")).toMatch(
        /git checkout origin\/main -- docs\/pool\/INDEX\.md/,
      );
      g("checkout", "-q", "main", "--", "docs/pool/INDEX.md");
      g("commit", "-qm", "take main's index");
      expect(indexCheck(pool)).toEqual([]);
    } finally {
      process.chdir(cwd);
    }
  });

  it("on main a stale index is still an error", () => {
    const { pool } = world();
    const cwd = process.cwd();
    process.chdir(join(pool, "..", ".."));
    try {
      writeFileSync(join(pool, "items", "laws-c1.md"), item("laws-c1"));
      expect(indexCheck(pool).join("\n")).toMatch(/stale/);
    } finally {
      process.chdir(cwd);
    }
  });
});
