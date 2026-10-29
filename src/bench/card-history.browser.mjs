/* global process, URL, console, document */
// Click anyone and their card tells their life (play-person-history-for-everyone-you-open):
// the first two people of the Politics government list, who have no tie to the player, each
// show a History of dated lines from their records (an official reached at a seat has fewer than a neighbor: the engine writes few terms). BENCH_SEED replays a world; SHOTS_DIR saves shots.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const r = await made;
  console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  for (let n = 0; n < 2; n += 1) {
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page.locator("#sheet-body .person-row").first().waitFor();
    await page
      .locator("#sheet-body .person-row:visible")
      .nth(n * 3)
      .click();
    await page.locator("#person:not([hidden])").waitFor();
    await page.waitForTimeout(1200);
    const card = await page.evaluate(() => {
      return {
        name: document.getElementById("person-name").textContent.trim(),
        text: document.getElementById("person-facts").innerText,
      };
    });
    const lines = card.text
      .split("\n")
      .filter((l) => /\b(19|20)\d\d\b/.test(l));
    console.log(`${card.name}: ${lines.length} dated lines`, lines);
    assert.ok(lines.length >= 2, `${card.name} has under two dated lines`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/card-${n + 1}.png` });
    await page.locator("#person-close").click();
    await page
      .locator("#sheet-close")
      .click()
      .catch(() => {});
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: anyone you open has a history");
} finally {
  await browser.close();
}
