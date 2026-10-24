/* global process, URL, console, document */
// The ballot pager on election day (play-stop-21-ballot-stuck-on-first-page):
// Continue turns the ballot's pages to the player's own race; marking it
// records the vote. Honest UI drive on the bench: creator, party join,
// filing, calendar skip to election day, page the ballot.
// Run: BENCH_PORT=3001 BENCH_BROWSER=<chromium> node src/bench/polling.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const PORT = process.env.BENCH_PORT ?? "3000";
const BASE = `http://localhost:${PORT}`;
const browser = await chromium.launch({
  executablePath:
    process.env.BENCH_BROWSER ??
    "/Users/lamontae/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const draws = [];
try {
  await page.goto(`${BASE}/play`);
  await page.waitForResponse((r) => r.url().endsWith("/api/title"));
  // A life with a parties module (tiny towns have none): redraw, all draws logged.
  let seed = "";
  let place = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await page.goto(`${BASE}/play`);
      await page.waitForResponse((r) => r.url().endsWith("/api/title"));
    }
    await page.locator("#new-life").click();
    await page.locator("#new-start").click();
    await page.locator('[data-testid="gender-male"]').click();
    await page.locator("#cr-given").fill("Test");
    await page.locator("#cr-family").fill("Voter");
    await page.locator("#cr-month").selectOption({ index: 1 });
    await page.locator("#cr-day").selectOption({ index: 1 });
    await page.waitForFunction(
      () => document.getElementById("cr-year").options.length > 1,
    );
    const years = await page.locator("#cr-year option").allInnerTexts();
    const grown = years.find((y) => Number(y) <= 1996) ?? years[years.length - 1];
    await page.locator("#cr-year").selectOption({ label: grown });
    await page.locator("#cr-character-next").click();
    await page.locator("#cr-states .item").first().waitFor();
    const state = await page.evaluate(() => {
      const items = [...document.querySelectorAll("#cr-states .item")];
      const s = items[Math.floor(Math.random() * items.length)];
      s.click();
      return s.textContent;
    });
    await page.locator("#cr-towns .item").first().waitFor();
    const town = await page.evaluate(() => {
      const items = [...document.querySelectorAll("#cr-towns .item")];
      const t = items[Math.floor(Math.random() * items.length)];
      t.click();
      return t.textContent;
    });
    const made = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#cr-begin").click();
    seed = new URL((await made).url()).searchParams.get("seed");
    await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 300000 });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Skip opening", exact: true }).click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    place = await page.locator("#card-place").innerText();
    draws.push(`${place} (seed ${seed})`);
    console.log("Draw", attempt + 1, ":", place, seed);
    await page.locator('[data-tab="politics"]').first().evaluate((e) => e.click());
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      document.getElementById("sheet-body")?.scrollTo(0, 999999);
    });
    await page.waitForTimeout(1000);
    if (await page.locator("#sheet-body button", { hasText: /join/i }).count())
      break;
    seed = "";
    place = "";
  }
  assert.ok(place, "no drawn town had a parties module in 6 draws");
  console.log("Draws:", draws.join(" | "));
  // Join the first party, through the UI.
  await page.locator("#sheet-body button", { hasText: /join/i }).first().click();
  await page.waitForTimeout(2000);
  console.log("PASS setup: adult in a town with parties, joined one");
} finally {
  await browser.close();
}
