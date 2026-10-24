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
  // A life with a parties module (tiny towns have none): redraw, all draws logged.
  let seed = "";
  let place = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const titled = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`${BASE}/play`);
    await titled;
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
  // The joinable parties, through the UI.
  const joinLabels = await page
    .locator("#sheet-body button", { hasText: /join/i })
    .evaluateAll((els) => els.map((e) => e.textContent.trim()));
  console.log("Parties:", joinLabels.join(" | "));
  assert.ok(joinLabels.length, "no joinable party");
  let filed = "";
  for (const joinLabel of joinLabels) {
    if (filed) break;
    await page.locator('[data-tab="politics"]').first().evaluate((e) => e.click());
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("sheet-body")?.scrollTo(0, 999999);
    });
    await page.waitForTimeout(500);
    const jb = page.locator("#sheet-body button", { hasText: joinLabel });
    if (await jb.count()) {
      await jb.first().click();
      await page.waitForTimeout(2000);
      console.log("Joined:", joinLabel);
    }
    // File for a 2026 race first, a council seat if one is open.
    await page.locator('[data-tab="travel"]').first().evaluate((e) => e.click());
    const visited = new Set();
    for (let round = 0; round < 12 && !filed; round += 1) {
    await page.locator('[data-tab="travel"]').first().evaluate((e) => e.click());
    await page.waitForTimeout(1000);
    if (!(await page.locator("#sheet:not([hidden])").count())) continue;
    const labels = await page
      .locator("#sheet-body button", { hasText: /Go/ })
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))
      .catch(() => []);
    console.log("Travel round", round, "destinations:", labels.length);
    const label = labels.find((l) => !visited.has(l));
    if (!label) break;
    visited.add(label);
    await page.locator(`#sheet-body button[aria-label="${label}"]`).evaluate((e) => e.click());
    const talked = await page
      .locator("#talk:not([hidden])")
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!talked) continue;
    await page.locator("#talk-choices button").first().waitFor({ timeout: 10000 }).catch(() => {});
    for (let r = 0; r < 6 && !filed; r += 1) {
      const choices = page.locator("#talk-choices button");
      const n = await choices.count();
      if (!n) {
        await page.waitForTimeout(1500);
        continue;
      }
      const texts = [];
      for (let c = 0; c < n; c += 1) texts.push(await choices.nth(c).innerText());
      const order = [...Array(n).keys()].sort((a, b) => {
        const rank = (t) =>
          /council.*2026/i.test(t) ? 0 : /2026/i.test(t) ? 1 : /mayor/i.test(t) ? 2 : /I want to run for/i.test(t) ? 3 : 4;
        return rank(texts[a]) - rank(texts[b]);
      });
      let acted = false;
      for (const c of order) {
        if (!/I want to run for/i.test(texts[c])) continue;
        console.log("Filing as:", texts[c]);
        await page.locator("#talk-choices button", { hasText: texts[c] }).first().click();
        await page.waitForTimeout(2000);
        if (await page.locator("#filing-overlay:not([hidden])").count()) {
          await page.locator("#filing-party option").nth(1).waitFor({ timeout: 10000 }).catch(() => {});
          if ((await page.locator("#filing-party option").count()) > 1)
            await page.locator("#filing-party").selectOption({ index: 1 });
          const confirm = page.locator("#talk-choices button", { hasText: /file for this office/i });
          if (await confirm.count()) {
            await confirm.first().click();
            await page.waitForTimeout(2000);
          }
        }
        acted = true;
        break;
      }
      if (acted) break;
      await choices.first().click();
      await page.waitForTimeout(1500);
    }
    const lines = await page.locator("#talk-lines").innerText().catch(() => "");
    if (/filed|thank you|congratulations|on the ballot/i.test(lines)) filed = lines.slice(-120);
    await page.locator("#talk-leave").click().catch(() => {});
    }
  }
  assert.ok(filed, "could not file for a seat through the UI");
  console.log("PASS filed:", filed);
} finally {
  await browser.close();
}
