/* global process, console, document, getComputedStyle, URL */
// The People web's center is the player's own headshot: the figure the card draws for
// them, cropped round. Run against the bench:
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
  // The center is the player's round headshot, cut from the figure the card draws for them
  // (the Oct 28 headshot, not an initial and not a separate portrait image).
  const center = await page.evaluate(() => {
    const node = document.querySelector(".people-center .headshot");
    return node
      ? (getComputedStyle(node).backgroundImage.match(/url\("?([^")]+)"?\)/) ??
          [])[1]
      : null;
  });
  console.log("center headshot:", center);
  assert.ok(center, "the web's center is not a headshot");
  const { life } = await (await page.request.get(`${base}/api/title`)).json();
  const card = await (
    await page.request.get(`${base}/api/card?id=${life.personId}`)
  ).json();
  assert.ok(card.face?.url, "the player's card has no face");
  assert.equal(
    new URL(center, base).pathname,
    new URL(card.face.url, base).pathname,
    "the web's center is not the face the card draws for the player",
  );
  console.log("PASS the People web's center is the player's own face");
} finally {
  await browser.close();
}
