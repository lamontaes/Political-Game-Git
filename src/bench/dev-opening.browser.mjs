/* global console, process, document */
// With Dev mode on, Politics > Metrics carries "How this world opened" under the board: the town's
// rows, then the player's, their household's, a business's and an office's, each with how the
// opening made it; then Record lists every draw the opening took, and a household member's card
// shows their own rows. Fails on a page error, a subject with no rows or a card without them.
// Run against a fresh bench: node src/bench/dev-opening.browser.mjs [screenshot-dir]
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
try {
  await startLife(page, { fresh: true });
  await devModeOn(page);
  console.log("Place:", await page.locator("#card-place").innerText());
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-body button, #sheet button", { hasText: /^Metrics$/ })
    .first()
    .click();
  const view = page.locator(".dev-opening");
  for (const subject of ["town", "person", "household", "business", "office"]) {
    await view.waitFor();
    await page
      .locator('[data-testid="dev-opening-subject"]')
      .selectOption(subject);
    await page.waitForFunction(
      (s) =>
        document.querySelectorAll(".dev-opening-row").length > 0 &&
        document.querySelector('[data-testid="dev-opening-subject"]')?.value ===
          s,
      subject,
    );
    await page.waitForTimeout(800);
    const rows = await page.locator(".dev-opening-row").count();
    console.log(subject, rows, "rows");
    assert.ok(rows > 0, `${subject}: no rows`);
    if (shots) {
      await view.evaluate((n) => n.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: `${shots}/dev-opening-${subject}.png` });
    }
  }
  // Record: the world rebuilt from its recipe with the recorder on, every draw listed.
  await page.locator('[data-testid="dev-opening-record"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll(".dev-opening-draw").length > 0,
    null,
    { timeout: 1_200_000 },
  );
  const drawn = await page.locator(".dev-opening-draw").count();
  const unknown = await page.locator(".dev-opening-draw.unknown").count();
  console.log("draw sites", drawn, "not in the list", unknown);
  assert.ok(drawn > 50, "the recording listed too few draw sites");
  if (shots) {
    await page
      .locator(".dev-opening-draws")
      .evaluate((n) => n.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `${shots}/dev-opening-draws.png` });
  }
  // A person's card: the person slot shows how they opened.
  await page.locator("#sheet-close").click();
  await page
    .locator('#rings [data-tab="who"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-body .hispeople .nm.pick").first().click();
  await page.locator("#person:not([hidden]) .dev-opening").waitFor();
  const cardRows = await page
    .locator("#person .dev-opening .dev-opening-row")
    .count();
  console.log("person card", cardRows, "rows");
  assert.ok(cardRows > 0, "the person card shows no opening rows");
  if (shots) {
    await page
      .locator("#person .dev-opening")
      .evaluate((n) => n.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `${shots}/dev-opening-person-card.png` });
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
