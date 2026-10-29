/* global process, URL, console, document */
// New game offers Start a life and Advanced; Advanced builds a world with no
// questionnaire and lets the player step in as anyone who holds an office.
// Run against a fresh bench: node src/bench/advanced.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  await page.locator("#new-life").click();
  // One button for a life and one Advanced entry: no Custom world, New
  // world or Watch the world beside them.
  assert.ok(await page.locator("#new-start").isVisible());
  assert.ok(await page.locator("#new-advanced").isVisible());
  assert.equal(await page.locator("#new-world").isVisible(), false);
  assert.equal(await page.locator("#new-custom").count(), 0);
  assert.equal(await page.locator("#front-watch").count(), 0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/advanced-start-2026-10-27/new-game.png",
  });
  const built = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-advanced").click();
  await page.locator("#front-advanced:not([hidden])").waitFor();
  await page.screenshot({
    path: "docs/reports/advanced-start-2026-10-27/advanced.png",
  });
  await page.locator("#advanced-build").click();
  const seed = new URL((await built).url()).searchParams.get("seed");
  // No creator step: the picker follows the build.
  await page.locator("#front-pick:not([hidden])").waitFor();
  assert.equal(await page.locator("#cr-character").isVisible(), false);
  const choices = page.locator("#pick-list button");
  assert.ok((await choices.count()) > 0, "officeholders are listed");
  const text = (await choices.first().innerText()).trim();
  assert.ok(/·/.test(text), `each names an office: ${text}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/advanced-start-2026-10-27/pick.png",
  });
  // The chosen person is the player.
  const name = text.split(" · ")[0];
  await choices.first().click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  assert.equal(
    (await page.locator("#card-name").innerText()).trim().toLowerCase(),
    name.trim().toLowerCase(),
  );
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/advanced-start-2026-10-27/playing-as.png",
  });
  assert.deepEqual(errors, []);
  console.log("PASS Advanced start: build, pick an officeholder, play as them");
} finally {
  await browser.close();
}
