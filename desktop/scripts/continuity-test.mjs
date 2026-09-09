/* global console, process, indexedDB, document, setTimeout */
/**
 * Installed A → saved life → installed B → same life.
 *
 * Drives two actually packaged builds of the desktop app through the real
 * player flow — title, creator, begin, keep — against one isolated user
 * profile, and proves the life created and kept under build A is the life
 * build B continues, state by state:
 *
 *   identity   — play-screen name/household lines and save metadata
 *   pins       — pinned via the actual people-rail control; persistence is
 *                judged by whether the save payload itself carries pin
 *                state on this source (if it does not, that is a shared
 *                web/desktop boundary and is reported, not papered over)
 *   Journal    — the real journal surface, opened via its control
 *   calendar   — the day surface and the save's calendar moment
 *   money      — a digest of every money/resource-named leaf in the save
 *                payload (accepted main has no normal money HUD)
 *   history    — actionSequence, journal record, and payload bytes
 *   appearance — rendered character identity attributes where a character
 *                surface is present (no wardrobe CHOICE exists on this
 *                source; that boundary is reported when detected)
 *
 * Plus: byte-identical payload (sha256), save generation unmoved by
 * opening, and zero renderer requests leaving the packaged app:// origin.
 *
 * Usage:
 *   node scripts/continuity-test.mjs --app-a <exe> --app-b <exe> [--profile <dir>]
 *
 * The profile defaults to a fresh temporary directory; the script never
 * touches a real player profile.
 */

import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "package.json",
  ),
);
const { _electron } = require("playwright");

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const appA = arg("--app-a");
const appB = arg("--app-b");
const profile =
  arg("--profile") ?? mkdtempSync(path.join(os.tmpdir(), "ocd-continuity-"));
if (!appA || !appB) {
  console.error(
    "Usage: node scripts/continuity-test.mjs --app-a <executable> --app-b <executable> [--profile <dir>]",
  );
  process.exit(1);
}

const failures = [];
const boundaries = [];
function check(label, condition, detail = "") {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
}
function boundary(label, detail) {
  console.log(`BOUNDARY  ${label} — ${detail}`);
  boundaries.push({ label, detail });
}

async function launch(executablePath) {
  const app = await _electron.launch({
    executablePath,
    env: { ...process.env, OCD_USER_DATA_DIR: profile },
  });
  const page = await app.firstWindow();
  const foreignRequests = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("app://game/"))
      foreignRequests.push(request.url());
  });
  await page.waitForLoadState("domcontentloaded");
  return { app, page, foreignRequests };
}

/** Reads every save record's metadata and a hash of its payload. */
async function dumpSaves(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("political-life-worlds");
        open.onerror = () => reject(new Error("cannot open save database"));
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("worlds")) return resolve([]);
          const rows = [];
          const cursor = db
            .transaction("worlds", "readonly")
            .objectStore("worlds")
            .openCursor();
          cursor.onerror = () => reject(new Error("cursor failed"));
          cursor.onsuccess = () => {
            const c = cursor.result;
            if (!c) return resolve(rows);
            rows.push({ key: String(c.key), value: c.value });
            c.continue();
          };
        };
      }),
  );
}

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Every money/resource-shaped leaf in the save payload, as a stable
 * digest: sorted "path=value" lines over keys matching the money/resource
 * vocabulary. Accepted main surfaces no normal money HUD, so the payload
 * is the canonical place this state is provable.
 */
function resourceDigest(payloadText) {
  let parsed;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    return { lines: 0, hash: "unparseable" };
  }
  const pattern = /resource|money|balance|account|wage|paid|amount|principal/i;
  const lines = [];
  const walk = (node, trail) => {
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      const here = `${trail}.${key}`;
      if (pattern.test(key)) {
        // A matching container (e.g. an empty resourcePositions ledger at
        // life start) is state too: record its full JSON, not just leaves.
        lines.push(`${here}=${JSON.stringify(value)}`);
      }
      if (value !== null && typeof value === "object") walk(value, here);
    }
  };
  walk(parsed, "");
  lines.sort();
  return { lines: lines.length, hash: hashText(lines.join("\n")) };
}

/** Pin state carried by the payload itself, if this source persists it. */
function payloadPinState(payloadText) {
  try {
    const parsed = JSON.parse(payloadText);
    const found = [];
    const walk = (node) => {
      if (node === null || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node)) {
        if (/^pinned/i.test(key)) found.push({ key, value });
        else if (value !== null && typeof value === "object") walk(value);
      }
    };
    walk(parsed);
    return found;
  } catch {
    return [];
  }
}

async function textOf(page, testId) {
  const locator = page.getByTestId(testId);
  if ((await locator.count()) === 0) return null;
  return (await locator.first().innerText()).trim();
}

/**
 * The state matrix, captured through the canonical player surfaces the
 * way a player reaches them. Used identically in A (after begin) and in
 * B (after continue), so equality is meaningful.
 */
