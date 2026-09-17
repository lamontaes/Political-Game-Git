/* global console, document, process, setTimeout, window */
/**
 * CRUNCH46 H1–H3 proof on the packaged hub, in an isolated data root.
 *
 *   1. Main plays; the owner picks a branch preview that has no build. The
 *      selection stays, "Preparing" shows, and main stays on screen, named.
 *   2. That branch predates the desktop app: the build fails in seconds as
 *      unsupported, and the selection still stays.
 *   3. Relaunch: the requested selection is retained and main still plays.
 *   4. Back to main, Check for updates: up to date against the remote.
 *   5. Offline (dead proxy): Could not check, last success kept, main plays.
 *   6. A real preview build is started and cancelled: Check cancelled, the
 *      selection and the loaded game are unchanged.
 *   Screenshots of the bar at 1440x900, 1280x720 and 1024x768.
 *
 * Usage:
 *   node scripts/hub-selection-proof.mjs --hub <hub executable>
 *     --main-app <Internal Art Review.app> --repo <repository> --pack <pack>
 *     [--unsupported <branch>] [--buildable <branch>] [--data-root <dir>]
 *     [--screenshot-dir <dir>]
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { _electron as electron } from "playwright";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const hubExecutable = value("--hub");
const mainApp = value("--main-app");
const repository = value("--repo");
const pack = value("--pack");
const unsupportedBranch =
  value("--unsupported") ?? "antigravity/national-legislative-source-corpus";
const buildableBranch =
  value("--buildable") ?? "claude/ui-decision-follow-through";
if (!hubExecutable || !mainApp || !repository || !pack) {
  console.error(
    "Usage: node scripts/hub-selection-proof.mjs --hub <exe> --main-app <app> --repo <dir> --pack <dir> [--unsupported <branch>] [--buildable <branch>] [--data-root <dir>] [--screenshot-dir <dir>]",
  );
  process.exit(2);
}
const dataRoot =
  value("--data-root") ?? mkdtempSync(path.join(os.tmpdir(), "ocd-hub-sel-"));
const shots = value("--screenshot-dir");
if (shots) mkdirSync(shots, { recursive: true });
mkdirSync(dataRoot, { recursive: true });
const statePath = path.join(dataRoot, "state.json");
const checksPath = path.join(dataRoot, "update-checks.json");

const identity = JSON.parse(
  readFileSync(
    path.join(mainApp, "Contents", "Resources", "build-identity.json"),
    "utf8",
  ),
);
const packRecord = JSON.parse(
  readFileSync(path.join(pack, "pack.json"), "utf8"),
);
writeFileSync(
  statePath,
  `${JSON.stringify(
    {
      schema: 2,
      repositoryPath: path.resolve(repository),
      privatePackPath: path.resolve(pack),
      selectedTrack: "main",
      tracks: {
        main: {
          branch: "main",
          current: {
            revision: identity.revision,
            appPath: path.resolve(mainApp),
            version: identity.version,
            profile: identity.profile,
            architecture: "arm64 (fixture record)",
            installedAt: new Date().toISOString(),
            clientTreeSha256: identity.clientTreeSha256 ?? "unknown",
            privatePack: {
              packId: String(packRecord.packId),
              manifestSha256: String(packRecord.manifestSha256),
            },
          },
          pending: null,
          previous: null,
        },
      },
    },
    null,
    2,
  )}\n`,
);

const failures = [];
const check = (label, condition, detail = "") => {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, label, timeout = 60000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const result = await predicate();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
    await sleep(250);
  }
};
const rawState = () => JSON.parse(readFileSync(statePath, "utf8"));
const checks = () => {
  try {
    return JSON.parse(readFileSync(checksPath, "utf8"));
  } catch {
    return {};
  }
};

async function launchHub(extraEnv = {}) {
  const app = await electron.launch({
    executablePath: path.resolve(hubExecutable),
    env: {
      ...process.env,
      OCD_CONTROLLER_DATA_ROOT: dataRoot,
      OCD_HUB_SKIP_STARTUP_CHECK: "1",
      OCD_HUB_NO_ARTDESK_AUTOSTART: "1",
      ...extraEnv,
    },
  });
  const pageFor = (pattern) =>
    app.windows().find((page) => pattern.test(page.url()));
  const chrome = await waitFor(
    () => pageFor(/^file:.*\/index\.html$/),
    "hub chrome",
  );
  await waitFor(() => pageFor(/^app:\/\/game\//), "Play view");
  const state = () => chrome.evaluate(() => window.ocdHub.state());
  return { app, chrome, state };
}

async function shoot(app, chrome, name) {
  if (!shots) return;
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [1024, 768],
  ]) {
    await app.evaluate(
      ({ BaseWindow }, size) => {
        const window = BaseWindow.getAllWindows()[0];
        window.setContentSize(size.width, size.height);
      },
      { width, height },
    );
    await sleep(700);
    const visible = await chrome.evaluate(() =>
      ["track", "check-updates", "status"].every((id) => {
        const box = document.getElementById(id).getBoundingClientRect();
        return box.width > 0 && box.right <= window.innerWidth + 1;
      }),
    );
    check(`bar controls visible at ${width}x${height} (${name})`, visible);
    await chrome.screenshot({
      path: path.join(shots, `${name}-${width}x${height}-bar.png`),
    });
  }
}

// 1–2: unbuilt, unsupported preview.
let hub = await launchHub();
let s = await hub.state();
check("main plays first", s.loaded?.track === "main", JSON.stringify(s.loaded));
const chooser = await hub.chrome.evaluate(() => window.ocdHub.branches());
check(
  "Game build chooser lists Main game first with feature previews",
  chooser.ok &&
    chooser.chooser.main.title === "Main game (recommended)" &&
    chooser.chooser.previews.some(
      (item) => item.title === "Menus, creator and Calendar improvements",
    ),
  chooser.ok
    ? `${chooser.chooser.previews.length} previews, ${chooser.chooser.technical.length} technical`
    : chooser.message,
);
await hub.chrome.evaluate(
  (branch) => window.ocdHub.selectTrack(branch),
  unsupportedBranch,
);
s = await hub.state();
check(
  "unbuilt selection is kept while preparing",
  s.selectedTrack === `branch:${unsupportedBranch}` && !s.selectedBuilt,
);
check(
  "the old game stays on screen and is named",
  s.loaded?.track === "main",
  JSON.stringify(s.loaded),
);
const preparingText = await hub.chrome.locator("#status").innerText();
check(
  "status says Preparing and still showing Main game",
  /Preparing/.test(preparingText) &&
    /still showing Main game/.test(preparingText),
  preparingText,
);
await shoot(hub.app, hub.chrome, "01-preparing");
await waitFor(
  () => checks()[`branch:${unsupportedBranch}`]?.outcome === "unsupported",
  "unsupported outcome",
  120000,
);
await waitFor(async () => !(await hub.state()).building, "worker exit", 30000);
s = await hub.state();
check(
  "old branch fails fast as unsupported; selection still kept",
  s.selectedTrack === `branch:${unsupportedBranch}` &&
    s.update.kind === "unsupported",
  s.update.text,
);
check(
  "requested selection is written to disk",
  rawState().selectedTrack === `branch:${unsupportedBranch}`,
);
await shoot(hub.app, hub.chrome, "02-unsupported");
await hub.app.close();

// 3: relaunch keeps the request.
hub = await launchHub();
s = await hub.state();
check(
  "relaunch retains the requested selection",
  s.selectedTrack === `branch:${unsupportedBranch}`,
);
check("relaunch still plays main", s.loaded?.track === "main");

// 4: back to main, check for updates.
await hub.chrome.evaluate(() => window.ocdHub.returnMain());
await hub.chrome.evaluate(() => window.ocdHub.checkUpdates());
await waitFor(
  () =>
    ["up-to-date", "ready", "waiting", "failed"].includes(
      checks().main?.outcome,
    ),
  "main check",
  180000,
);
s = await hub.state();
check(
  "Check for updates reports Up to date for current main",
  s.update.kind === "current" && Boolean(s.update.lastSuccessAt),
  `${s.update.text} · ${checks().main?.message ?? ""}`,
);
const lastSuccess = s.update.lastSuccessAt;
await shoot(hub.app, hub.chrome, "03-up-to-date");
await hub.app.close();

// 5: offline keeps last-good and never claims up to date.
hub = await launchHub({
  HTTPS_PROXY: "http://127.0.0.1:9",
  https_proxy: "http://127.0.0.1:9",
  ALL_PROXY: "http://127.0.0.1:9",
});
await hub.chrome.evaluate(() => window.ocdHub.checkUpdates());
await waitFor(
  () => ["offline", "failed"].includes(checks().main?.outcome),
  "offline check",
  120000,
);
s = await hub.state();
check(
  "offline check says Could not check and keeps the last success time",
  s.update.kind === "failed" && s.update.lastSuccessAt === lastSuccess,
  s.update.text,
);
check("main still plays offline", s.loaded?.track === "main");
const retry = await hub.chrome.locator("#check-updates").innerText();
check("the button offers a retry", /Try again/.test(retry), retry);
await shoot(hub.app, hub.chrome, "04-offline");
await hub.app.close();

// 6: a real preview build, cancelled part-way.
hub = await launchHub();
await hub.chrome.evaluate(
  (branch) => window.ocdHub.selectTrack(branch),
  buildableBranch,
);
// Cancel part-way: the target is resolved and the build is under way.
await waitFor(
  async () => {
    const now = await hub.state();
    return (
      now.building === `branch:${buildableBranch}` &&
      Boolean(now.update.latestRevision)
    );
  },
  "preview build under way",
  180000,
);
const repeat = await hub.chrome.evaluate(() => window.ocdHub.checkUpdates());
check(
  "a repeated check does not start a second build",
  /Already checking/.test(repeat.message ?? ""),
  repeat.message,
);
await hub.chrome.evaluate(() => window.ocdHub.cancelBuild());
await waitFor(
  async () => !(await hub.state()).building,
  "build stopped",
  120000,
);
s = await hub.state();
check(
  "cancel leaves the selection and the loaded game unchanged",
  s.selectedTrack === `branch:${buildableBranch}` &&
    !s.selectedBuilt &&
    s.loaded?.track === "main",
);
check(
  "cancel is recorded as cancelled or failed, not as ready",
  ["cancelled", "failed"].includes(
    checks()[`branch:${buildableBranch}`]?.outcome,
  ),
  checks()[`branch:${buildableBranch}`]?.outcome,
);
await shoot(hub.app, hub.chrome, "05-cancelled");
await hub.chrome.evaluate(() => window.ocdHub.returnMain());
await hub.app.close();

assert.equal(rawState().tracks.main.current.revision, identity.revision);
console.log(`data root: ${dataRoot}`);
if (failures.length) {
  console.log(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("All hub selection checks passed.");
