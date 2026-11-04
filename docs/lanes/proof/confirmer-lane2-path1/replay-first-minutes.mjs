/* global process, console, document, URL */
// Confirmer replay, Lane 2 Path 1 (first minutes): New Game in one fixed town,
// as a player: Start a life, the creator, the state and town, Begin, the
// opening played through (start-life's playOpening), then the room, the card
// and the People sheet captured at 1440x900.
// Usage: node replay-first-minutes.mjs <stateName> <townName> <replay> <outDir> <tag>
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/home/user/Political-Game-Git/package.json");
const { chromium } = require("playwright");
const { playOpening } = await import(
  "/home/user/Political-Game-Git/src/bench/start-life.mjs"
);

const [stateName, townName, replay, outDir, tag] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const bad = [];
page.on("response", (r) => {
  if (r.status() >= 400) bad.push(`${r.status()} ${new URL(r.url()).pathname}`);
});
// The creator asks /api/seed for its world seed; answer with the town's replay number.
await page.route("**/api/seed", (route) =>
  route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ seed: replay }),
  }),
);
const out = { tag, stateName, townName, replay };
try {
  const titled = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await titled;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator('[data-testid="gender-female"]').click();
  await page.locator("#cr-given").fill("Emily");
  await page.locator("#cr-family").fill("Carter");
  await page.locator("#cr-month").selectOption({ index: 6 });
  await page.locator("#cr-day").selectOption({ index: 15 });
  await page.waitForFunction(
    () => document.getElementById("cr-year").options.length > 1,
  );
  const years = await page.locator("#cr-year option").allInnerTexts();
  const year = years.find((y) => y.trim() === "2006") ?? years[1];
  await page.locator("#cr-year").selectOption({ label: year });
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-states .item").first().waitFor();
  await page.locator("#cr-state-search").fill(stateName);
  await page
    .locator("#cr-states .item", { hasText: stateName })
    .first()
    .click();
  await page.locator("#cr-towns .item").first().waitFor();
  await page.locator("#cr-town-search").fill(townName);
  await page.waitForTimeout(1500);
  const townItems = page.locator("#cr-towns .item", { hasText: townName });
  out.townChoices = await page.locator("#cr-towns .item").allInnerTexts();
  await townItems.first().click();
  await page.screenshot({ path: `${outDir}/${tag}-0-creator-look.png` });
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 900000 },
  );
  await page.locator("#cr-begin").click();
  const response = await made;
  out.newlifeURL = response.url();
  const body = await response.json();
  out.placeName = body.placeName;
  out.personId = body.personId;
  await page.waitForFunction(
    () => document.getElementById("card-name")?.textContent.trim(),
  );
  await page.screenshot({ path: `${outDir}/${tag}-1-first-screen.png` });
  await playOpening(page, body.sceneMomentId ?? null);
  await page.waitForTimeout(1500);
  out.cardPlace = await page.locator("#card-place").innerText();
  out.cardText = await page.locator("#card").innerText().catch(() => "");
  out.backdrop = await page.evaluate(() => {
    const els = [...document.querySelectorAll("*")];
    return els
      .map((e) => getComputedStyle(e).backgroundImage)
      .concat(
        [...document.querySelectorAll("img")].map((i) => i.currentSrc),
      )
      .filter((s) => s && /backdrop/.test(s))
      .slice(0, 5);
  });
  await page.screenshot({ path: `${outDir}/${tag}-2-room.png` });
  // The People sheet.
  await page
    .locator('[data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(2500);
  out.peopleText = await page
    .locator("#sheet")
    .innerText()
    .catch(() => "");
  await page.screenshot({ path: `${outDir}/${tag}-3-people.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await page
    .locator('#rings [data-tab="money"], [data-tab="money"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(3000);
  out.moneyText = await page
    .locator("#sheet")
    .innerText()
    .catch(() => "");
  await page.screenshot({ path: `${outDir}/${tag}-4-money.png` });
} catch (e) {
  out.failure = String(e?.stack ?? e);
  await page.screenshot({ path: `${outDir}/${tag}-x-failure.png` }).catch(() => {});
}
out.errors = errors;
out.badResponses = bad;
writeFileSync(`${outDir}/${tag}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ...out, cardText: undefined, peopleText: undefined }, null, 2));
await browser.close();
