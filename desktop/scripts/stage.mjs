/* global console, process */
/**
 * Stage the compiled game for desktop packaging.
 *
 * Packaging consumes exactly what `npm run build` produced at the
 * repository root — dist/client — and refuses to run without it. The
 * compiled tree must carry compile-time provenance that matches this
 * checkout; staging never relabels stale bytes with a newer HEAD.
 *
 * --distribution steam marks the output as Steam-managed, which hard
 * disables the direct updater in the shell. The default distribution is
 * "direct" with the updater unconfigured (no endpoint), which is also
 * disabled at runtime until an endpoint is deliberately authorized.
 *
 * --rebuild runs `npm run build` first when provenance does not match.
 * --composition is required to claim "accepted-main" unless HEAD is
 * origin/main.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertCompositionAllowed,
  assertProvenanceMatches,
  defaultComposition,
} from "../../scripts/client-provenance.mjs";

const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(desktopRoot);
const clientSource = path.join(repoRoot, "dist", "client");
const stagedRoot = path.join(desktopRoot, "staged");

const args = process.argv.slice(2);
const rebuild = args.includes("--rebuild");
const distributionIndex = args.indexOf("--distribution");
const distribution =
  distributionIndex >= 0 ? (args[distributionIndex + 1] ?? "direct") : "direct";
if (!["direct", "steam"].includes(distribution)) {
  console.error(`Unknown distribution "${distribution}" (direct|steam).`);
  process.exit(1);
}

function git(argsList) {
  try {
    return execFileSync("git", argsList, {
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
const dirty = status !== null && status !== "";
const main = git(["rev-parse", "refs/remotes/origin/main"]);
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);

const compositionIndex = args.indexOf("--composition");
const composition =
  compositionIndex >= 0
    ? (args[compositionIndex + 1] ?? "")
    : defaultComposition({ head: revision, main, branch });
if (!composition) {
  console.error("composition must be a non-empty identity string.");
  process.exit(1);
}
try {
  assertCompositionAllowed(composition, { head: revision, main });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const packageJson = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
if (typeof packageJson.version !== "string") {
  console.error("Repository package.json has no string version.");
  process.exit(1);
}
const fixtureIndex = args.indexOf("--fixture-version");
const fixtureVersion = fixtureIndex >= 0 ? args[fixtureIndex + 1] : undefined;
if (fixtureVersion && !fixtureVersion.startsWith(packageJson.version + "-")) {
  console.error(
    `Fixture version must be a prerelease of the canonical ${packageJson.version}.`,
  );
  process.exit(1);
}

function matchOrRebuild() {
  try {
    return assertProvenanceMatches({
      clientDir: clientSource,
      expectedRevision: revision,
      expectedDirty: dirty,
    });
  } catch (error) {
    if (!rebuild) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
    console.log("Provenance mismatch; rebuilding the client.");
    const built = spawnSync("npm", ["run", "build"], {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });
    if (built.status !== 0) process.exit(built.status ?? 1);
    return assertProvenanceMatches({
      clientDir: clientSource,
      expectedRevision: git(["rev-parse", "HEAD"]) ?? revision,
      expectedDirty: (git(["status", "--porcelain"]) ?? "") !== "",
    });
  }
}

const { provenance, treeSha256 } = matchOrRebuild();

const identity = {
  version: fixtureVersion ?? packageJson.version,
  revision,
  revisionShort: revision === "unknown" ? "unknown" : revision.slice(0, 7),
  dirty,
  distribution,
  channel: "internal",
  composition,
  profile: provenance.profile,
  clientTreeSha256: treeSha256,
  stagedAt: new Date().toISOString(),
};

rmSync(stagedRoot, { recursive: true, force: true });
mkdirSync(stagedRoot, { recursive: true });
cpSync(clientSource, path.join(stagedRoot, "client"), { recursive: true });
writeFileSync(
  path.join(stagedRoot, "build-identity.json"),
  JSON.stringify(identity, null, 2) + "\n",
);
writeFileSync(
  path.join(stagedRoot, "update-config.json"),
  JSON.stringify(
    { enabled: false, channel: "internal", feedURL: null },
    null,
    2,
  ) + "\n",
);

console.log(
  `Staged ${identity.version} @ ${identity.revisionShort}${identity.dirty ? " (dirty)" : ""} distribution=${distribution} composition=${composition} profile=${identity.profile}`,
);
