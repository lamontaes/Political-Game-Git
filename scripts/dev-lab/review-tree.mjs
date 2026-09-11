#!/usr/bin/env node
/* global console, process */
import { execFileSync } from "node:child_process";
import { existsSync, symlinkSync, rmSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A frozen, identified checkout to run an expensive suite against.
 *
 * The browser suite hashes its own source inputs: `scripts/dev-lab/identity.ts`
 * digests the HEAD tree plus every changed or untracked file, the dev server
 * records that digest when it starts, and the teardown refuses the run if it
 * moved. That guard is correct and it caught a real mistake — a 21-minute
 * inventory was thrown away because source was edited while it was in flight,
 * and the whole run's conclusions with it.
 *
 * Waiting out a long suite without touching anything is not a workable rule for
 * a working session. So the run gets its own tree instead: a git worktree
 * detached at an exact revision, with node_modules linked rather than copied.
 * Editing the ordinary checkout then cannot change what is being measured,
 * because what is being measured is somewhere else, at a revision that is
 * written down.
 *
 *   node scripts/dev-lab/review-tree.mjs create <revision> [path]
 *   node scripts/dev-lab/review-tree.mjs remove <path>
 *
 * The revision must be committed. A worktree cannot carry uncommitted work, and
 * silently running a different tree than the one named is the failure this
 * exists to prevent.
 */

const [, , command, argument, maybePath] = process.argv;

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function create() {
  if (!argument) throw new Error("usage: review-tree create <revision> [path]");
  const revision = git("rev-parse", argument);
  const target = resolve(maybePath ?? `/tmp/pg-review-${revision.slice(0, 8)}`);

  if (existsSync(target)) {
    throw new Error(
      `${target} already exists. Remove it first so the tree cannot be stale.`,
    );
  }

  git("worktree", "add", "--detach", target, revision);

  /*
   * Linked, not installed. A second npm install is minutes of wall clock and a
   * second chance for the two trees to hold different dependency bytes, which
   * would make the run measure something the ordinary checkout is not.
   */
  const modules = resolve(process.cwd(), "node_modules");
  if (existsSync(modules))
    symlinkSync(modules, resolve(target, "node_modules"));

  const identity = execFileSync(
    "node",
    [
      "--import",
      "tsx",
      "-e",
      "import {sourceIdentity} from './scripts/dev-lab/identity.ts'; console.log(JSON.stringify(sourceIdentity(), null, 2));",
    ],
    { cwd: target, encoding: "utf8" },
  );

  console.log(`review tree: ${target}`);
  console.log(`revision:    ${revision}`);
  console.log(identity.trim());
  console.log(
    "\nRun the suite from that directory. Do not edit it while the run is in flight;\n" +
      "the ordinary checkout is free to change and cannot affect this one.",
  );
}

function remove() {
  if (!argument) throw new Error("usage: review-tree remove <path>");
  const target = resolve(argument);
  git("worktree", "remove", "--force", target);
  rmSync(target, { recursive: true, force: true });
  console.log(`removed ${target}`);
}

if (command === "create") create();
else if (command === "remove") remove();
else {
  console.error(
    "usage: review-tree <create <revision> [path] | remove <path>>",
  );
  process.exitCode = 1;
}
