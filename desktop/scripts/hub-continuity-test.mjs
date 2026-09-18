/* global console, document, process, setTimeout */
/**
 * Private hub continuity proof on real packaged builds, in an isolated data
 * root:
 *
 *   1. Play build A, create and keep a real life, quit through the hub.
 *   2. Record build B as verified-and-waiting (what the worker does), relaunch:
 *      the hub activates B before Play opens; Continue shows the same saved
 *      World, person and appearance, and Play requests stay on app://game.
 *   3. Select a branch-preview track (build B): its profile is isolated (no
 *      main life); its creator draws decoded current private people; Return to
 *      main shows the life again. Nothing is saved in the preview.
 *
 * Usage:
 *   node scripts/hub-continuity-test.mjs --hub <hub executable>
 *     --build-a <Internal Art Review.app> --build-b <Internal Art Review.app>
 *     [--pack <private pack dir>] [--data-root <dir>] [--screenshot-dir <dir>]
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { _electron as electron } from "playwright";

import { chooseStartAge } from "./creator-drive.mjs";

import {
  readSavedRecords,
  sameSavedIdentity,
  savedIdentity,
} from "./saved-identity-proof.mjs";
import { chooseStartAge } from "./creator-drive.mjs";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const hubExecutable = value("--hub");
const buildA = value("--build-a");
const buildB = value("--build-b");
if (!hubExecutable || !buildA || !buildB) {
  console.error(
    "Usage: node scripts/hub-continuity-test.mjs --hub <exe> --build-a <app> --build-b <app> [--pack <dir>] [--data-root <dir>] [--screenshot-dir <dir>]",
  );
  process.exit(2);
}
const dataRoot =
  value("--data-root") ?? mkdtempSync(path.join(os.tmpdir(), "ocd-hub-cont-"));
const shots = value("--screenshot-dir");
if (shots) mkdirSync(shots, { recursive: true });
const DATABASE = "political-life-worlds-art-preview";
mkdirSync(dataRoot, { recursive: true });
const statePath = path.join(dataRoot, "state.json");

const identityOf = (app) =>
  JSON.parse(
    readFileSync(
      path.join(app, "Contents", "Resources", "build-identity.json"),
      "utf8",
    ),
  );
/*
 * The pack the delivery claims, stamped into the record: L2 asks that a
 * staged build prove code revision and pack identity from the record alone,
 * so a proof that leaves it null cannot demonstrate the promise.
 */
const packPath = value("--pack");
const packRecord = packPath
  ? JSON.parse(readFileSync(path.join(packPath, "pack.json"), "utf8"))
  : null;
const packStamp = packRecord
  ? {
      packId: String(packRecord.packId),
      manifestSha256: String(packRecord.manifestSha256),
    }
  : null;

const record = (app) => {
  const identity = identityOf(app);
  return {
    revision: identity.revision,
    appPath: path.resolve(app),
    version: identity.version,
    profile: identity.profile,
    architecture: "arm64 (fixture record)",
    installedAt: new Date().toISOString(),
    clientTreeSha256: identity.clientTreeSha256 ?? "unknown",
    privatePack: packStamp,
  };
};
const A = record(buildA);
const B = record(buildB);
assert.notEqual(A.revision, B.revision, "A and B must be different builds");

const failures = [];
const check = (label, condition, detail = "") => {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, label, timeout = 45000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const result = await predicate();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
    await sleep(250);
  }
};

