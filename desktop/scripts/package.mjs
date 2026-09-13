/* global console, process */
/**
 * Run electron-builder with the staged build identity's version injected
 * through extraMetadata, so packaging carries the canonical repository
 * version without ever mutating the tracked desktop/package.json (whose
 * version is a fixed placeholder). A clean source tree stays clean before
 * and after staging and packaging; artifact names, the packaged app
 * version, and the About/build identity all come from the same stamp.
 *
 * Usage: node scripts/package.mjs <electron-builder args…>
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const identityPath = path.join(desktopRoot, "staged", "build-identity.json");

let identity;
try {
  identity = JSON.parse(readFileSync(identityPath, "utf8"));
} catch {
  console.error(
    "No staged build identity. Run `node scripts/stage.mjs` first.",
  );
  process.exit(1);
}
if (typeof identity.version !== "string" || identity.version === "") {
  console.error("Staged build identity has no version.");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "electron-builder",
    `-c.extraMetadata.version=${identity.version}`,
    ...process.argv.slice(2),
  ],
  { cwd: desktopRoot, stdio: "inherit", shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
