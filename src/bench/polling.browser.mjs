/* global process, URL, console, document */
// The ballot pager on election day (play-stop-21): Continue turns the
// ballot's pages to the player's own race; marking it records the vote.
// Run: BENCH_BROWSER=<chromium> node src/bench/polling.browser.mjs
// (bench server on BENCH_PORT, default 3000).
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
page.on("response", async (r) => {
  if (new URL(r.url()).pathname.startsWith("/api/filing/")) {
    try {
      const j = await r.json();
      console.log("FILING API", new URL(r.url()).pathname, "RESULT:", JSON.stringify(j.result ?? null), "OVERLAY-CHECKS:", JSON.stringify((j.overlay?.checks ?? j.visit?.overlay?.checks ?? []).map((c) => [c.rule, c.met, c.actual, c.required])));
    } catch {}
  }
});
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${BASE}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  // Full creator (Start a life): an adult who can file.
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
  console.log(
    "Age:",
    await page.locator("#cr-derived-age").innerText(),
  );
  await page.locator("#cr-character-next").click();
  // Drawn town, not chosen: a scripted random pick, recorded below.
  await page.locator("#cr-states .item").first().waitFor();
  const pick = await page.evaluate(() => {
    const states = [...document.querySelectorAll("#cr-states .item")];
    const s = states[Math.floor(Math.random() * states.length)];
    s.click();
    return s.textContent;
  });
  console.log("State draw:", pick);
  await page.locator("#cr-towns .item").first().waitFor();
  const town = await page.evaluate(() => {
    const towns = [...document.querySelectorAll("#cr-towns .item")];
    const t = towns[Math.floor(Math.random() * towns.length)];
    t.click();
    return t.textContent;
  });
  console.log("Town draw:", town);
  await page.locator("#cr-begin").click();
  const response = await made;
  const seed = new URL(response.url()).searchParams.get("seed");
  console.log("Seed:", seed);
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 300000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  console.log("Place:", place);
  // File for the first council seat that takes filings, through the UI.
  await page.locator('[data-tab="travel"]').first().evaluate((e) => e.click());
  const visited = new Set();
  let filed = "";
  for (let round = 0; round < 12 && !filed; round += 1) {
    if (!(await page.locator("#sheet:not([hidden])").count())) {
      await page.locator('[data-tab="travel"]').first().evaluate((e) => e.click());
      await page.waitForTimeout(1000);
    }
    const labels = await page
      .locator("#sheet-body button", { hasText: /Go/ })
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))
      .catch(() => []);
    const label = labels.find((l) => !visited.has(l));
    if (!label) break;
    visited.add(label);
    console.log("Trying:", label);
    await page
      .locator(`#sheet-body button[aria-label="${label}"]`)
      .evaluate((e) => e.click());
    const talked = await page
      .locator("#talk:not([hidden])")
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    console.log("Talk open:", talked);
    if (!talked) continue;
    await page
      .locator("#talk-choices button")
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {});
    for (let round = 0; round < 6 && !filed; round += 1) {
      const choices = page.locator("#talk-choices button");
      const n = await choices.count();
      if (!n) {
        await page.waitForTimeout(1500);
        continue;
      }
      const texts = [];
      for (let c = 0; c < n; c += 1)
        texts.push(await choices.nth(c).innerText());
      console.log("Choices:", texts.join(" | "));
      const order = [...Array(n).keys()].sort((a, b) => {
        const rank = (t) =>
          /council.*2026/i.test(t) ? 0 : /mayor/i.test(t) ? 1 : /I want to run for/i.test(t) ? 2 : 3;
        return rank(texts[a]) - rank(texts[b]);
      });
      let acted = false;
      for (const c of order) {
        if (/I want to run for/i.test(texts[c])) {
          console.log("Filing as:", texts[c]);
          await choices.nth(c).click();
          await page.waitForTimeout(2000);
          if (await page.locator("#filing-overlay:not([hidden])").count()) {
            const names = await page
              .locator("#filing-checks .row")
              .allInnerTexts()
              .catch(() => []);
            console.log("Rules:", names.join(" | "));
            await page
              .locator("#filing-party option")
              .nth(1)
              .waitFor({ timeout: 10000 })
              .catch(() => {});
            const nparts = await page.locator("#filing-party option").count();
            if (nparts > 1)
              await page.locator("#filing-party").selectOption({ index: 1 });
            console.log(
              "Party:",
              await page.locator("#filing-party").inputValue().catch(() => "?"),
            );
            await choices.nth(c).click();
            await page.waitForTimeout(2000);
            console.log(
              "After submit:",
              (await page.locator("#talk-lines").innerText().catch(() => "")).slice(-200),
            );
          }
          acted = true;
          break;
        }
      }
      if (acted) break;
      await choices.first().click();
      await page.waitForTimeout(1500);
    }
    const lines = await page.locator("#talk-lines").innerText().catch(() => "");
    if (/filed|filing|ballot/i.test(lines)) filed = lines.slice(-120);
    await page.locator("#talk-leave").click().catch(() => {});
  }
  console.log("Filed:", filed || "NOT FILED");
  assert.ok(filed, "could not file for a seat through the UI");
  await page.screenshot({ path: "docs/reports/ballot-pages-2026-10-24/before-filed.png" });
  console.log("PASS setup: filed for a seat");
} finally {
  await browser.close();
}
