/* global console, process */
/**
 * Stamp the compiled client with the checkout that produced it.
 *
 * Staging copies dist/client and used to write the *current* HEAD onto
 * whatever bytes happened to sit there. That let a stale build wear a newer
 * revision. This stamp is written at compile time, hashed over the client
 * tree, and is what staging later compares against.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashClientTree, provenanceFileName } from "./client-provenance.mjs";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const clientDir = path.join(repoRoot, "dist", "client");

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

const revision = git(["rev-parse", "HEAD"]) ?? "unknown";
const status = git(["status", "--porcelain"]);
const profile =
  process.env.VITE_OCD_BUILD_PROFILE === "internal-art-review"
    ? "internal-art-review"
    : "production";

const treeSha256 = hashClientTree(clientDir);
const provenance = {
  sourceRevision: revision,
  dirty: status !== null && status !== "",
  profile,
  treeSha256,
  stampedAt: new Date().toISOString(),
};

writeFileSync(
  path.join(clientDir, provenanceFileName),
  `${JSON.stringify(provenance, null, 2)}\n`,
);

console.log(
  `Stamped client provenance ${revision.slice(0, 7)} profile=${profile} tree=${treeSha256.slice(0, 12)}`,
);
