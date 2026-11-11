/* global process, console, document, getComputedStyle, localStorage */
// Dev mode's Watch can be read (play-dev-watch-panel-is-black-on-black): with
// Dev mode on, the Calendar's sheet has a Watch tab that takes the whole
// sheet; every table in it has room for at least three rows, and every header
// and cell is light text on the dark sheet at 4.5 to 1 or better. With Dev
// mode off the Calendar has no tab row. Run against the bench:
//   BENCH_PORT=3000 node src/bench/dev-watch.browser.mjs [shots-dir]
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shots] = process.argv.slice(2);
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const openCalendar = async () => {
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.waitForTimeout(1200);
};
try {
  // A new life in a drawn place, its opening played as a player plays it.
  await startLife(page, { url: `${base}/play`, fresh: true });
  // Dev mode off: the Calendar is one screen, with no tab row.
  await openCalendar();
  assert.equal(
    await page.locator("#sheet-tabs .tab").count(),
    0,
    "the Calendar shows a tab row outside dev mode",
  );
  await page.keyboard.press("Escape");
  // Dev mode on: Watch is the Calendar's second tab.
  await page.evaluate(() => {
    localStorage.setItem("ocd-dev-mode", "1");
    document.body.classList.add("dev");
  });
  await openCalendar();
  assert.deepEqual(
    await page.locator("#sheet-tabs .tab").allInnerTexts(),
    ["Calendar", "Watch"],
    "dev mode's Calendar has a Watch tab",
  );
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Watch" })
    .click();
  await page.locator(".dev-watch table").first().waitFor();
  await page.waitForTimeout(1000);
  if (shots) await page.screenshot({ path: `${shots}/watch.png` });
  const read = await page.evaluate(() => {
    const light = (color) => {
      const [r, g, b] = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map((v) => {
          const c = Number(v) / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // The sheet's own fill, the darkest thing the text sits on.
    const sheet = light(
      getComputedStyle(document.getElementById("sheet")).backgroundColor,
    );
    const cells = [...document.querySelectorAll(".dev-watch th, .dev-watch td")]
      .filter((cell) => cell.textContent.trim())
      .map((cell) => {
        const text = light(getComputedStyle(cell).color);
        return {
          text: cell.textContent.trim().slice(0, 30),
          ratio:
            (Math.max(text, sheet) + 0.05) / (Math.min(text, sheet) + 0.05),
        };
      });
    const tables = [...document.querySelectorAll(".dev-watch table")]
      .filter((table) => table.rows.length > 1)
      .map((table) => ({
        rows: table.rows.length,
        room: Math.round(
          (table.closest(".scroll") ?? table).getBoundingClientRect().height,
        ),
        rowHeight: Math.round(table.rows[1].getBoundingClientRect().height),
      }));
    const body = document.getElementById("sheet-body");
    return {
      cells,
      tables,
      width: Math.round(
        document.querySelector(".dev-watch").getBoundingClientRect().width,
      ),
      scrollsSideways: body.scrollWidth > body.clientWidth + 1,
    };
  });
  console.log(
    `Watch: ${read.tables.length} tables with rows, ${read.cells.length} cells, ${read.width}px wide`,
  );
  assert.ok(read.width > 900, "Watch does not take the sheet's width");
  assert.equal(read.scrollsSideways, false, "the sheet scrolls sideways");
  assert.ok(read.cells.length > 0, "Watch holds no table text");
  const dim = read.cells.filter((cell) => cell.ratio < 4.5);
  assert.deepEqual(dim, [], "Watch cells under 4.5 to 1");
  for (const table of read.tables)
    assert.ok(
      table.room >= Math.min(3, table.rows) * Math.min(table.rowHeight, 40),
      `a Watch table of ${table.rows} rows has ${table.room}px of room`,
    );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS dev mode's Watch has its own tab and can be read");
} finally {
  await browser.close();
}
