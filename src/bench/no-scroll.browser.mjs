/* global process, URL, console, document */
// Every sheet of a new game, at the start and after a day, fits its window: the
// sheet's panel and the page overflow by no more than 8 pixels. A long body scrolls
// inside the panel under the game's own scroller; it never pages (owner, Oct 29).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const SLACK = 8;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const bad = [];
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  if (await page.locator("#front-continue").isEnabled()) {
    await page.locator("#front-continue").click();
  } else {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  // Every screen: the rail's, Who you are from the portrait, and its Jobs and
  // study tab.
  const tabs = [
    ...(await page
      .locator("#rings [data-tab]")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab))),
    "jobs",
  ];
  const scan = async (when) => {
    for (const tab of tabs) {
      if (tab === "jobs") {
        await page
          .locator('#rings [data-tab="who"]')
          .evaluate((e) => e.click());
        await page.locator('#sheet-tabs [data-tab="jobs"]').waitFor();
        await page.locator('#sheet-tabs [data-tab="jobs"]').click();
      } else
        await page
          .locator(`#rings [data-tab="${tab}"]`)
          .first()
          .evaluate((e) => e.click());
      await page.waitForTimeout(1500);
      // The sheet panel and the page: how far each holds more than it shows.
      const over = await page.evaluate(() => {
        const sheet = document.getElementById("sheet");
        const body = document.scrollingElement;
        const worst = {
          px: sheet.scrollHeight - sheet.clientHeight,
          where: "#sheet",
        };
        return {
          sheet: worst.px,
          where: worst.where,
          page: body.scrollHeight - body.clientHeight,
        };
      });
      console.log(
        `${when} · ${tab}: ${over.where} ${over.sheet}px, page ${over.page}px`,
      );
      if (over.sheet > SLACK || over.page > SLACK)
        bad.push(
          `${when} · ${tab}: ${over.where} over by ${over.sheet}px, page by ${over.page}px`,
        );
      await page.keyboard.press("Escape");
    }
    // Escape opens Options over a screen; close whatever is open before going on.
    if (await page.locator("#sheet").isVisible())
      await page.locator("#sheet-close").click();
  };
  await scan("start");
  await page.locator("#day").click();
  await page.waitForFunction(() => !document.getElementById("day").disabled);
  await scan("after a day");
  console.log(bad.length ? bad.join("\n") : "no sheet scrolls");
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  console.log(`PASS ${tabs.length} sheets, twice`);
} finally {
  await browser.close();
}
