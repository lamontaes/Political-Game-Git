/* global process, console, URL */
// Pins family 31 (#9747): with dev mode on, a person's card shows the hours their day keeps back
// (their own upkeep and their share of their home's) and their home's week at home, and the
// home-time id opens in the Trace: each pair's home minutes and the time they shared, from their own
// work weeks, never a fixed figure.
// Run against a fresh bench: node src/bench/dev-home-time.browser.mjs [screenshot-dir]
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
  // Thirty days from the Calendar's Run panel: four weeks of time at home.
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  const ran = page.waitForResponse(
    (r) => r.url().includes("/api/dev/run-until"),
    { timeout: 600000 },
  );
  await page.locator('[data-testid="dev-run"]').evaluate((e) => e.click());
  await ran;
  await page.locator("#sheet-close").click();
  // The cards of the town's members of government, until one lives in a home the town keeps.
  let found = false;
  for (let i = 0; i < 8 && !found; i += 1) {
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    const cards = page.locator("#sheet-body .member-card");
    if (i >= (await cards.count())) break;
    await cards.nth(i).click();
    await page.locator(".dev-records").waitFor();
    await page.waitForTimeout(1000);
    const link = page.locator(".dev-records .id", { hasText: "home-time:" });
    if (!(await link.count())) {
      await page.keyboard.press("Escape");
      continue;
    }
    const records = await page.locator(".dev-records").innerText();
    assert.match(records, /reservedHours/, "no reserved hours on the card");
    const id = (await link.first().innerText()).trim();
    await link.first().click();
    await page.waitForFunction(
      (want) =>
        document.querySelector(".dev-trace h4")?.textContent?.includes(want),
      id,
    );
    const trace = await page.locator(".dev-trace").innerText();
    assert.match(trace, /upkeepHoursPerAdult/, trace);
    console.log(`Trace of ${id}:\n${trace}`);
    if (shots) {
      await page.locator(".dev-trace").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${shots}/dev-home-time-1440x900.png` });
    }
    found = true;
  }
  assert.ok(found, "no member of government's card showed a home-time row");
  assert.deepEqual(errors, []);
  console.log("PASS a card's home-time row opens its Trace with its inputs");
} finally {
  await browser.close();
}
