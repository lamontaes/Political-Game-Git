import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

export function sourceIdentity(root = process.cwd()) {
  const workspace = realpathSync(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: workspace, encoding: "utf8" }).trim();
  const status = git("status", "--porcelain", "--untracked-files=all");
  const hash = createHash("sha256");
  // Git's tree identifies unchanged tracked bytes. Hash only paths differing
  // from HEAD plus untracked inputs, avoiding rereading gigabytes of unchanged
  // art on every health probe. Staged/unstaged status does not change identity.
  hash.update(git("rev-parse", "HEAD^{tree}")).update("\0");
  const paths = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: workspace,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean);
  const files = [
    ...paths("diff", "HEAD", "--name-only", "-z"),
    ...paths(
      "ls-files",
      "--others",
      "--exclude-standard",
      "--exclude=node_modules",
      "--exclude=node_modules/**",
      "-z",
    ),
  ].sort();
  for (const file of new Set(files)) {
    hash.update(file).update("\0");
    try {
      hash.update(readFileSync(resolve(workspace, file)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      hash.update("<deleted>");
    }
    hash.update("\0");
  }
  return {
    workspace,
    head: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    dirty: status.length > 0,
    sourceDigest: hash.digest("hex"),
  };
}
export type SourceIdentity = ReturnType<typeof sourceIdentity>;
export function assertIdentity(
  expected: SourceIdentity,
  actual: SourceIdentity,
) {
  for (const key of ["workspace", "head", "branch", "sourceDigest"] as const) {
    if (expected[key] !== actual[key])
      throw new Error(
        `Served checkout mismatch: ${key}: expected ${expected[key]}, received ${actual[key]}`,
      );
  }
}
