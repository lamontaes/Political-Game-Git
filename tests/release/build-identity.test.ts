/**
 * The version the game would show is the version the package records.
 *
 * This is the property the whole contract rests on: one canonical source, read
 * through build-time substitution, with no second literal anywhere to go stale.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildIdentity,
  diagnosticBuildLabel,
  displayVersion,
} from "../../src/release/build-identity";
import { resolveBuildIdentity } from "../../scripts/release/build-identity.js";

/** `git grep` exits 1 when it finds nothing, which here is the passing case. */
function gitGrep(args: readonly string[]): string {
  try {
    return execFileSync("git", ["grep", ...args], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const packageVersion = (
  JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
).version;

describe("build identity", () => {
  it("shows the version package.json records, and nothing else", () => {
    expect(buildIdentity().version).toBe(packageVersion);
    expect(displayVersion()).toBe(`v${packageVersion}`);
  });

  it("is derived from the actual source revision", () => {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    expect(buildIdentity().revision).toBe(head);
    expect(buildIdentity().revisionShort).toBe(head.slice(0, 7));
  });

  it("distinguishes two builds of the same release", () => {
    // The release number cannot tell two checkouts apart; the revision can, and
    // the diagnostic label is where both appear together.
    expect(diagnosticBuildLabel()).toContain(`v${packageVersion}+`);
    expect(diagnosticBuildLabel()).toContain(buildIdentity().revisionShort);
  });

  it("agrees with what the tooling resolves outside the bundle", () => {
    const resolved = resolveBuildIdentity(process.cwd());
    expect(resolved.version).toBe(buildIdentity().version);
    expect(resolved.revision).toBe(buildIdentity().revision);
  });

  it("is not a save-schema version", () => {
    // Guard against the conflation the contract forbids: nothing in the
    // persistence layer may read build identity.
    const persistence = gitGrep([
      "-l",
      "-e",
      "build-identity",
      "--",
      "src/persistence",
    ]);
    expect(persistence).toBe("");
  });
});

describe("no second version literal", () => {
  it("no player-facing source file hard-codes the release number", () => {
    const hits = gitGrep([
      "-n",
      "-E",
      `["'\`]v?${packageVersion.replace(/\./g, "\\.")}["'\`]`,
      "--",
      "src",
    ]);
    expect(hits).toBe("");
  });
});

describe("which revision gets stamped", () => {
  it("is the checked-out tree, not a synthetic merge commit the environment names", () => {
    // On a pull request GITHUB_SHA names a merge commit that is not the tree the
    // job checked out. Stamping it would name a revision nobody built.
    const previous = process.env.GITHUB_SHA;
    process.env.GITHUB_SHA = "f".repeat(40);
    try {
      expect(resolveBuildIdentity(process.cwd()).revision).toBe(
        execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      );
    } finally {
      if (previous === undefined) delete process.env.GITHUB_SHA;
      else process.env.GITHUB_SHA = previous;
    }
  });
});
