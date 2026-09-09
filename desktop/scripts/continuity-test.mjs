/* global console, process, URL, indexedDB */
/**
 * Installed A → saved life → installed B → same life.
 *
 * Drives two actually packaged builds of the desktop app through the real
 * player flow — title, creator, begin, keep — against one isolated user
 * profile, and proves the life created and kept under build A is the life
 * build B continues: same save record bytes, same identity on screen, and
 * every renderer request served from the packaged app:// origin (nothing
 * from localhost, nothing from the network).
 *
 * Usage:
 *   node scripts/continuity-test.mjs --app-a <exe> --app-b <exe> [--profile <dir>]
 *
 * The profile defaults to a fresh temporary directory; the script never
 * touches a real player profile.
 */

import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(
  path.join(
    path.dirname(new URL(import.meta.url).pathname),
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
function check(label, condition, detail = "") {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
}

async function launch(executablePath) {
  const app = await _electron.launch({
    executablePath,
    env: {
      ...process.env,
      OCD_USER_DATA_DIR: profile,
    },
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

function hashPayload(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function newLifeAndKeep(page) {
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
  const playText = await page.getByTestId("play-screen").innerText();
  await page.getByTestId("keep-world").click();
  await page
    .getByTestId("keep-world")
    .waitFor({ state: "detached", timeout: 15000 });
  return playText;
}

const report = {};

// ---- Build A: fresh profile, create and keep a life -----------------------
{
  const { app, page, foreignRequests } = await launch(appA);
  check(
    "A: window served from app://game",
    page.url().startsWith("app://game/"),
    page.url(),
  );
  const playText = await newLifeAndKeep(page);
  report.identityA = playText.split("\n").slice(0, 3).join("\n");
  const saves = await dumpSaves(page);
  const records = saves.filter((row) => row.value?.kind !== "tombstone");
  check(
    "A: exactly one save record exists",
    records.length === 1,
    `${records.length}`,
  );
  const record = records[0]?.value ?? {};
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
    payloadHash: hashPayload(String(record.payload ?? "")),
    payloadBytes: String(record.payload ?? "").length,
  };
  check(
    "A: no request left the packaged origin",
    foreignRequests.length === 0,
    foreignRequests.slice(0, 3).join(", "),
  );
  await app.close();
}

// ---- Build B: same profile, continue the same life ------------------------
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
    hashPayload(String(before.payload ?? "")) === report.saveA.payloadHash,
    `sha256 ${report.saveA.payloadHash.slice(0, 16)}…`,
  );

  const continueButton = page.getByTestId("continue");
  await continueButton.waitFor();
  check("B: Continue is offered", await continueButton.isEnabled());
  await continueButton.click();
  await page.getByTestId("play-screen").waitFor();
  const playText = await page.getByTestId("play-screen").innerText();
  const identityB = playText.split("\n").slice(0, 3).join("\n");
  check(
    "B: the continued life shows A's identity",
    playText.includes(report.identityA) || identityB === report.identityA,
    JSON.stringify({ a: report.identityA, b: identityB }),
  );

  const savesAfter = await dumpSaves(page);
  const after =
    savesAfter.filter((row) => row.value?.kind !== "tombstone")[0]?.value ?? {};
  const m = after.metadata ?? {};
  const a = report.saveA;
  check("B: same worldId", m.worldId === a.worldId, String(m.worldId));
  check("B: same person (no reroll)", m.playerPersonId === a.playerPersonId);
  check(
    "B: same player name",
    m.playerName === a.playerName,
    String(m.playerName),
  );
  check("B: same age", m.playerAge === a.playerAge, String(m.playerAge));
  check(
    "B: same residence",
    (m.residence?.name ?? null) === (a.residence ?? null),
    String(m.residence?.name),
  );
  check(
    "B: same calendar moment",
    JSON.stringify(m.currentMoment) === JSON.stringify(a.currentMoment),
    JSON.stringify(m.currentMoment),
  );
  check(
    "B: same history position",
    m.actionSequence === a.actionSequence,
    String(m.actionSequence),
  );
  check(
    "B: opening the save did not advance its generation",
    after.generation === a.generation,
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
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll continuity checks passed.");
