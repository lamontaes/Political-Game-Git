#!/usr/bin/env node
/* global console, process */
// Fails when a work branch has main merged into it.
//
// `main` holds the game without test files (docs/coordination/TWO-BRANCHES.md).
// Each promote commit on main has a subject "Promote <40 hex>: the game without
// test files". A branch whose history holds one has main merged in, and merging
// main applies "delete every test file" to the branch. This guard looks for
// that subject in the commits a branch adds.
//
// Usage: node scripts/promote/no-promote-in-history.mjs [--work <ref>] [--depth <n>]
//   --work <ref>   check only the commits in <ref>..HEAD (a pull request's own
//                  commits). Default: origin/dev when it exists.
//   With no work ref and no origin/dev, HEAD's history up to --depth commits
//   (default 5000) is checked.
// It runs on pull requests and work branches only. It is never run on main,
// whose own history is full of promote commits by design.
//
// Dependency-free on purpose: it runs before `npm install` in the repository job.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const PROMOTE_SUBJECT =
  /^Promote [0-9a-f]{40}: the game without test files$/;

export const MESSAGE = [
  "This branch has main merged into it.",
  "Main holds the game without tests; merging it deletes tests.",
  "Undo that merge (git reset is not allowed on a pushed branch: revert the merge commit with `git revert -m 1 <merge>`), and merge origin/dev instead.",
].join("\n");

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function refExists(root, ref) {
  try {
    git(root, ["rev-parse", "--verify", "-q", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** The promote commits in the history a branch adds. Empty when the branch is clean. */
export function promoteCommitsIn(root, { work = null, depth = 5000 } = {}) {
  const ref = work ?? (refExists(root, "origin/dev") ? "origin/dev" : null);
  const args = ["log", "--format=%H%x09%s"];
  if (ref) args.push(`${ref}..HEAD`);
  else args.push(`-n${depth}`, "HEAD");
  return git(root, args)
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter(([, subject]) => PROMOTE_SUBJECT.test(subject ?? ""))
    .map(([hash]) => hash);
}

function parse(argv) {
  const o = { work: null, depth: 5000 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--work") o.work = argv[++i];
    else if (argv[i] === "--depth") o.depth = Number(argv[++i]);
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  return o;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const found = promoteCommitsIn(process.cwd(), parse(process.argv.slice(2)));
    if (found.length > 0) {
      console.error(MESSAGE);
      console.error(
        `Promote commits in this branch's history: ${found.join(" ")}`,
      );
      process.exit(1);
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
}
