/* global process, console, document, URL */
// A creator life's family looks related to the face the player chose
// (play-creator-look-and-family-share-an-origin), on the bench (npm run bench):
// the creator with the deep skin tone and a random place, the opening played,
// then People: each household member's face is shown with its head file, for
// the screenshot beside the player's. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/creator-family-face.browser.mjs [shots dir] [tone]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shots, tone = "deep"] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.locator("#cr-place-random").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  const line = page.locator("[data-testid=engine-appearance-skin]");
  for (let i = 0; i < 16; i += 1) {
    if (
      (await line.locator(".look-value").innerText())
        .toLowerCase()
        .includes(tone)
    )
      break;
    await line.getByRole("button").last().click();
    await page.waitForTimeout(250);
  }
  const heads = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .map((img) => img.getAttribute("src") ?? "")
        .filter((path) => /head/.test(path)),
    );
  await page.locator("#cr-bust .bust-stack:not(.loading)").waitFor();
  const mine = (await heads()).filter((p) => p.includes("bust"));
  const born = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
  );
  await page.locator("#cr-begin").click();
  const reply = await born;
  const { placeName, sceneMomentId } = await reply.json();
  console.log(
    "Seed:",
    new URL(reply.url()).searchParams.get("seed"),
    "Place:",
    placeName,
    "chosen head:",
    mine.join(", "),
  );
  await playOpening(page, sceneMomentId ?? null);
  await page.locator("#card:not([hidden])").waitFor();
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page
    .locator('#rings [data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".people-roster .person").first().waitFor();
  await page.waitForTimeout(1500);
  const family = await page.evaluate(() =>
    [...document.querySelectorAll(".people-roster .person")].map((row) => ({
      name: row.innerText.replace(/\s+/g, " ").trim(),
      heads: [...row.querySelectorAll("img")]
        .map((img) => img.getAttribute("src") ?? "")
        .filter((path) => /head/.test(path)),
    })),
  );
  for (const row of family)
    console.log(`  ${row.name}: ${row.heads.join(", ")}`);
  if (shots) await page.screenshot({ path: `${shots}/people.png` });
  // Each family member's card beside the roster, with their face.
  const rows = page.locator(".people-roster .person");
  for (let i = 1; i < (await rows.count()); i += 1) {
    await rows.nth(i).click();
    await page.waitForTimeout(800);
    if (shots) await page.screenshot({ path: `${shots}/people-${i + 1}.png` });
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS People shows the family");
} finally {
  await browser.close();
}
