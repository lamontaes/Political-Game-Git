/* global process, console, URL */
// Dev mode's Industries panel on the Calendar: every industry in the town with its staff and books;
// a click on an industry lists its businesses by name, and a click on a business lists its months
// with each record opening in Trace. No "[object Object]", no raw kind ids, no "null".
// Run against a fresh bench: node src/bench/dev-industries.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: shots ? 2 : 1,
});
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (new URL(r.url()).pathname === "/api/newlife")
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
});
try {
  await startLife(page, { fresh: true });
  await devModeOn(page);
  console.log("Place:", await page.locator("#card-place").innerText());
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  // Two months from the Calendar's Run panel, so every business has months of books.
  const ran = page.waitForResponse(
    (r) => r.url().includes("/api/dev/run-until"),
    { timeout: 600000 },
  );
  await page.locator('[data-testid="dev-run"]').evaluate((e) => e.click());
  await ran;
  await page.locator("#sheet-close").click();
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  const table = page.locator('[data-testid="dev-industries"]');
  await table.waitFor();
  const rows = table.locator("tr.item");
  assert.ok((await rows.count()) > 0, "the Industries panel lists no industry");
  const text = await table.innerText();
  assert.ok(!/\[object Object\]|\bnull\b|undefined/.test(text), text);
  assert.ok(!/building-services|personal-care|care-home/.test(text), text);
  console.log(text);
  await rows.first().click();
  const business = page.locator(".dev-industry-businesses tr.item").first();
  await business.waitFor();
  await business.click();
  // The months table has no picking: its rows after the header.
  const months = page.locator(".dev-industry-months tr").nth(1);
  await months.waitFor();
  console.log(await page.locator(".dev-industry-months").innerText());
  await page.locator(".dev-industry-months .id").first().click();
  await page.waitForTimeout(1000);
  const trace = await page.locator(".dev-trace").innerText();
  assert.ok(
    trace.includes("business-trading:"),
    "the month's Trace did not open",
  );
  if (shots) {
    await page.locator(".dev-industry-businesses").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/dev-industries-1440x900.png` });
  }
  assert.deepEqual(errors, []);
  console.log("dev industries: ok");
} finally {
  await browser.close();
}
