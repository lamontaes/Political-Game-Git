/* global console, document, process */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { _electron as electron } from "playwright";

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const executable = valueAfter("--app");
const screenshot = valueAfter("--screenshot");
if (!executable) {
  console.error(
    "Usage: node scripts/controller-smoke-test.mjs --app <controller executable> [--screenshot <png>]",
  );
  process.exit(2);
}

const dataRoot = mkdtempSync(path.join(os.tmpdir(), "ocd-controller-smoke-"));
const launched = await electron.launch({
  executablePath: path.resolve(executable),
  env: { ...process.env, OCD_CONTROLLER_DATA_ROOT: dataRoot },
});
try {
  const page = await launched.firstWindow();
  await page.getByRole("heading", { name: "Our Civic Duty" }).waitFor();
  await page.getByRole("button", { name: "Play", exact: true }).waitFor();
  await page.getByRole("button", { name: "Update", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Choose Project…", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelector("#identity")?.textContent?.includes("internal art review"),
  );
  assert.equal(await page.getByRole("button", { name: "Play" }).isEnabled(), true);
  if (screenshot) {
    await page.screenshot({ path: path.resolve(screenshot), fullPage: true });
  }
  const state = JSON.parse(readFileSync(path.join(dataRoot, "state.json"), "utf8"));
  assert.equal(state.schema, 1);
  assert.equal(state.current.profile, "internal-art-review");
  assert.match(state.current.revision, /^[0-9a-f]{40}$/);
  assert.equal(existsSync(state.current.appPath), true);
  console.log(
    `Controller smoke passed: ${state.current.version} @ ${state.current.revision.slice(0, 12)} (${state.current.profile}).`,
  );
  console.log(`Isolated controller data: ${dataRoot}`);
} finally {
  await launched.close();
}
