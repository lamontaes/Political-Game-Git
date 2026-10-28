/* global process, console, document, fetch, location */
// The People web's center is the face the creator made: its image is byte for
// byte the creator's portrait. Run against the bench:
//   BENCH_PORT=3000 node src/bench/people-center-face.browser.mjs [shot.png]
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shot] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const hash = (url) =>
  page.evaluate(async (u) => {
    const bytes = new Uint8Array(await (await fetch(u)).arrayBuffer());
    return bytes.reduce((h, x) => (h * 31 + x) >>> 0, 7);
  }, url);
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("[data-gender=male]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-states button").first().click();
  await page.locator("#cr-towns button").first().click();
  await page.locator("#cr-look:not([hidden])").waitFor();
  const swatch = (row, id) =>
    page.locator(`[data-testid=engine-appearance-${row}] [data-swatch=${id}]`);
  if (await swatch("skin", "ebony").count()) {
    await swatch("skin", "ebony").click();
    await swatch("shirt-color", "red").click();
  }
  await page.waitForTimeout(500);
  const made = await page.evaluate(() =>
    document.getElementById("cr-portrait").src.replace(location.origin, ""),
  );
  await page.locator("#cr-begin").click();
  await page.locator("#card:not([hidden])").waitFor({ timeout: 300000 });
  console.log("place:", await page.locator("#card-place").innerText());
  await page.waitForTimeout(2500);
  await page
    .locator('[data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".relationship-web").waitFor();
  await page.waitForTimeout(1500);
  if (shot) await page.screenshot({ path: shot });
  const center = await page
    .locator(".people-center img")
    .first()
    .evaluate((img) => img.src);
  console.log("center image:", center);
  assert.equal(
    await hash(center),
    await hash(made),
    "the web's center is not the creator's portrait",
  );
  console.log("PASS the People web's center is the face you made");
} finally {
  await browser.close();
}
