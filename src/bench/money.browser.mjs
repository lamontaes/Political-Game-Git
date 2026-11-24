/* global document, console, URL, process */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
await page.route("**/api/controls", async (route) => {
  const response = await route.fetch();
  const data = await response.json();
  const { readFile } = await import("node:fs/promises");
  await route.fulfill({
    json: {
      ...data,
      ...JSON.parse(await readFile("src/bench/data/controls.json", "utf8")),
    },
  });
});
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR", e.message);
});
try {
  // The one start: a new life (or the saved one) with its opening played through.
  await startLife(page);
  const name = await page.locator("#card-name").innerText();
  // The clock's text, not its layout: the card steps aside while a sheet is open.
  const clock = await page.locator("#card-clock").textContent();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const banked = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/bank",
  );
  await page
    .locator('[data-tab="money"]')
    .first()
    .evaluate((e) => e.click());
  const bank = await (await banked).json();
  // The cash in large type (the Money mock's figure), in dollars.
  await page.locator("#sheet-body .money-figure").waitFor();
  const figure = await page.locator("#sheet-body .money-figure").innerText();
  assert.ok(figure.includes("$"));
  // The figure is the household's cash now, the count each month's row under
  // it uses, never one member's alone ($0 over months of $4,300, Nov 13).
  if (bank?.cash && !/[a-z]/i.test(figure)) {
    const dollars = Number(figure.replace(/[^0-9.]/g, ""));
    const now = bank.cash.nowMinor / 100;
    assert.ok(
      Math.abs(dollars - now) <= Math.max(10, now * 0.05),
      `the cash figure ${figure} is the household's ${now}`,
    );
  }
  assert.ok(
    await page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return body.scrollHeight <= body.clientHeight + 1;
    }),
    "the Money panel scrolls",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/reports/money-layout/money.png" });
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  assert.deepEqual(errors, []);
  console.log("PASS actual balance view without time");
} finally {
  await browser.close();
}