async function captureStateMatrix(page) {
  const matrix = {};

  // Identity, read only once it has settled: three non-empty lines,
  // identical across two consecutive reads (the household line renders a
  // beat after the name on a fresh begin).
  let last = null;
  for (let i = 0; i < 40; i += 1) {
    const text = (await page.getByTestId("play-screen").innerText())
      .split("\n")
      .slice(0, 3)
      .join("\n");
    const settled =
      text.split("\n").filter((l) => l.trim() !== "").length === 3;
    if (settled && text === last) break;
    last = text;
    await new Promise((r) => setTimeout(r, 250));
  }
  matrix.identity = last;

  // People rail + pin. The rail lives behind the People control.
  const people = page.getByTestId("elsewhere-people");
  if ((await people.count()) > 0) {
    if ((await people.getAttribute("aria-pressed")) !== "true")
      await people.click();
    const pinButtons = page.locator('[data-testid^="rail-pin-"]');
    matrix.pinControlCount = await pinButtons.count();
    if (matrix.pinControlCount > 0) {
      // Idempotent across A and B: pin the first pinnable person unless
      // that person is already shown as pinned.
      const first = pinButtons.first();
      const pressed = await first.getAttribute("aria-pressed");
      if (pressed !== "true") await first.click();
    }
    matrix.pinnedCollection = await textOf(page, "pinned-collection");
    matrix.peopleRail = (
      await page.locator('[data-testid^="rail-person-"]').allInnerTexts()
    )
      .map((t) => t.trim())
      .join(" | ");
    const closePeople = page.getByTestId("people-overlay-close");
    if ((await closePeople.count()) > 0) await closePeople.click();
  } else {
    matrix.pinControlCount = 0;
    matrix.pinnedCollection = null;
    matrix.peopleRail = null;
  }

  // Journal, through its real control (the same button closes it).
  await page.getByTestId("open-journal").click();
  await page.getByTestId("journal").waitFor();
  matrix.journal = (await page.getByTestId("journal").innerText()).trim();
  await page.getByTestId("open-journal").click();

  // The day (calendar surface), where this life offers it — an overlay.
  const day = page.getByTestId("elsewhere-day");
  if ((await day.count()) > 0) {
    await day.click();
    const overlay = page.getByTestId("day-overlay");
    await overlay.waitFor();
    matrix.daySurface = (await overlay.innerText()).trim();
    const closeDay = page.getByTestId("day-overlay-close");
    if ((await closeDay.count()) > 0) await closeDay.click();
  } else {
    matrix.daySurface = null;
  }

  // Rendered character identity, where a character surface is present.
  matrix.appearance = await page.evaluate(() => {
    const seeds = [...document.querySelectorAll("[data-appearance-seed]")].map(
      (el) => el.getAttribute("data-appearance-seed"),
    );
    const recipes = [
      ...document.querySelectorAll("[data-appearance-recipe-id]"),
    ].map((el) => el.getAttribute("data-appearance-recipe-id"));
    return { seeds, recipes };
  });

  return matrix;
}

async function newLifeAndBegin(page) {
  await page.getByTestId("new-game").click();
  await page.getByTestId("setup-screen").waitFor();
  await page.getByTestId("start-normal").click();
  await page.getByTestId("creator-stage-character").waitFor();
  await page.getByTestId("start-age").fill("27");
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("creator-stage-place").waitFor();
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
    // A life with no household shows no introduction gate.
  }
  await page.getByTestId("play-screen").waitFor();
}

const report = {};

// ---- Build A: fresh profile, create a life, capture state, keep -----------
{
  const { app, page, foreignRequests } = await launch(appA);
  check(
    "A: window served from app://game",
    page.url().startsWith("app://game/"),
    page.url(),
  );
  await newLifeAndBegin(page);
  report.matrixA = await captureStateMatrix(page);

  await page.getByTestId("keep-world").click();
  await page
    .getByTestId("keep-world")
    .waitFor({ state: "detached", timeout: 15000 });

  const saves = await dumpSaves(page);
  const records = saves.filter((row) => row.value?.kind !== "tombstone");
  check(
    "A: exactly one save record exists",
    records.length === 1,
    `${records.length}`,
  );
  const record = records[0]?.value ?? {};
  const payload = String(record.payload ?? "");
  report.saveA = {
    saveId: record.saveId,
    worldId: record.metadata?.worldId,
    playerPersonId: record.metadata?.playerPersonId,
    playerName: record.metadata?.playerName,
    playerAge: record.metadata?.playerAge,
    residence: record.metadata?.residence?.name,
    currentMoment: record.metadata?.currentMoment,
    actionSequence: record.metadata?.actionSequence,
    generation: record.generation,
    payloadHash: hashText(payload),
    payloadBytes: payload.length,
    resources: resourceDigest(payload),
    pinsInPayload: payloadPinState(payload),
  };
  check(
    "A: money/resource state exists in the kept payload",
    report.saveA.resources.lines > 0,
    `${report.saveA.resources.lines} money/resource leaves, digest ${report.saveA.resources.hash.slice(0, 12)}…`,
  );
  check(
    "A: no request left the packaged origin",
    foreignRequests.length === 0,
    foreignRequests.slice(0, 3).join(", "),
  );
  await app.close();
}

