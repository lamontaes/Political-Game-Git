/* global process, console, URL */
// A person's card with Dev mode on lists each record by its id, with kind and date beside it, and a
// click opens that record's Trace: no "[object Object]" and never a "missing" kind.
// Run against a fresh bench: node src/bench/dev-person-records.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  // Thirty days run from the Calendar's Run panel, so people have records.
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  const ran = page.waitForResponse(
    (r) => r.url().includes("/api/dev/run-until"),
    {
      timeout: 600000,
    },
  );
  await page.locator('[data-testid="dev-run"]').evaluate((e) => e.click());
  await ran;
  await page.locator("#sheet-close").click();
  // A person's card, opened from a member of government.
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-body .member-card").first().click();
  await page.locator('[data-testid="dev-ill"]').waitFor();
  const ids = page.locator(".dev-record-ids .id");
  await page.waitForTimeout(2000);
  await ids.first().waitFor();
  const sheet = await page.locator("#person").innerText();
  assert.ok(
    !sheet.includes("[object Object]"),
    "a slot prints [object Object]",
  );
  // A slot the game keeps nothing in is not drawn, never "director null".
  const records = await page.locator(".dev-records").innerText();
  assert.ok(
    !/\bnull\b/.test(records),
    `a slot prints null: ${records.match(/.{0,20}\bnull\b/)?.[0]}`,
  );
  const count = Math.min(3, await ids.count());
  assert.ok(count > 0, "the Records section lists no record");
  for (let i = 0; i < count; i += 1) {
    const id = (await ids.nth(i).innerText()).trim();
    await ids.nth(i).click();
    await page.waitForTimeout(800);
    const text = await page.locator("#person").innerText();
    assert.ok(text.includes(id), `the Trace is not headed by ${id}`);
    assert.ok(
      !/kind missing|record null/i.test(text),
      `Trace of ${id} says missing`,
    );
  }
  if (shots) await page.screenshot({ path: `${shots}/dev-person-records.png` });
  assert.deepEqual(errors, []);
  console.log(
    "PASS each record shows by id with its kind and date and opens its Trace",
  );
} finally {
  await browser.close();
}
