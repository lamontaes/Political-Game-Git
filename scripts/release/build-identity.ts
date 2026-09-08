/**
 * Exact build identity, derived from the actual source revision.
 *
 * The accepted release number answers "which release is this?"; it cannot
 * answer "which build is this?", because two checkouts of different work carry
 * the same number until a release moves it. The revision answers that, and it
 * is read from git rather than written down, so no checkout can claim an
 * identity it does not have.
 *
 * This is not save-schema compatibility and must never be conflated with it.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BuildIdentity } from "./model.js";

function git(root: string, args: readonly string[]): string | null {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

export function readPackageVersion(root: string): string {
  const parsed: unknown = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const version = (parsed as { version?: unknown }).version;
  if (typeof version !== "string") {
    throw new Error("package.json has no string 'version'.");
  }
  return version;
}

/**
 * Which revision this tree is.
 *
 * A CI checkout is detached at a known SHA and exports it, so the environment
 * is consulted first; otherwise git is asked directly. A tree with no git at
 * all reports `unknown` rather than inventing a plausible hash.
 */
export function resolveBuildIdentity(root: string): BuildIdentity {
  const version = readPackageVersion(root);
  const fromEnvironment = process.env.GITHUB_SHA;
  const revision =
    (fromEnvironment && /^[0-9a-f]{40}$/.test(fromEnvironment)
      ? fromEnvironment
      : git(root, ["rev-parse", "HEAD"])) ?? "unknown";
  const status = git(root, ["status", "--porcelain"]);
  return {
    version,
    revision,
    revisionShort: revision === "unknown" ? "unknown" : revision.slice(0, 7),
    dirty: status !== null && status !== "",
  };
}

/** The `define` map the bundler injects, so no React file hard-codes a version. */
export function buildIdentityDefines(
  identity: BuildIdentity,
): Record<string, string> {
  return {
    __RELEASE_VERSION__: JSON.stringify(identity.version),
    __BUILD_REVISION__: JSON.stringify(identity.revision),
    __BUILD_REVISION_SHORT__: JSON.stringify(identity.revisionShort),
    __BUILD_DIRTY__: JSON.stringify(identity.dirty),
  };
}
