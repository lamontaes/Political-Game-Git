/* global process, console, URL */
// Pins family 31 (#9747): with dev mode on, a person's card in People shows the hours their day keeps back
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
  // The people the player knows, from People: the first whose home the
  // town keeps shows its home-time row on their card.
  let found = false;
  await page
    .locator('#rings [data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  const rows = page.locator(".roster-screen.people .roster-row");
  await rows
    .first()
    .waitFor()
    .catch(async (e) => {
      if (shots)
        await page.screenshot({ path: `${shots}/dev-home-time-no-roster.png` });
      throw e;
    });
  const count = Math.min(12, await rows.count());
  for (let i = 0; i < count && !found; i += 1) {
    await rows.nth(i).click();
    const card = page.locator(".roster-screen.people .roster-page");
    await card.locator(".dev-records").first().waitFor();
    await page.waitForTimeout(800);
    const link = card.locator(".dev-records .id", { hasText: "home-time:" });
    if (!(await link.count())) continue;
    const records = (await card.locator(".dev-records").allInnerTexts()).join(
      "\n",
    );
    assert.match(records, /reservedHours/, "no reserved hours on the card");
    const id = (await link.first().innerText()).trim();
    // The row sits inside a folded section: open it, then the id.
    await link.first().evaluate((e) => {
      for (let p = e.parentElement; p; p = p.parentElement)
        if (p.tagName === "DETAILS") p.open = true;
    });
    await link.first().click();
    await page.waitForFunction(
      (want) =>
        [...document.querySelectorAll(".dev-trace h4")].some((h) =>
          h.textContent.includes(want),
        ),
      id,
    );
    const trace = await card.locator(".dev-trace").first().innerText();
    assert.match(trace, /upkeepHoursPerAdult/, trace);
    console.log(`Trace of ${id}:\n${trace}`);
    if (shots) {
      await card.locator(".dev-trace").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${shots}/dev-home-time-1440x900.png` });
    }
    found = true;
  }
  assert.ok(
    found,
    "no card among the first people in People showed a home-time row",
  );
  assert.deepEqual(errors, []);
  console.log("PASS a card's home-time row opens its Trace with its inputs");
} finally {
  await browser.close();
}
