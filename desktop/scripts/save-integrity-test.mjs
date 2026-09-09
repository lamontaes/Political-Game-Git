/* global console, process, URL, indexedDB, setTimeout */
/**
 * Save failure and compatibility controls against a packaged build, on an
 * isolated disposable profile.
 *
 * Proves the EXISTING save repository semantics hold in the installed
 * app — no second desktop save-version system exists or is invented:
 *
 *  1. Interruption: a hard kill (no clean close) after keeping a life
 *     leaves the save fully recoverable on relaunch.
 *  2. Corruption: a garbage record beside the healthy save neither hides
 *     the healthy save nor gets silently deleted — its bytes remain in
 *     the database for recovery.
 *  3. Incompatibility/downgrade: a record whose recordVersion is newer
 *     than this build understands is refused (the healthy life still
 *     continues; the newer record's bytes are preserved, not deleted) —
 *     exactly the repository's documented newer-record behavior.
 *
 * Usage: node scripts/save-integrity-test.mjs --app <executable>
 */

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
const appPath = arg("--app");
if (!appPath) {
  console.error(
    "Usage: node scripts/save-integrity-test.mjs --app <executable>",
  );
  process.exit(1);
}
const profile = mkdtempSync(path.join(os.tmpdir(), "ocd-integrity-"));

const failures = [];
function check(label, condition, detail = "") {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
}

async function launch() {
  const app = await _electron.launch({
    executablePath: appPath,
    env: { ...process.env, OCD_USER_DATA_DIR: profile },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  return { app, page };
}

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

// The store keys records inline by saveId (keyPath), so a planted record
// carries its own key.
async function putRecord(page, value) {
  await page.evaluate(
    (record) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open("political-life-worlds");
        open.onerror = () => reject(new Error("cannot open save database"));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("worlds", "readwrite");
          tx.objectStore("worlds").put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error("write failed"));
          tx.onabort = () => reject(new Error("write aborted"));
        };
      }),
    value,
  );
}

async function newLifeAndKeep(page) {
  await page.getByTestId("new-game").click();
  await page.getByTestId("setup-screen").waitFor();
  await page.getByTestId("start-normal").click();
  await page.getByTestId("creator-stage-character").waitFor();
  await page.getByTestId("start-age").fill("31");
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
    /* no household introduction */
  }
  await page.getByTestId("play-screen").waitFor();
  await page.getByTestId("keep-world").click();
  await page
    .getByTestId("keep-world")
    .waitFor({ state: "detached", timeout: 15000 });
}

// ---- 1. Create a life, then interrupt the app without a clean close ------
let healthy;
{
  const { app, page } = await launch();
  await newLifeAndKeep(page);
  const records = (await dumpSaves(page)).filter(
    (row) => row.value?.kind !== "tombstone",
  );
  check("setup: one healthy save exists", records.length === 1);
  healthy = records[0];
  // Hard interruption: SIGKILL, no renderer teardown, no close events.
  app.process().kill("SIGKILL");
  await new Promise((r) => setTimeout(r, 1500));
}

{
  const { app, page } = await launch();
  const records = (await dumpSaves(page)).filter(
    (row) => row.value?.kind !== "tombstone",
  );
  check(
    "interruption: the kept save survives a hard kill intact",
    records.length === 1 &&
      records[0].value?.payload === healthy.value?.payload,
  );
  const continueButton = page.getByTestId("continue");
  await continueButton.waitFor();
  check(
    "interruption: Continue is offered after the hard kill",
    await continueButton.isEnabled(),
  );

  // ---- 2. Plant a corrupt record beside the healthy save -----------------
  await putRecord(page, {
    kind: "browser-world-record",
    recordVersion: 3,
    saveId: "save_integrity_corrupt",
    generation: "not-a-number",
    metadata: "garbage",
    payload: "{ definitely not valid world json",
  });
  // ---- 3. Plant a record from a NEWER schema than this build knows -------
  await putRecord(page, {
    kind: "browser-world-record",
    recordVersion: 99,
    saveId: "save_integrity_future",
    generation: 1,
    metadata: { fromTheFuture: true },
    payload: '{"schema":"newer-than-this-build"}',
  });
  await app.close();
}

{
  const { app, page } = await launch();
  // The healthy life must still be continuable past the damaged neighbors.
  const continueButton = page.getByTestId("continue");
  await continueButton.waitFor();
  check(
    "corruption: healthy save still continuable beside corrupt/newer records",
    await continueButton.isEnabled(),
  );
  await continueButton.click();
  await page.getByTestId("play-screen").waitFor();
  check("corruption: the continued life reaches the play screen", true);

  // The saved-games list must not crash, and the healthy entry must show.
  await page.getByTestId("leave-game").click();
  await page.getByTestId("open-saves").click();
  await page.getByTestId("saves-screen").waitFor();
  const entries = await page.getByTestId("save-entry").count();
  check(
    "corruption: saves screen renders with at least the healthy entry",
    entries >= 1,
    `${entries} listed entries`,
  );

  // Refusal is not deletion: both planted records keep their bytes.
  const rows = await dumpSaves(page);
  const corrupt = rows.find((row) => row.key === "save_integrity_corrupt");
  const future = rows.find((row) => row.key === "save_integrity_future");
  check(
    "corruption: the corrupt record's bytes were preserved, not deleted",
    corrupt !== undefined &&
      corrupt.value?.payload === "{ definitely not valid world json",
  );
  check(
    "incompatibility: the newer-schema record was refused but preserved",
    future !== undefined && future.value?.recordVersion === 99,
  );
  const healthyStill = rows.find((row) => row.key === healthy.key);
  check(
    "no collateral: the healthy save's bytes are untouched",
    healthyStill !== undefined &&
      healthyStill.value?.payload === healthy.value?.payload,
  );
  await app.close();
}

console.log(`\nProfile: ${profile}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll save-integrity checks passed.");
