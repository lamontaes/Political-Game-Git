/* global console, process, setTimeout, indexedDB */
/**
 * Browser-file save transfer against a packaged build on an isolated
 * profile: keep a life, export it, import it as a second slot, then
 * prove the original is unchanged.
 *
 * Usage: node scripts/transfer-test.mjs --app <executable>
 */

import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

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
await page.getByTestId("leave-game").click();
await page.getByTestId("new-game").waitFor();

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
  const state = {
    version: 3,
    pins: [
      {
        ref: { kind: "person", id: record.metadata.playerPersonId },
        size: "expanded",
      },
    ],
    journal: {
      ambition: "Keep the district",
      notes: [
        {
          id: "private-note",
          title: "Only for me",
          body: "A private record",
          group: "Life",
          personId: record.metadata.playerPersonId,
          eventKey: "transfer-fixture",
        },
      ],
    },
    preferences: {
      peopleView: "web",
      defaultPinSize: "tiny",
      followedNewsOutletKeys: ["civic-ledger", "second-represented-outlet"],
    },
    personWardrobes: {
      [record.metadata.playerPersonId]: {
        personId: record.metadata.playerPersonId,
        families: {
          top: "transfer-top",
          bottom: "transfer-bottom",
          footwear: "transfer-footwear",
        },
      },
    },
  };
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("interface", "readwrite");
    transaction
      .objectStore("interface")
      .put({ saveId: record.saveId, ...state });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return { saveId: record.saveId, state, payload: record.payload };
}, saveDatabaseName);
check(
  "transfer: interface store accepted pins and journal",
  Boolean(interfaceSeed),
  interfaceSeed?.saveId ?? "no world record",
);

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
const wireState = (state) => ({
  ...state,
  pins: state.pins.map(({ ref, size }) => ({ ref, size })),
});
check(
  "transfer: exported file includes complete validated v3 interface",
  exportedBundle.interface?.status === "included" &&
    isDeepStrictEqual(
      wireState(exportedBundle.interface.state),
      wireState(interfaceSeed.state),
    ),
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
  return rows;
}, saveDatabaseName);
check(
  "transfer: imported and original slots retain pins, Journal, all wardrobe parts and follows",
  interfaceAfter.filter(({ saveId, ...state }) =>
    isDeepStrictEqual(wireState(state), wireState(interfaceSeed.state)),
  ).length === 2,
  String(interfaceAfter.length),
);

const futurePath = path.join(profile, "future.ocd-life.json");
writeFileSync(
  futurePath,
  JSON.stringify({
    ...exportedBundle,
    interface: {
      status: "included",
      state: { ...exportedBundle.interface.state, version: 4 },
    },
  }),
);
const futureChooser = page.waitForEvent("filechooser");
await page.getByTestId("import-save").click();
await (await futureChooser).setFiles(futurePath);
await page.getByText(/interface state could not be read/).waitFor();
check(
  "transfer: future interface refusal creates no new slot",
  (await page.getByTestId("save-entry").count()) === afterCount,
);

// Reopen both same-life slots using the real UI, not just raw record presence.
for (let index = 0; index < 2; index += 1) {
  await page
    .getByTestId("save-entry")
    .nth(index)
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await page.getByTestId("play-screen").waitFor();
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("shell-nav-flyout").waitFor();
  await page.getByTestId("leave-game").click();
  await page.getByTestId("new-game").waitFor();
  await page.getByTestId("open-saves").click();
  await page.getByTestId("saves-screen").waitFor();
}
const reopened = await page.evaluate(async (databaseName) => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const read = (store) =>
    new Promise((resolve, reject) => {
      const request = db
        .transaction(store, "readonly")
        .objectStore(store)
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const worlds = await read("worlds");
  const interfaces = await read("interface");
  db.close();
  return { worlds, interfaces };
}, saveDatabaseName);
check(
  "transfer: reopen preserves complete World in both slots",
  reopened.worlds.filter((row) => row.payload === interfaceSeed.payload)
    .length === 2,
);
check(
  "transfer: reopen preserves complete interface in both slots",
  reopened.interfaces.filter(({ saveId, ...state }) =>
    isDeepStrictEqual(wireState(state), wireState(interfaceSeed.state)),
  ).length === 2,
);

await app.close();
console.log(`\nProfile: ${profile}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nTransfer checks passed.");
