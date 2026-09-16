/* global console, process, setTimeout */
/**
 * Launch smoke for the private hub: one window, chrome bar with Play, Art
 * Desk, Agents and Settings tabs, the main/branch selector, Play embedded
 * over app://game from the bootstrap build, and tab switching that hides
 * rather than unloads the game.
 *
 * Usage: node scripts/controller-smoke-test.mjs --app <hub executable>
 *          [--screenshot <png>] [--data-root <dir>]
 */

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
    "Usage: node scripts/controller-smoke-test.mjs --app <hub executable> [--screenshot <png>] [--data-root <dir>]",
  );
  process.exit(2);
}

const dataRoot =
  valueAfter("--data-root") ??
  mkdtempSync(path.join(os.tmpdir(), "ocd-controller-smoke-"));
const launched = await electron.launch({
  executablePath: path.resolve(executable),
  env: {
    ...process.env,
    OCD_CONTROLLER_DATA_ROOT: dataRoot,
    OCD_HUB_SKIP_STARTUP_CHECK: "1",
  },
});
const waitFor = async (predicate, label, timeout = 30000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() > deadline)
      throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};
try {
  const pageFor = (pattern) =>
    launched.windows().find((page) => pattern.test(page.url()));
  const chrome = await waitFor(() => pageFor(/index\.html$/), "hub chrome");
  await chrome.getByRole("tab", { name: "Play" }).waitFor();
  await chrome.getByRole("tab", { name: "Art Desk" }).waitFor();
  await chrome.getByRole("tab", { name: "Agents" }).waitFor();
  await chrome.getByRole("combobox", { name: "Play source" }).waitFor();
  const game = await waitFor(() => pageFor(/^app:\/\/game\//), "Play view");
  await game.waitForLoadState("domcontentloaded");
  const marker = await game.evaluate(() => {
    globalThis.__hubSmokeMarker = Math.random();
    return globalThis.__hubSmokeMarker;
  });
  // Keyboard activation of the Agents tab, then pointer back to Play.
  await chrome.getByRole("tab", { name: "Agents" }).focus();
  await chrome.keyboard.press("Enter");
  await waitFor(
    async () =>
      (await chrome
        .getByRole("tab", { name: "Agents" })
        .getAttribute("aria-selected")) === "true",
    "Agents tab selected",
  );
  await chrome.getByRole("tab", { name: "Play" }).click();
  await waitFor(
    async () =>
      (await chrome
        .getByRole("tab", { name: "Play" })
        .getAttribute("aria-selected")) === "true",
    "Play tab selected",
  );
  const after = await game.evaluate(() => globalThis.__hubSmokeMarker);
  assert.equal(after, marker, "switching tabs must not unload the game");
  if (screenshot) await game.screenshot({ path: path.resolve(screenshot) });
  const state = JSON.parse(
    readFileSync(path.join(dataRoot, "state.json"), "utf8"),
  );
  assert.equal(state.schema, 2);
  const main = state.tracks.main;
  assert.equal(main.current.profile, "internal-art-review");
  assert.match(main.current.revision, /^[0-9a-f]{40}$/);
  assert.equal(existsSync(main.current.appPath), true);
  console.log(
    `Hub smoke passed: ${main.current.version} @ ${main.current.revision.slice(0, 12)} (${main.current.profile}); tabs kept the game loaded.`,
  );
  console.log(`Isolated hub data: ${dataRoot}`);
} finally {
  await launched.close();
}