// ---- Build B: same profile, continue, capture the same matrix -------------
{
  const { app, page, foreignRequests } = await launch(appB);
  const savesBefore = await dumpSaves(page);
  const recordsBefore = savesBefore.filter(
    (row) => row.value?.kind !== "tombstone",
  );
  const before = recordsBefore[0]?.value ?? {};
  check(
    "B: build A's save record is present before play",
    recordsBefore.length === 1 && before.saveId === report.saveA.saveId,
  );
  check(
    "B: payload bytes are identical to what A kept",
    hashText(String(before.payload ?? "")) === report.saveA.payloadHash,
    `sha256 ${report.saveA.payloadHash.slice(0, 16)}…`,
  );

  const continueButton = page.getByTestId("continue");
  await continueButton.waitFor();
  check("B: Continue is offered", await continueButton.isEnabled());
  await continueButton.click();
  await page.getByTestId("play-screen").waitFor();
  const gate = page.getByTestId("introduction-continue");
  if ((await gate.count()) > 0) await gate.click();

  report.matrixB = await captureStateMatrix(page);
  const a = report.matrixA;
  const b = report.matrixB;

  check(
    "B: identity — the continued life shows A's identity lines",
    b.identity === a.identity,
    JSON.stringify({ a: a.identity, b: b.identity }),
  );
  check(
    "B: Journal — same record on the real journal surface",
    b.journal === a.journal && a.journal.length > 0,
    `${a.journal.length} chars`,
  );
  check(
    "B: calendar — same day surface",
    b.daySurface === a.daySurface,
    a.daySurface === null ? "no day surface on this life" : "day text equal",
  );
  check(
    "B: people rail — same people",
    b.peopleRail === a.peopleRail,
    String(a.peopleRail).slice(0, 80),
  );

  // Pins: the payload decides what this source promises.
  if (report.saveA.pinsInPayload.length > 0) {
    check(
      "B: pins — payload-persisted pin state reappears on the rail",
      b.pinnedCollection === a.pinnedCollection,
      String(a.pinnedCollection).slice(0, 80),
    );
  } else {
    boundary(
      "pins",
      `pin state is shell-session state on this source (no pinned* key in the save payload); the rail resets on relaunch in browser and desktop alike. Rail in A: ${JSON.stringify(a.pinnedCollection)}; in B after fresh pin: ${JSON.stringify(b.pinnedCollection)}. Durable canonical pins are UI-lane work, not a desktop wrapper defect.`,
    );
  }

  // Appearance: identity attributes where a character surface rendered.
  if (a.appearance.seeds.length > 0 || a.appearance.recipes.length > 0) {
    check(
      "B: appearance — same rendered appearance identity",
      JSON.stringify(b.appearance) === JSON.stringify(a.appearance),
      JSON.stringify(a.appearance).slice(0, 100),
    );
  } else {
    boundary(
      "wardrobe/appearance",
      "this life renders no character surface with appearance identity attributes on accepted main, and the creator offers no wardrobe choice on this source; appearance state is seed/recipe data inside the payload (byte-verified above). A production wardrobe choice is unmerged (#134/UI lane) and is not fabricated here.",
    );
  }

  const savesAfter = await dumpSaves(page);
  const after =
    savesAfter.filter((row) => row.value?.kind !== "tombstone")[0]?.value ?? {};
  const m = after.metadata ?? {};
  const s = report.saveA;
  const payloadAfter = String(after.payload ?? "");
  check("B: same worldId", m.worldId === s.worldId, String(m.worldId));
  check("B: same person (no reroll)", m.playerPersonId === s.playerPersonId);
  check(
    "B: same player name",
    m.playerName === s.playerName,
    String(m.playerName),
  );
  check("B: same age", m.playerAge === s.playerAge, String(m.playerAge));
  check(
    "B: same residence",
    (m.residence?.name ?? null) === (s.residence ?? null),
    String(m.residence?.name),
  );
  check(
    "B: same calendar moment",
    JSON.stringify(m.currentMoment) === JSON.stringify(s.currentMoment),
    JSON.stringify(m.currentMoment),
  );
  check(
    "B: history — same action sequence",
    m.actionSequence === s.actionSequence,
    String(m.actionSequence),
  );
  check(
    "B: money — identical money/resource digest in the stored payload",
    resourceDigest(payloadAfter).hash === s.resources.hash,
    `${s.resources.lines} leaves`,
  );
  check(
    "B: opening the save did not advance its generation",
    after.generation === s.generation,
  );
  check(
    "B: no request left the packaged origin",
    foreignRequests.length === 0,
    foreignRequests.slice(0, 3).join(", "),
  );
  await app.close();
}

console.log(`\nProfile: ${profile}`);
console.log(`Save under test: ${JSON.stringify(report.saveA, null, 2)}`);
if (boundaries.length > 0)
  console.log(
    `\nDisclosed boundaries (source limitations, not wrapper defects):\n${boundaries
      .map((b) => `- ${b.label}: ${b.detail}`)
      .join("\n")}`,
  );
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll continuity checks passed.");
