import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  changedFilesSince,
  ownershipViolations,
  straySurfaces,
} from "./support/ownership-boundary";

/**
 * Proof that the ownership boundary still bites under CI-shaped history.
 *
 * GitHub Actions checks a pull request out as a synthetic merge commit, and at
 * the default depth of 1 that commit arrives with no parents at all. Run
 * 33694592031 failed exactly there: the declared base was outside the clone, so
 * the boundary check had nothing to measure against.
 *
 * This file rebuilds that shape from scratch — base commit, feature branches,
 * merge commits, shallow clone — and drives the real boundary machinery over
 * it. It pins three properties the fix depends on:
 *
 *   1. a shallow clone reports that it cannot measure, rather than passing;
 *   2. fetching the history (what `fetch-depth: 0` buys us) restores the
 *      measurement; and
 *   3. once it can measure, forbidden and stray paths are actually caught.
 *
 * Without (3) the suite could go green by measuring nothing at all, which is
 * the failure mode this whole file exists to rule out.
 *
 * The git work happens once in `beforeAll`. It is the slowest thing here and
 * the rest of the suite is running alongside it, so it is deliberately one
 * repository and one clone rather than one per scenario.
 */

const IDENTITY = [
  "-c",
  "user.name=Boundary Harness",
  "-c",
  "user.email=harness@example.invalid",
  "-c",
  "commit.gpgsign=false",
];

/** Run git with the ambient user's configuration deliberately shut out. */
function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", [...IDENTITY, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
}

function write(root: string, file: string, contents: string): void {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

/**
 * Commit `changes` on a branch cut from `main`, then leave a two-parent merge
 * commit at the tip of `pullRequestRef` — GitHub's refs/pull/N/merge shape.
 */
function stageMergedPullRequest(
  origin: string,
  pullRequestRef: string,
  changes: Readonly<Record<string, string>>,
): void {
  git(origin, ["checkout", "-b", `${pullRequestRef}-work`, "main"]);
  for (const [file, contents] of Object.entries(changes)) {
    write(origin, file, contents);
  }
  git(origin, ["add", "-A"]);
  git(origin, ["commit", "-m", `Work for ${pullRequestRef}`]);
  git(origin, ["checkout", "-b", pullRequestRef, "main"]);
  git(origin, [
    "merge",
    "--no-ff",
    `${pullRequestRef}-work`,
    "-m",
    "Merge pull request",
  ]);
}

/** What the boundary machinery saw at each stage of the CI-shaped checkout. */
interface Observations {
  /** Result at `fetch-depth: 1`, before any history is fetched. */
  readonly whileShallow: readonly string[] | null;
  /** An in-bounds branch, measured after the history is fetched. */
  readonly cleanBranch: readonly string[] | null;
  /** A branch that reached into other people's systems. */
  readonly violatingBranch: readonly string[] | null;
}

let workspace = "";
let observed: Observations;

beforeAll(() => {
  workspace = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "ownership-boundary-")),
  );

  const origin = path.join(workspace, "origin");
  fs.mkdirSync(origin);
  git(origin, ["init", "-b", "main"]);
  write(origin, "src/persistence/save-file.ts", "export const version = 1;\n");
  write(origin, "src/simulation/names/pool.ts", "export const names = [];\n");
  write(origin, "src/simulation/economy.ts", "export const gdp = 0;\n");
  write(origin, "src/authoring/scene.ts", "export const scenes = [];\n");
  git(origin, ["add", "-A"]);
  git(origin, ["commit", "-m", "Base: PR #63 head stand-in"]);
  const base = git(origin, ["rev-parse", "HEAD"]).trim();

  stageMergedPullRequest(origin, "pr-clean", {
    "src/authoring/scene.ts": "export const scenes = ['capitol'];\n",
    "art/scene-capitol.json": "{}\n",
  });
  stageMergedPullRequest(origin, "pr-violating", {
    "src/authoring/scene.ts": "export const scenes = ['capitol'];\n",
    "src/persistence/save-file.ts": "export const version = 2;\n",
    "src/simulation/names/pool.ts": "export const names = ['Reyes'];\n",
    "src/simulation/economy.ts": "export const gdp = 1;\n",
  });

  // Exactly what `actions/checkout` leaves behind for a pull request at the
  // default depth: the merge commit, and none of its ancestry.
  const checkout = path.join(workspace, "checkout");
  git(workspace, [
    "clone",
    "--depth",
    "1",
    "--branch",
    "pr-clean",
    pathToFileURL(origin).href,
    checkout,
  ]);
  const whileShallow = changedFilesSince(checkout, base);

  // And what `fetch-depth: 0` buys: the ancestry the check needs.
  git(checkout, ["fetch", "--unshallow", "origin"]);
  const cleanBranch = changedFilesSince(checkout, base);

  // A single-branch clone, as checkout produces, has no other ref to hand.
  git(checkout, ["fetch", "--quiet", "origin", "pr-violating"]);
  git(checkout, ["checkout", "--quiet", "FETCH_HEAD"]);
  const violatingBranch = changedFilesSince(checkout, base);

  observed = { whileShallow, cleanBranch, violatingBranch };
});

afterAll(() => {
  if (workspace) fs.rmSync(workspace, { recursive: true, force: true });
});

describe("ownership boundary under a shallow pull-request checkout", () => {
  it("reports that it cannot measure instead of passing blind", () => {
    // The regression itself: this is what run 33694592031 hit.
    expect(observed.whileShallow).toBeNull();
  });

  it("measures the branch's own changes once history is fetched", () => {
    expect(observed.cleanBranch).toEqual([
      "art/scene-capitol.json",
      "src/authoring/scene.ts",
    ]);
  });

  it("passes a branch that stayed inside its own surfaces", () => {
    expect(ownershipViolations(observed.cleanBranch ?? [])).toEqual([]);
    expect(straySurfaces(observed.cleanBranch ?? [])).toEqual([]);
  });

  it("catches forbidden paths that moved, naming their owners", () => {
    expect(observed.violatingBranch).not.toBeNull();
    expect(ownershipViolations(observed.violatingBranch ?? [])).toEqual([
      "src/persistence/save-file.ts — owned by saves, persistence and replay",
      "src/simulation/names/pool.ts — owned by name generation",
    ]);
  });

  it("catches changes outside the surfaces this packet owns", () => {
    // src/simulation/economy.ts belongs to nobody on this stack in particular;
    // it is out of bounds simply because this packet does not own it. The two
    // owned paths are strays as well as violations, which is why they appear
    // here too.
    expect(straySurfaces(observed.violatingBranch ?? [])).toEqual([
      "src/persistence/save-file.ts",
      "src/simulation/economy.ts",
      "src/simulation/names/pool.ts",
    ]);
  });
});
