/* global console, process */
/**
 * Stage the compiled game for desktop packaging.
 *
 * Packaging consumes exactly what `npm run build` produced at the
 * repository root — dist/client — and refuses to run without it. This
 * script copies that output into desktop/staged/client and stamps
 * build-identity.json from the repository package version and the actual
 * git revision, so the packaged app can never claim an identity the
 * checkout does not have.
 *
 * --distribution steam marks the output as Steam-managed, which hard
 * disables the direct updater in the shell. The default distribution is
 * "direct" with the updater unconfigured (no endpoint), which is also
 * disabled at runtime until an endpoint is deliberately authorized.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(desktopRoot);
const clientSource = path.join(repoRoot, "dist", "client");
const stagedRoot = path.join(desktopRoot, "staged");

const args = process.argv.slice(2);
const distributionIndex = args.indexOf("--distribution");
const distribution =
  distributionIndex >= 0 ? (args[distributionIndex + 1] ?? "direct") : "direct";
if (!["direct", "steam"].includes(distribution)) {
  console.error(`Unknown distribution "${distribution}" (direct|steam).`);
  process.exit(1);
}
const compositionIndex = args.indexOf("--composition");
const composition =
  compositionIndex >= 0
    ? (args[compositionIndex + 1] ?? "accepted-main")
    : "accepted-main";

if (!existsSync(path.join(clientSource, "index.html"))) {
  console.error(
    `No compiled client at ${clientSource}. Run \`npm run build\` at the repository root first; staging never builds the game itself.`,
  );
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

const packageJson = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
if (typeof packageJson.version !== "string") {
  console.error("Repository package.json has no string version.");
  process.exit(1);
}
// Scratch continuity tests may stamp an isolated prerelease fixture
// version (e.g. 0.2.0-continuity.2) so build B is distinguishable from
// build A. This never bumps the canonical version: package.json at the
// repository root is read, never written, and the flag exists only for
// throwaway artifacts.
const fixtureIndex = args.indexOf("--fixture-version");
const fixtureVersion = fixtureIndex >= 0 ? args[fixtureIndex + 1] : undefined;
if (fixtureVersion && !fixtureVersion.startsWith(packageJson.version + "-")) {
  console.error(
    `Fixture version must be a prerelease of the canonical ${packageJson.version}.`,
  );
  process.exit(1);
}

const revision = git(["rev-parse", "HEAD"]) ?? "unknown";
const status = git(["status", "--porcelain"]);

const identity = {
  version: fixtureVersion ?? packageJson.version,
  revision,
  revisionShort: revision === "unknown" ? "unknown" : revision.slice(0, 7),
  dirty: status !== null && status !== "",
  distribution,
  channel: "internal",
  composition,
  stagedAt: new Date().toISOString(),
};

rmSync(stagedRoot, { recursive: true, force: true });
mkdirSync(stagedRoot, { recursive: true });
cpSync(clientSource, path.join(stagedRoot, "client"), { recursive: true });
writeFileSync(
  path.join(stagedRoot, "build-identity.json"),
  JSON.stringify(identity, null, 2) + "\n",
);
// Direct updater ships unconfigured. Activating it is a deliberate act:
// write an https feedURL here AND set enabled true, under explicit
// authorization — never as a side effect of packaging.
writeFileSync(
  path.join(stagedRoot, "update-config.json"),
  JSON.stringify(
    { enabled: false, channel: "internal", feedURL: null },
    null,
    2,
  ) + "\n",
);

// electron-builder reads the app version from desktop/package.json; keep
// it equal to the canonical repository version without hand-editing.
const desktopPackagePath = path.join(desktopRoot, "package.json");
const desktopPackage = JSON.parse(readFileSync(desktopPackagePath, "utf8"));
if (desktopPackage.version !== identity.version) {
  desktopPackage.version = identity.version;
  writeFileSync(
    desktopPackagePath,
    JSON.stringify(desktopPackage, null, 2) + "\n",
  );
}

console.log(
  `Staged ${identity.version} @ ${identity.revisionShort}${identity.dirty ? " (dirty)" : ""} distribution=${distribution} composition=${composition}`,
);
