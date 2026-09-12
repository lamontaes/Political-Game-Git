/* global console, process */

import { spawnSync } from "node:child_process";
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
const controllerRoot = path.join(desktopRoot, "private-controller");
const bootstrapApp = path.join(
  desktopRoot,
  "release-artifacts",
  "mac-arm64",
  "Our Civic Duty.app",
);
const identityPath = path.join(
  bootstrapApp,
  "Contents",
  "Resources",
  "build-identity.json",
);
const electronApp = path.join(
  desktopRoot,
  "node_modules",
  "electron",
  "dist",
  "Electron.app",
);

if (process.platform !== "darwin" || process.arch !== "arm64") {
  console.error("The private controller is currently an Apple Silicon Mac delivery.");
  process.exit(1);
}
if (!existsSync(bootstrapApp) || !existsSync(identityPath)) {
  console.error(
    "No packaged bootstrap application. Build the internal art-review Mac directory first.",
  );
  process.exit(1);
}
if (!existsSync(electronApp)) {
  console.error("Electron is not installed under desktop/node_modules.");
  process.exit(1);
}
const identity = JSON.parse(readFileSync(identityPath, "utf8"));
if (identity.profile !== "internal-art-review") {
  console.error("The bootstrap application is not the internal art-review profile.");
  process.exit(1);
}

const outputRoot = path.join(desktopRoot, "controller-release-artifacts");
const appPath = path.join(outputRoot, "Our Civic Duty Private.app");
rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(electronApp, appPath, { recursive: true });

const contents = path.join(appPath, "Contents");
const resources = path.join(contents, "Resources");

const packagedSource = path.join(resources, "app");
mkdirSync(packagedSource, { recursive: true });
for (const name of [
  "package.json",
  "main.mjs",
  "preload.cjs",
  "index.html",
  "renderer.mjs",
  "styles.css",
  "private-update.mjs",
  "private-update-worker.mjs",
]) {
  cpSync(path.join(controllerRoot, name), path.join(packagedSource, name));
}
mkdirSync(path.join(resources, "bootstrap"), { recursive: true });
cpSync(bootstrapApp, path.join(resources, "bootstrap", "Our Civic Duty.app"), {
  recursive: true,
});

// Preserve Electron's framework-sensitive metadata, including its executable,
// principal class, SDK fields, and asar-integrity record. A minimal replacement
// plist makes Chromium lose the Framework Resources path on macOS.
const plistPath = path.join(contents, "Info.plist");
for (const [key, value] of [
  ["CFBundleIdentifier", "com.ourcivicduty.private-controller"],
  ["CFBundleName", "Our Civic Duty Private"],
  ["CFBundleDisplayName", "Our Civic Duty Private"],
  ["CFBundleShortVersionString", identity.version],
  ["CFBundleVersion", identity.version],
  ["LSApplicationCategoryType", "public.app-category.simulation-games"],
  ["LSMinimumSystemVersion", "13.0"],
]) {
  const replaced = spawnSync(
    "/usr/bin/plutil",
    ["-replace", key, "-string", value, plistPath],
    { stdio: "inherit" },
  );
  if (replaced.status !== 0) process.exit(replaced.status ?? 1);
}
writeFileSync(
  path.join(resources, "controller-build.json"),
  `${JSON.stringify(
    {
      schema: 1,
      bootstrapRevision: identity.revision,
      bootstrapVersion: identity.version,
      bootstrapProfile: identity.profile,
      architecture: process.arch,
    },
    null,
    2,
  )}\n`,
);

const zipPath = path.join(
  outputRoot,
  `Our-Civic-Duty-Private-${identity.version}-${identity.revision.slice(0, 12)}-arm64.zip`,
);
const zipped = spawnSync(
  "/usr/bin/ditto",
  ["-c", "-k", "--sequesterRsrc", "--keepParent", appPath, zipPath],
  { stdio: "inherit" },
);
if (zipped.status !== 0) process.exit(zipped.status ?? 1);
console.log(`Private controller: ${appPath}`);
console.log(`Installable archive: ${zipPath}`);
