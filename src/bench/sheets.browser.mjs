/* global process, URL, console, document, NodeFilter */
// Every sheet of a new game, at the start and after a day, prints no raw
// record id and no missing value ("undefined", "NaN").
import assert from "node:assert/strict";
import { chromium } from "playwright";
const RECORD_ID =
  /\b(?:[a-z][a-z-]*_[0-9a-f]{8,}|[a-z][a-z-]*(?::[A-Za-z0-9._@-]+){2,})\b/;
const MISSING = /\b(?:undefined|NaN|null)\b/;
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
      // Only what a reader can see: hidden lines don't count.
      const text = await page.locator("#sheet").evaluate((sheet) => {
        const out = [];
        const walk = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode())
          if (n.parentElement?.checkVisibility?.() !== false)
            out.push(n.textContent);
        return out.join("\n");
      });
      for (const line of text.split("\n"))
        if (RECORD_ID.test(line) || MISSING.test(line))
          bad.push(`${when} · ${tab}: ${line.trim().slice(0, 160)}`);
      // No dead space (owner, Oct 27): a reading screen ends under what it
      // holds, a hand's width of chrome at most beyond its content.
      if (["journal", "jobs", "money"].includes(tab)) {
        const fit = await page.evaluate(() => {
          const sheet = document
            .getElementById("sheet")
            .getBoundingClientRect();
          const body = document.getElementById("sheet-body");
          const last = [...body.children].at(-1)?.getBoundingClientRect();
          return { sheet: sheet.bottom, content: last?.bottom ?? sheet.top };
        });
        if (fit.sheet - fit.content > 120)
          bad.push(
            `${when} · ${tab}: ${Math.round(fit.sheet - fit.content)}px empty under the content`,
          );
      }
      // What you're like is said in sentences, never as trait names and scores.
      if (
        tab === "who" &&
        /Deliberation|Sociability|Neither, much|Handling disagreement|Keeping commitments/.test(
          text,
        )
      )
        bad.push(`${when} · who: trait names on screen`);
      await page.keyboard.press("Escape");
    }
    // Escape opens Options over a screen; close whatever is open before going on.
    if (await page.locator("#sheet").isVisible())
      await page.locator("#sheet-close").click();
  };
  await scan("start");
  // A new life opens on a scene in the talk box (the President's address), and the clock
  // with its Day button stays hidden until the scene is played through.
  for (let line = 0; line < 60; line += 1) {
    const next = page.locator("#talk-next");
    if (!(await next.isVisible())) break;
    await next.click();
    await page.waitForTimeout(250);
  }
  await page.locator("#day").click();
  await page.waitForFunction(() => !document.getElementById("day").disabled);
  await scan("after a day");
  console.log(bad.length ? bad.join("\n") : "no raw ids or missing values");
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  console.log(`PASS ${tabs.length} sheets, twice`);
} finally {
  await browser.close();
}
