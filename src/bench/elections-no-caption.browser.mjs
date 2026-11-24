/* global process, console, document */
// A race not yet open to file for has no caption under its buttons, in a real browser on the bench
// (npm run bench) (the CTO's 06:46Z catch, Merizo: "Filing for this race hasn't opened yet." under
// "Sim to Mar 8"; the Nov 8 no-subtext rule): on Politics > Elections, with each race on the
// player's ballot opened in turn, no line under the buttons says filing has not opened.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  await startLife(page, { fresh: true });
  // Every race on the ballot made a not-yet-open one that cannot be announced (an edge case made
  // by hand; the clerk's real answer carries the same `bar`).
  await page.route("**/api/government/local-races", async (route) => {
    const ballot = await (await route.fetch()).json();
    for (const race of ballot.races ?? []) {
      race.bar = "window-not-open";
      race.barWhy = null;
      race.mayAnnounce = false;
      race.announced = false;
    }
    await route.fulfill({ json: ballot });
  });
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator("#sheet button", { hasText: "Elections" }).first().click();
  await page.locator(".roster-row").first().waitFor();
  const rows = await page.locator(".roster-row").count();
  let simmed = 0;
  for (let at = 0; at < rows; at += 1) {
    await page.locator(".roster-row").nth(at).click();
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const captions = [
        ...document.querySelectorAll("#sheet-body .record-empty"),
      ]
        .map((node) => node.textContent ?? "")
        .filter((text) => /hasn.t opened/i.test(text));
      const sims = [...document.querySelectorAll("#sheet-body button")].filter(
        (button) => /^sim to/i.test(button.textContent?.trim() ?? ""),
      ).length;
      return { captions, sims };
    });
    simmed += state.sims;
    assert.deepEqual(
      state.captions,
      [],
      `a caption says filing has not opened (row ${at})`,
    );
  }
  console.log(
    `ok: ${rows} races opened, ${simmed} with a Sim button, none with a not-opened caption`,
  );
} finally {
  await browser.close();
}
