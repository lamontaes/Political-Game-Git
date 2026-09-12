/* global console, process, setTimeout */
/**
 * Browser-file save transfer against a packaged build on an isolated
 * profile: keep a life, export it, import it as a second slot, then
 * prove the original is unchanged.
 *
 * Usage: node scripts/transfer-test.mjs --app <executable>
 */

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
const appPath = arg("--app");
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
  env: { ...process.env, OCD_USER_DATA_DIR: profile },
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
await page.getByTestId("keep-world").click();
await page
  .getByTestId("keep-world")
  .waitFor({ state: "detached", timeout: 15000 });
await page.getByTestId("leave-game").click();
await page.getByTestId("new-game").waitFor();
await page.getByTestId("open-saves").click();
await page.getByTestId("saves-screen").waitFor();
const beforeCount = await page.getByTestId("save-entry").count();
check("transfer: a kept life is listed", beforeCount >= 1, String(beforeCount));

const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
await page
  .getByTestId(/^export-save-/)
  .first()
  .click();
const download = await downloadPromise;
const filePath = path.join(profile, download.suggestedFilename());
await download.saveAs(filePath);
check(
  "transfer: export produced a file",
  filePath.endsWith(".ocd-life.json") || filePath.endsWith(".json"),
  filePath,
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

await app.close();
console.log(`\nProfile: ${profile}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nTransfer checks passed.");
