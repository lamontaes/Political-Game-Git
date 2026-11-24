/* global process, console, document */
// A person's card closes when its close mark is clicked (the Player on issue #9995, Nov 18: "a mouse
// click on the card's close mark doesn't close it, because the 770-pixel name heading covers the
// mark"). A card is opened from the Government screen of a drawn place at 1440x900, the close mark
// must be the element under its own center, and a real mouse click on it hides the card.
// Run against a fresh bench: node src/bench/person-card-close.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((button) => button.click());
  await page
    .locator("#sheet button", { hasText: "Government" })
    .first()
    .click();
  await page.locator("#sheet-body .member-card").first().click();
  await page.locator("#person:not([hidden])").waitFor();
  await page.waitForTimeout(600);
  const under = await page.evaluate(() => {
    const close = document.getElementById("person-close");
    const box = close.getBoundingClientRect();
    const at = document.elementFromPoint(
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    return at === close || close.contains(at);
  });
  assert.ok(under, "something covers the person card's close mark");
  if (shots) await page.screenshot({ path: `${shots}/person-card.png` });
  await page.locator("#person-close").click();
  await page.locator("#person[hidden]").waitFor({ state: "attached" });
  console.log("person-card-close: ok");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
