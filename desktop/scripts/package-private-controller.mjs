/* global console, process */
/**
 * Packages "Our Civic Duty Private" — the owner's private hub (Play, Art
 * Desk, Agents) — as an Apple Silicon .app plus ZIP (and optional DMG).
 *
 * Usage:
 *   node scripts/package-private-controller.mjs [--no-bootstrap] [--dmg]
 *
 * By default the packaged internal art-review game in
 * release-artifacts/mac-arm64 is bundled as the hub's bootstrap build (the CI
 * launch smoke uses this). --no-bootstrap produces the owner delivery: no
 * game payload and therefore no private art in the archive; the installed hub
 * prepares the private main build locally from the pack on first start.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(desktopRoot);
const controllerRoot = path.join(desktopRoot, "private-controller");
const args = process.argv.slice(2);
const withBootstrap = !args.includes("--no-bootstrap");
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

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (process.platform !== "darwin" || process.arch !== "arm64")
  fail("The private hub is currently an Apple Silicon Mac delivery.");
if (!existsSync(electronApp))
  fail("Electron is not installed under desktop/node_modules.");
if (!existsSync(path.join(controllerRoot, "node_modules", "zod")))
  fail(
    "Hub dependencies are missing. Run npm ci in desktop/private-controller.",
  );

let identity = null;
if (withBootstrap) {
  if (!existsSync(bootstrapApp) || !existsSync(identityPath))
    fail(
      "No packaged bootstrap application. Build the internal art-review Mac directory first, or pass --no-bootstrap.",
    );
  identity = JSON.parse(readFileSync(identityPath, "utf8"));
  if (identity.profile !== "internal-art-review")
    fail("The bootstrap application is not the internal art-review profile.");
}

function git(argsList) {
  const result = spawnSync("git", argsList, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}
const hubRevision = git(["rev-parse", "HEAD"]) ?? "unknown";
const hubDirty =
  (git(["status", "--porcelain", "--", "desktop"]) ?? "unknown") !== "";
const hubVersion = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
).version;

const outputIndex = args.indexOf("--output");
const outputRoot =
  outputIndex >= 0
    ? path.resolve(
        args[outputIndex + 1] ?? fail("--output requires a directory"),
      )
    : path.join(desktopRoot, "controller-release-artifacts");
const appPath = path.join(outputRoot, "Our Civic Duty Private.app");
if (outputIndex >= 0 && existsSync(outputRoot))
  fail("The additive output directory already exists; choose a new path.");
if (outputIndex < 0) rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(electronApp, appPath, { recursive: true, verbatimSymlinks: true });

const contents = path.join(appPath, "Contents");
const resources = path.join(contents, "Resources");
rmSync(path.join(resources, "default_app.asar"), { force: true });

// The packaged layout mirrors desktop/ so relative imports stay identical.
const packagedRoot = path.join(resources, "app");
const packagedController = path.join(packagedRoot, "private-controller");
mkdirSync(packagedController, { recursive: true });
for (const name of ["app-protocol.mjs", "download-policy.mjs"])
  cpSync(path.join(desktopRoot, name), path.join(packagedRoot, name));
// The hub's own trusted health-check harness for candidate builds.
mkdirSync(path.join(packagedRoot, "scripts"), { recursive: true });
for (const name of [
  "smoke-test.mjs",
  "game-launch-environment.mjs",
  "drawn-appearance-proof.mjs",
  "saved-identity-proof.mjs",
  "creator-drive.mjs",
])
  cpSync(
    path.join(desktopRoot, "scripts", name),
    path.join(packagedRoot, "scripts", name),
  );
// The updater verifies prepared client bytes with the same trusted tree contract.
mkdirSync(path.join(resources, "scripts"), { recursive: true });
cpSync(
  path.join(repoRoot, "scripts", "client-provenance.mjs"),
  path.join(resources, "scripts", "client-provenance.mjs"),
);
const CONTROLLER_FILES = [
  "main.mjs",
  "hub-model.mjs",
  "build-catalog.mjs",
  "build-catalog.json",
  "worker-watch.mjs",
  "artdesk-host.mjs",
  "artdesk-export.mjs",
  "artdesk-preload.cjs",
  "drive-exchange.mjs",
  "preload.cjs",
  "index.html",
  "chrome.mjs",
  "notice.html",
  "notice.mjs",
  "settings.html",
  "settings.mjs",
  "agents.html",
  "agents.mjs",
  "agents-view.mjs",
  "styles.css",
  "private-update.mjs",
  "private-update-worker.mjs",
  "package.json",
];
for (const name of CONTROLLER_FILES)
  cpSync(path.join(controllerRoot, name), path.join(packagedController, name));
for (const dir of ["agents", "vendor", "node_modules"])
  cpSync(
    realpathSync(path.join(controllerRoot, dir)),
    path.join(packagedController, dir),
    {
      recursive: true,
      verbatimSymlinks: true,
    },
  );
writeFileSync(
  path.join(packagedRoot, "package.json"),
  `${JSON.stringify(
    {
      name: "our-civic-duty-private-hub",
      productName: "Our Civic Duty Private",
      version: hubVersion,
      private: true,
      main: "private-controller/main.mjs",
    },
    null,
    2,
  )}\n`,
);

if (withBootstrap) {
  mkdirSync(path.join(resources, "bootstrap"), { recursive: true });
  cpSync(
    bootstrapApp,
    path.join(resources, "bootstrap", "Our Civic Duty.app"),
    { recursive: true, verbatimSymlinks: true },
  );
}

// A distributable .app must not retain links to this build machine. Node's
// default recursive copy rewrites relative framework links as absolute paths.
const frameworkLinks = [
  path.join(
    contents,
    "Frameworks",
    "Electron Framework.framework",
    "Resources",
  ),
];
if (withBootstrap)
  frameworkLinks.push(
    path.join(
      resources,
      "bootstrap",
      "Our Civic Duty.app",
      "Contents",
      "Frameworks",
      "Electron Framework.framework",
      "Resources",
    ),
  );
for (const linkPath of frameworkLinks) {
  if (
    !lstatSync(linkPath).isSymbolicLink() ||
    path.isAbsolute(readlinkSync(linkPath))
  )
    fail(`Refusing non-portable framework link: ${linkPath}`);
}

// Private art never rides in a delivered hub archive: refuse any raster whose
// bytes are listed in the configured private pack manifest.
const packRoot = process.env.OCD_PRIVATE_PACK ?? null;
if (!withBootstrap && packRoot) {
  const privateHashes = new Set(
    readFileSync(path.join(packRoot, "sha256.txt"), "utf8")
      .split("\n")
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean),
  );
  let scanned = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(full);
      else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
        scanned += 1;
        const digest = createHash("sha256")
          .update(readFileSync(full))
          .digest("hex");
        if (privateHashes.has(digest))
          fail(`Refusing to package private art: ${full}`);
      }
    }
  };
  walk(appPath);
  console.log(
    `Private-art exclusion: ${scanned} rasters scanned, none in the pack.`,
  );
}

const plistPath = path.join(contents, "Info.plist");
for (const [key, value] of [
  ["CFBundleIdentifier", "com.ourcivicduty.private-controller"],
  ["CFBundleName", "Our Civic Duty Private"],
  ["CFBundleDisplayName", "Our Civic Duty Private"],
  ["CFBundleShortVersionString", hubVersion],
  ["CFBundleVersion", `${hubVersion}.${hubRevision.slice(0, 7)}`],
  ["LSApplicationCategoryType", "public.app-category.developer-tools"],
  ["LSMinimumSystemVersion", "13.0"],
]) {
  const replaced = spawnSync(
    "/usr/bin/plutil",
    ["-replace", key, "-string", value, plistPath],
    { stdio: "inherit" },
  );
  if (replaced.status !== 0) process.exit(replaced.status ?? 1);
}

const hubBuild = {
  schema: 2,
  hub: {
    revision: hubRevision,
    desktopDirty: hubDirty,
    version: hubVersion,
    architecture: process.arch,
    signing: "ad-hoc only (no Developer ID, not notarized)",
    packagedAt: new Date().toISOString(),
  },
  bootstrap: identity
    ? {
        revision: identity.revision,
        version: identity.version,
        profile: identity.profile,
        clientTreeSha256: identity.clientTreeSha256 ?? null,
        privatePack: null,
      }
    : null,
};
writeFileSync(
  path.join(resources, "hub-build.json"),
  `${JSON.stringify(hubBuild, null, 2)}\n`,
);
writeFileSync(
  path.join(resources, "controller-build.json"),
  `${JSON.stringify(
    {
      schema: 1,
      bootstrapRevision: identity?.revision ?? null,
      bootstrapVersion: identity?.version ?? null,
      bootstrapProfile: identity?.profile ?? null,
      architecture: process.arch,
    },
    null,
    2,
  )}\n`,
);

// Re-seal the modified bundle ad hoc so Apple Silicon launches it. This is
// not Developer ID signing or notarization.
const signed = spawnSync(
  "/usr/bin/codesign",
  ["--force", "--deep", "--sign", "-", appPath],
  { stdio: "inherit" },
);
if (signed.status !== 0) fail("Ad-hoc signing failed.");

const label = identity
  ? `${hubVersion}-${hubRevision.slice(0, 12)}-game-${identity.revision.slice(0, 12)}`
  : `${hubVersion}-${hubRevision.slice(0, 12)}`;
const base = `Our-Civic-Duty-Private-Hub-${label}-arm64`;
const zipPath = path.join(outputRoot, `${base}.zip`);
const zipped = spawnSync(
  "/usr/bin/ditto",
  ["-c", "-k", "--sequesterRsrc", "--keepParent", appPath, zipPath],
  { stdio: "inherit" },
);
if (zipped.status !== 0) process.exit(zipped.status ?? 1);
const archives = [zipPath];
if (args.includes("--dmg")) {
  const dmgRoot = path.join(outputRoot, "dmg-root");
  mkdirSync(dmgRoot, { recursive: true });
  cpSync(appPath, path.join(dmgRoot, "Our Civic Duty Private.app"), {
    recursive: true,
    verbatimSymlinks: true,
  });
  spawnSync("/bin/ln", [
    "-s",
    "/Applications",
    path.join(dmgRoot, "Applications"),
  ]);
  const dmgPath = path.join(outputRoot, `${base}.dmg`);
  const made = spawnSync(
    "/usr/bin/hdiutil",
    [
      "create",
      "-volname",
      "Our Civic Duty Private",
      "-srcfolder",
      dmgRoot,
      "-ov",
      "-format",
      "UDZO",
      dmgPath,
    ],
    { stdio: "inherit" },
  );
  rmSync(dmgRoot, { recursive: true, force: true });
  if (made.status !== 0) fail("DMG creation failed.");
  archives.push(dmgPath);
}
const sums = archives
  .map(
    (file) =>
      `${createHash("sha256").update(readFileSync(file)).digest("hex")}  ${path.basename(file)}`,
  )
  .join("\n");
writeFileSync(
  path.join(outputRoot, "SHA256SUMS-private-controller.txt"),
  `${sums}\n`,
);
writeFileSync(
  path.join(outputRoot, "hub-build.json"),
  `${JSON.stringify(hubBuild, null, 2)}\n`,
);
console.log(`Private hub: ${appPath}`);
for (const file of archives) console.log(`Installable archive: ${file}`);
console.log(sums);
