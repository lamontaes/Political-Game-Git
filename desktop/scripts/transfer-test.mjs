/* global console, process, setTimeout, indexedDB */
/**
 * Browser-file save transfer against a packaged build on an isolated
 * profile: keep a life, export it, import it as a second slot, then
 * prove the original is unchanged.
 *
 * Usage: node scripts/transfer-test.mjs --app <executable>
 */

import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
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
const appPath = arg("--app");
const saveDatabaseName =
  process.env.OCD_EXPECT_ART_PREVIEW === "1"
    ? "political-life-worlds-art-preview"
    : "political-life-worlds";
if (!appPath) {
  console.error("Usage: node scripts/transfer-test.mjs --app <executable>");
  process.exit(1);
}
const profile = mkdtempSync(path.join(os.tmpdir(), "ocd-transfer-"));
const failures = [];
function check(label, condition, detail = "") {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
}

const app = await _electron.launch({
  executablePath: appPath,
  env: {
    ...process.env,
    OCD_USER_DATA_DIR: profile,
    OCD_DOWNLOAD_DIR: profile,
  },
});
const page = await app.firstWindow();
await page.waitForLoadState("domcontentloaded");

await page.getByTestId("new-game").click();
await page.getByTestId("setup-screen").waitFor();
await page.getByTestId("start-normal").click();
await page.getByTestId("creator-stage-character").waitFor();
await page.getByTestId("start-age").fill("27");
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
try {
  const gate = page.getByTestId("introduction-continue");
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

const interfaceSeed = await page.evaluate(async (databaseName) => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const worlds = await new Promise((resolve, reject) => {
    const request = db
      .transaction("worlds", "readonly")
      .objectStore("worlds")
      .getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const record = worlds.find((row) => row && row.saveId && row.payload);
  if (!record) {
    db.close();
    return null;
  }
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("interface", "readwrite");
    transaction.objectStore("interface").put({
      saveId: record.saveId,
      version: 2,
      pins: [
        {
          ref: { kind: "person", id: record.metadata.playerPersonId },
          size: "normal",
        },
      ],
      journal: { ambition: "Keep the district", notes: [] },
      preferences: {},
      personWardrobes: {},
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return record.saveId;
}, saveDatabaseName);
check(
  "transfer: interface store accepted pins and journal",
  Boolean(interfaceSeed),
  interfaceSeed ?? "no world record",
);

await page.getByTestId("leave-game").click();
await page.getByTestId("new-game").waitFor();
await page.getByTestId("open-saves").click();
await page.getByTestId("saves-screen").waitFor();
const beforeCount = await page.getByTestId("save-entry").count();
check("transfer: a kept life is listed", beforeCount >= 1, String(beforeCount));

await page
  .getByTestId(/^export-save-/)
  .first()
  .click();
let filePath = null;
for (let i = 0; i < 40 && filePath === null; i += 1) {
  const found = readdirSync(profile).filter((name) =>
    name.endsWith(".ocd-life.json"),
  );
  if (found.length > 0) filePath = path.join(profile, found[0]);
  else await new Promise((resolve) => setTimeout(resolve, 250));
}
check(
  "transfer: export produced a file",
  Boolean(filePath),
  filePath ?? "no file in profile download dir",
);
if (!filePath) {
  await app.close();
  process.exit(1);
}

const exportedBundle = JSON.parse(readFileSync(filePath, "utf8"));
check(
  "transfer: exported file includes interface pins",
  exportedBundle.interface?.status === "included" &&
    Array.isArray(exportedBundle.interface.state?.pins) &&
    exportedBundle.interface.state.pins.length >= 1,
  exportedBundle.interface?.status ?? "missing interface",
);

const chooserPromise = page.waitForEvent("filechooser", { timeout: 10000 });
await page.getByTestId("import-save").click();
const chooser = await chooserPromise;
await chooser.setFiles(filePath);
await page
  .getByText(/Imported as a new save of the same life/)
  .waitFor({ timeout: 15000 });
const afterCount = await page.getByTestId("save-entry").count();
check(
  "transfer: import created a new slot beside the original",
  afterCount === beforeCount + 1,
  `${beforeCount} -> ${afterCount}`,
);

const interfaceAfter = await page.evaluate(async (databaseName) => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const rows = await new Promise((resolve, reject) => {
    const request = db
      .transaction("interface", "readonly")
      .objectStore("interface")
      .getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows.filter(
    (row) =>
      row &&
      Array.isArray(row.pins) &&
      row.pins.length > 0 &&
      row.journal?.ambition === "Keep the district",
  ).length;
}, saveDatabaseName);
check(
  "transfer: imported slot kept the same pins and journal",
  interfaceAfter >= 2,
  String(interfaceAfter),
);

await app.close();
console.log(`\nProfile: ${profile}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nTransfer checks passed.");
