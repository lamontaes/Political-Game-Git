/* global console, document, process, getComputedStyle */
// Buttons sit on the panel, never in a recessed, framed bar (owner, Nov 5: "no boxes"; sitting of
// Nov 23, rows P33 and P37: the wide box around Announce and Sim to Jun 27). Plays a new life,
// opens each Politics tab and asserts that no row of buttons draws its own frame: no border, no
// inset shadow, no background of its own. Runs at a drawn place (the first thing startLife
// draws) and prints it.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
/** Rows of buttons (a parent whose children are buttons) that draw a frame or a bar. */
const framedRows = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body button")]
      .map((b) => b.parentElement)
      .filter((row, at, all) => row && all.indexOf(row) === at)
      .filter((row) => {
        const css = getComputedStyle(row);
        const framed =
          parseFloat(css.borderTopWidth) > 0 && css.borderTopStyle !== "none";
        const inset = css.boxShadow.includes("inset");
        const bar = css.backgroundImage !== "none";
        return framed || inset || bar;
      })
      .map(
        (row) =>
          `${row.className || row.tagName}: ${row.textContent.slice(0, 40)}`,
      ),
  );
try {
  await startLife(page, { url: process.env.BENCH_URL });
  console.log("Player:", await page.locator("#card-place").innerText());
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-tabs button").first().waitFor();
  const tabs = await page.locator("#sheet-tabs button").allInnerTexts();
  console.log("Tabs:", tabs.join(", "));
  let rows = 0;
  for (const tab of tabs) {
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await page.waitForTimeout(600);
    rows += await page.locator("#sheet-body button").count();
    const framed = await framedRows();
    console.log(
      `${tab}: ${framed.length ? "FRAMED " + framed.join(" | ") : "buttons on the panel"}`,
    );
    assert.deepEqual(
      framed,
      [],
      `${tab}: a row of buttons draws a frame or a bar`,
    );
  }
  assert.ok(rows > 0, "no buttons were drawn on any Politics tab");
  assert.deepEqual(errors, []);
  console.log("PASS no row of buttons draws its own frame or bar");
} finally {
  await browser.close();
}