function writeState(tracks, selectedTrack = "main") {
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        schema: 2,
        repositoryPath: null,
        privatePackPath: null,
        selectedTrack,
        tracks,
      },
      null,
      2,
    )}\n`,
  );
}

async function launchHub() {
  const app = await electron.launch({
    executablePath: path.resolve(hubExecutable),
    env: {
      ...process.env,
      OCD_CONTROLLER_DATA_ROOT: dataRoot,
      OCD_HUB_SKIP_STARTUP_CHECK: "1",
      OCD_HUB_NO_BUILDS: "1",
      OCD_HUB_NO_ARTDESK_AUTOSTART: "1",
    },
  });
  const pageFor = (pattern) =>
    app.windows().find((page) => pattern.test(page.url()));
  const chrome = await waitFor(
    () => pageFor(/^file:.*\/index\.html$/),
    "hub chrome",
  );
  const play = await waitFor(() => pageFor(/^app:\/\/game\//), "Play view");
  await play.waitForLoadState("domcontentloaded");
  const foreign = [];
  play.on("request", (request) => {
    const url = request.url();
    if (!/^(app:\/\/game\/|blob:app:\/\/game\/|data:)/.test(url))
      foreign.push(url);
  });
  return { app, chrome, play, foreign, pageFor };
}

async function quitHub(app) {
  // The hub's own quit path: closes Play through its unload guard.
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await app.waitForEvent("close", { timeout: 30000 }).catch(() => {});
}

async function createAndKeepLife(page) {
  await page.getByTestId("new-game").click();
  await page.getByTestId("setup-screen").waitFor();
  await page.getByTestId("start-normal").click();
  await page.getByTestId("creator-stage-character").waitFor();
  await chooseStartAge(page, 31);
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("creator-stage-place").waitFor();
  await page.getByTestId("state-search").fill("Kentucky");
  await page.getByTestId("state-KY").click();
  await page.getByTestId("place-search").fill("Kentu");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Kentucky/i })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();
  await page.getByTestId("creator-stage-whoareyou").waitFor();
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  const gate = page.getByTestId("introduction-continue");
  try {
    await gate.waitFor({ timeout: 5000 });
    await gate.click();
  } catch {
    /* no household introduction */
  }
  await page.getByTestId("play-screen").waitFor();
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("shell-nav-flyout").waitFor();
  await page.getByTestId("keep-world").click();
  await page
    .getByTestId("keep-world")
    .waitFor({ state: "detached", timeout: 15000 });
  await page.getByText("Saved.", { exact: true }).waitFor({ timeout: 15000 });
  await page.getByTestId("shell-nav-cluster").click();
}

const selectedTab = (chrome, name) =>
  chrome.getByRole("tab", { name }).getAttribute("aria-selected");

// ---- 1. Build A: create and keep a life -----------------------------------
writeState({
  main: { branch: "main", current: A, pending: null, previous: null },
});
let expected;
{
  const { app, chrome, play } = await launchHub();
  check(
    "A: Play serves build A over app://game",
    play.url().startsWith("app://game/"),
  );
  await createAndKeepLife(play);
  const records = await readSavedRecords(play, DATABASE);
  check("A: exactly one kept life", records.worlds.length === 1);
  expected = savedIdentity(records.worlds[0]);
  // Tab switching hides the game; it does not unload the life.
  const marker = await play.evaluate(() => {
    globalThis.__hubMarker = Date.now();
    return globalThis.__hubMarker;
  });
  await chrome.getByRole("tab", { name: "Settings" }).click();
  await waitFor(
    async () => (await selectedTab(chrome, "Settings")) === "true",
    "Settings tab",
  );
  await chrome.getByRole("tab", { name: "Play" }).click();
  await waitFor(
    async () => (await selectedTab(chrome, "Play")) === "true",
    "Play tab",
  );
  check(
    "A: switching tabs kept the running life loaded",
    (await play.evaluate(() => globalThis.__hubMarker)) === marker &&
      (await play.getByTestId("play-screen").isVisible()),
  );
  if (shots) await play.screenshot({ path: path.join(shots, "a-play.png") });
  await quitHub(app);
}

// ---- 2. B waits, relaunch activates it, same life continues ----------------
{
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  state.tracks.main.pending = B;
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  const { app, chrome, play, foreign } = await launchHub();
  const after = JSON.parse(readFileSync(statePath, "utf8"));
  check(
    "B: waiting build activated at start, A retained as previous",
    after.tracks.main.current.revision === B.revision &&
      after.tracks.main.previous?.revision === A.revision &&
      after.tracks.main.pending === null,
  );
  await play.getByTestId("continue").click();
  await play.getByTestId("play-screen").waitFor({ timeout: 20000 });
  const records = await readSavedRecords(play, DATABASE);
  check(
    "B: same kept World, person and appearance after A-to-B",
    records.worlds.length === 1 &&
      sameSavedIdentity(expected, savedIdentity(records.worlds[0])),
    JSON.stringify({ worldId: expected.worldId, personId: expected.personId }),
  );
  if (packStamp) {
    const stamped = JSON.parse(readFileSync(statePath, "utf8")).tracks?.main
      ?.current?.privatePack;
    check(
      "B: the activated record names the pack it was built with",
      stamped?.packId === packStamp.packId &&
        stamped?.manifestSha256 === packStamp.manifestSha256,
      JSON.stringify(stamped),
    );
  }
  check(
    "B: Play made no request outside the packaged origin",
    foreign.length === 0,
    foreign.slice(0, 3).join(", "),
  );
  // The collapsed bar names the build in words; the exact SHA lives behind
  // the technical-detail toggle (CRUNCH47 A2: readable title, SHA separately).
  const collapsed = await chrome.locator("#status").textContent();
  check(
    "B: the bar names the playing build in words",
    collapsed.includes("Main game"),
    collapsed,
  );
  await chrome.locator("#build-details").click();
  const status = await chrome.locator("#status").textContent();
  check(
    "B: the technical detail carries the exact revision",
    status.includes(B.revision.slice(0, 12)),
    status,
  );
  await chrome.locator("#build-details").click();
  if (shots) await play.screenshot({ path: path.join(shots, "b-play.png") });
  // Current private people: open the saved person's wardrobe figure.
  await play.getByTestId("shell-nav-cluster").click();
  await play.getByTestId("nav-group-personal").click();
  await play.getByTestId("nav-personal").click();
  await play.getByTestId("personal-appearance").click();
  await play.getByTestId("full-dossier").waitFor();
  await play
    .getByTestId("saved-appearance-controls")
    .getByText("Appearance and wardrobe", { exact: true })
    .click();
  const figure = play.getByTestId("wardrobe-full-body");
  await figure.waitFor();
  await play.waitForFunction(
    () =>
      document.querySelector('[data-testid="wardrobe-full-body"]')?.dataset
        .complete === "true",
    undefined,
    { timeout: 20000 },
  );
  const layers = await figure.evaluate((element) =>
    Array.from(element.querySelectorAll("img"), (img) => ({
      assetId: img.dataset.assetId,
      decoded: img.complete && img.naturalWidth > 0,
      width: img.naturalWidth,
      height: img.naturalHeight,
    })),
  );
  // A life keeps the appearance it was saved with; B must still decode it.
  check(
    "B: the life's saved appearance still decodes on the newer build",
    layers.length > 0 && layers.every((layer) => layer.decoded),
    layers
      .map((layer) => `${layer.assetId} ${layer.width}x${layer.height}`)
      .join(", "),
  );
  if (shots)
    await figure.screenshot({ path: path.join(shots, "b-person.png") });
  await play.getByTestId("person-workspace-close").click();
  await quitHub(app);
}

// ---- 3. Branch preview profile is isolated ---------------------------------
{
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  state.tracks["branch:hub-isolation-fixture"] = {
    branch: "hub-isolation-fixture",
    current: B,
    pending: null,
    previous: null,
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  const { app, chrome, pageFor } = await launchHub();
  const combo = chrome.getByRole("combobox", { name: "Game build" });
  // A build made here with no branch on the remote is a technical entry, so
  // the owner asks for those first; this proves it is still reachable.
  await waitFor(
    async () =>
      (await combo.locator("option").allTextContents()).some((t) =>
        /technical branches/i.test(t),
      ),
    "technical toggle",
  );
  await combo.selectOption("__technical__");
  await waitFor(
    async () =>
      (await combo.locator("option").allTextContents()).some((t) =>
        t.includes("hub-isolation-fixture"),
      ),
    "branch option",
  );
  await combo.selectOption("hub-isolation-fixture");
  const pages = () =>
    app.windows().filter((page) => page.url().startsWith("app://game/"));
  await waitFor(() => pages().length >= 2, "branch Play view");
  const branchPage = pages().at(-1);
  await branchPage.waitForLoadState("domcontentloaded");
  await branchPage.getByTestId("new-game").waitFor();
  const branchRecords = await readSavedRecords(branchPage, DATABASE);
  check(
    "branch: preview profile does not see the main life",
    branchRecords.worlds.length === 0,
  );
  // Current private people in build B's creator; nothing is saved.
  await branchPage.getByTestId("new-game").click();
  await branchPage.getByTestId("setup-screen").waitFor();
  await branchPage.getByTestId("start-normal").click();
  await branchPage.getByTestId("creator-stage-character").waitFor();
  // The accepted creator derives age from the full birthday, so the proof
  // answers gender, name and birthday the way a player does.
  await chooseStartAge(branchPage, 29);
  await branchPage.getByTestId("creator-continue-character").click();
  await branchPage.getByTestId("state-search").fill("Kentucky");
  await branchPage.getByTestId("state-KY").click();
  await branchPage.getByTestId("place-search").fill("Kentu");
  await branchPage
    .getByTestId("place-choices")
    .getByRole("button", { name: /Kentucky/i })
    .first()
    .click();
  await branchPage.getByTestId("creator-continue-place").click();
  await branchPage.getByTestId("creator-stage-whoareyou").waitFor();
  await branchPage.getByTestId("whoareyou-play").click();
  const stage = branchPage.getByTestId("creator-stage-appearance");
  await stage.waitFor();
  await branchPage.waitForFunction(
    () =>
      Array.from(
        document.querySelectorAll(
          '[data-testid="creator-stage-appearance"] img[data-asset-id]',
        ),
      ).some((img) => img.complete && img.naturalWidth > 0),
    undefined,
    { timeout: 20000 },
  );
  const creatorLayers = await stage.evaluate((element) =>
    Array.from(element.querySelectorAll("img[data-asset-id]"), (img) => ({
      assetId: img.dataset.assetId,
      decoded: img.complete && img.naturalWidth > 0,
      width: img.naturalWidth,
      height: img.naturalHeight,
    })),
  );
  // Private-pack people, whatever generation the staged pack carries: the
  // point is that the creator draws decoded pack art, not that it is ep4x.
  const currentPeople = creatorLayers.filter((layer) =>
    /^(ep\d+[-_]|pv\d+_|wave_a_)/.test(layer.assetId ?? ""),
  );
  check(
    "B: creator draws decoded private-pack people layers",
    currentPeople.length > 0 && currentPeople.every((layer) => layer.decoded),
    currentPeople
      .map((layer) => `${layer.assetId} ${layer.width}x${layer.height}`)
      .join(", "),
  );
  if (shots)
    await stage.screenshot({ path: path.join(shots, "b-creator.png") });
  await chrome.getByRole("button", { name: "Back to main game" }).click();
  const mainPage = pageFor(/^app:\/\/game\//);
  const mainRecords = await readSavedRecords(mainPage, DATABASE);
  check(
    "branch: main still holds exactly the kept life",
    mainRecords.worlds.length === 1 &&
      sameSavedIdentity(expected, savedIdentity(mainRecords.worlds[0])),
  );
  const finalState = JSON.parse(readFileSync(statePath, "utf8"));
  check(
    "branch: Return to main reselects main",
    finalState.selectedTrack === "main",
  );
  await quitHub(app);
}

console.log(`Isolated hub data: ${dataRoot}`);
if (failures.length) {
  console.error(`${failures.length} continuity check(s) failed.`);
  process.exit(1);
}
console.log("Hub continuity checks passed.");
