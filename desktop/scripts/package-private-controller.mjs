/* global console, process */

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
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
const macOS = path.join(contents, "MacOS");
const resources = path.join(contents, "Resources");
const oldExecutable = path.join(macOS, "Electron");
const executable = path.join(macOS, "Our Civic Duty Private");
renameSync(oldExecutable, executable);
chmodSync(executable, 0o755);

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

writeFileSync(
  path.join(contents, "Info.plist"),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>Our Civic Duty Private</string>
  <key>CFBundleIdentifier</key><string>com.ourcivicduty.private-controller</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Our Civic Duty Private</string>
  <key>CFBundleDisplayName</key><string>Our Civic Duty Private</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${identity.version}</string>
  <key>CFBundleVersion</key><string>${identity.version}</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.simulation-games</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSPrincipalClass</key><string>NSApplication</string>
</dict>
</plist>
`,
);
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
