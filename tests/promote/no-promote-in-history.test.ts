import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import {
  MESSAGE,
  promoteCommitsIn,
} from "../../scripts/promote/no-promote-in-history.mjs";

// The guard that stops a work branch from having main merged into it: main
// holds the game without tests, so merging it deletes tests
// (docs/coordination/TWO-BRANCHES.md, Known limits).
const GUARD = path.resolve("scripts/promote/no-promote-in-history.mjs");
const dirs: string[] = [];
afterAll(() =>
  dirs.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

// A git identity in the environment: the temp repository has none of its own.
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
function g(dir: string, ...args: string[]) {
  return execFileSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    env: ENV,
  }).trim();
}
function commit(dir: string, file: string, subject: string) {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), `${subject}\n`);
  g(dir, "add", "-A");
  g(dir, "commit", "-qm", subject);
  return g(dir, "rev-parse", "HEAD");
}
function run(dir: string, ...args: string[]) {
  return spawnSync("node", [GUARD, ...args], {
    cwd: dir,
    encoding: "utf8",
    env: ENV,
  });
}
const PROMOTE = (work: string) =>
  `Promote ${work}: the game without test files`;

/** dev with two commits, then main with a promote commit on top of the first. */
function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), "no-promote-"));
  dirs.push(dir);
  g(dir, "init", "-q", "-b", "dev");
  const first = commit(dir, "src/a.ts", "first work");
  g(dir, "branch", "main");
  commit(dir, "src/a.test.ts", "a test");
  g(dir, "checkout", "-q", "main");
  const promote = commit(dir, "src/b.ts", PROMOTE(first));
  g(dir, "checkout", "-q", "dev");
  return { dir, promote };
}

describe("no promote commit in a work branch's history", () => {
  it("passes a clean branch", () => {
    const { dir } = setup();
    g(dir, "checkout", "-q", "-b", "feature");
    commit(dir, "src/c.ts", "my work");
    expect(promoteCommitsIn(dir, { work: "dev" })).toEqual([]);
    expect(run(dir, "--work", "dev").status).toBe(0);
    // With no work ref and no origin/dev, the whole history is read.
    expect(run(dir).status).toBe(0);
  });

  it("fails a branch with main merged in, and says what to do", () => {
    const { dir, promote } = setup();
    g(dir, "checkout", "-q", "-b", "feature");
    commit(dir, "src/c.ts", "my work");
    g(dir, "merge", "-q", "--no-edit", "main");
    expect(promoteCommitsIn(dir, { work: "dev" })).toEqual([promote]);
    const result = run(dir, "--work", "dev");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(MESSAGE);
    expect(result.stderr).toContain("git revert -m 1");
    expect(result.stderr).toContain("merge origin/dev instead");
    expect(run(dir).status).toBe(1);
  });

  it("does not judge a promote commit that is the work ref itself, and runs only on pull requests and dev", () => {
    const { dir } = setup();
    g(dir, "checkout", "-q", "main");
    // The range work..HEAD is empty when HEAD is the work ref.
    expect(run(dir, "--work", "main").status).toBe(0);
    // The guard step is in the repository job of the validation workflow, which
    // runs on pull requests, the hour and by hand, never on a push to main.
    const validate = readFileSync(".github/workflows/validate.yml", "utf8");
    expect(validate).toContain(
      "node scripts/promote/no-promote-in-history.mjs --work origin/dev",
    );
    const triggers = validate.slice(
      validate.indexOf("\non:\n"),
      validate.indexOf("\npermissions:"),
    );
    expect(triggers).not.toMatch(/\n {2}push:/);
  });
});
