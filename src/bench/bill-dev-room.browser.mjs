/* global process, console, document */
// A bill's page with dev mode on keeps room for the bill (Laws and effects,
// Nov 16: on the Bills page "the dev mode panel sits over the bill's own
// sections", cut off below their first lines). Starts a life in a drawn
// place, turns dev mode on, opens Politics > Bills, and on the first bill
// reads the bill's columns and dev mode's card: each column at least a third
// of the page's height, the card under them, and neither over the other.
// Run against the bench: node src/bench/bill-dev-room.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const port = process.env.BENCH_PORT ?? 3000;
const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const { seed, placeName } = await startLife(page, {
    url: `http://localhost:${port}/play`,
    fresh: true,
  });
  console.log("Seed:", seed, "Place:", placeName);
  await devModeOn(page);
  await page.locator('#rings [data-tab="politics"]').evaluate((e) => e.click());
  await page
    .locator('#sheet-tabs [data-tab="bills"]')
    .evaluate((e) => e.click());
  await page.locator(".roster-page .bill-board + .dev-bill-card").waitFor();
  await page.waitForTimeout(800);
  if (shots) await page.screenshot({ path: `${shots}/bill-dev.png` });
  const m = await page.evaluate(() => {
    const box = (n) => n.getBoundingClientRect();
    const pageBox = box(document.querySelector(".roster-page"));
    const card = box(document.querySelector(".dev-bill-card"));
    const cols = [
      ...document.querySelectorAll(".bill-board .board-cols > .mx3col"),
    ].map(box);
    return {
      page: pageBox.height,
      cols: cols.map((c) => ({ height: c.height, bottom: c.bottom })),
      cardTop: card.top,
      cardHeight: card.height,
    };
  });
  console.log(
    `bill columns ${m.cols.map((c) => Math.round(c.height)).join(", ")} of a page ${Math.round(m.page)}; dev card ${Math.round(m.cardHeight)}`,
  );
  assert.ok(m.cols.length, "the bill has no columns");
  for (const col of m.cols) {
    assert.ok(
      col.height >= m.page / 3,
      `a bill column is ${Math.round(col.height)} tall on a page ${Math.round(m.page)} tall`,
    );
    assert.ok(col.bottom <= m.cardTop + 1, "the dev card sits over the bill");
  }
  assert.ok(m.cardHeight > 0, "dev mode's card is not on the page");
  // Each body to introduce at is named once (a territory's delegate row once
  // made a second House button, and its Senate read as the House).
  const bodies = await page
    .locator(".dev-bill-card [data-body]")
    .evaluateAll((buttons) => buttons.map((b) => b.textContent));
  console.log("Introduce at:", bodies.join(" · "));
  assert.equal(
    new Set(bodies).size,
    bodies.length,
    `two bodies share a name: ${bodies.join(", ")}`,
  );
  assert.deepEqual(errors, []);
  console.log("bill dev room: pass");
} finally {
  await browser.close();
}
