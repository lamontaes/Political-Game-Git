/* global process, console, document, getComputedStyle */
// The state and town search fields in the creator carry the gold edge at rest
// and on focus (the Kit 13 gold, #d6bd84). Run against the bench:
//   BENCH_PORT=3000 node src/bench/creator-search.browser.mjs [out-prefix]
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [prefix] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const border = (id) =>
  page.evaluate((sel) => {
    const c = getComputedStyle(document.querySelector(sel)).borderTopColor;
    const [r, g, b, a = "1"] = c.match(/[\d.]+/g);
    return { r: +r, g: +g, b: +b, a: +a };
  }, `[data-testid="${id}"]`);
const gold = { r: 214, g: 189, b: 132 };
const isGold = (c) =>
  c.r === gold.r && c.g === gold.g && c.b === gold.b && c.a >= 0.5;
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await page.locator("[data-gender=male]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.locator("#cr-character-next").click();
  await page.locator('[data-testid="state-search"]').waitFor();
  await page.mouse.move(1400, 880);
  const rest = await border("state-search");
  console.log("state search at rest", rest);
  if (prefix) await page.screenshot({ path: `${prefix}-states.png` });
  assert.ok(isGold(rest), "the state search shows no gold edge at rest");
  await page.locator('[data-testid="state-search"]').focus();
  assert.ok(isGold(await border("state-search")), "no gold edge on focus");
  await page.locator("#cr-states button").first().click();
  await page.locator('[data-testid="place-search"]').waitFor();
  await page.mouse.move(1400, 880);
  const town = await border("place-search");
  console.log("town search at rest", town);
  assert.ok(isGold(town), "the town search shows no gold edge at rest");
  await page.locator('[data-testid="place-search"]').focus();
  assert.ok(isGold(await border("place-search")), "no gold edge on focus");
  await page.mouse.move(1400, 880);
  await page.locator("#cr-given").evaluate((n) => n.blur());
  if (prefix) await page.screenshot({ path: `${prefix}-towns.png` });
  console.log("PASS both searches carry the gold edge");
} finally {
  await browser.close();
}
