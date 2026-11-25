/* global process, console, document, getComputedStyle */
// The Bills page's columns never scroll sideways, in a real browser on the bench (npm run bench)
// (a `ui-look` scroller seen on #10534's runs at Faga'itua, American Samoa: `div.mx3col`, axis x,
// intermittent): a column holds a word wider than itself, in some world (a long name or title),
// and `overflow-y: auto` makes the other axis scroll too. The word is put in by hand (an edge
// case, the way a long name would arrive); each column then must hold it without a sideways
// scroll, and the word stays inside the column.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  const life = await startLife(page, { fresh: true });
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('.tab:has-text("Bills")').first().click();
  await page.locator("#sheet-body .bill-board .mx3col").first().waitFor();
  await page.waitForTimeout(1500);
  const seen = await page.evaluate(() => {
    const word = "Tuiasosopo-Faamausili-Leiataua-Ioane-Mailo-Lutu-Fiu";
    const cols = [
      ...document.querySelectorAll("#sheet-body .bill-board .mx3col"),
    ];
    for (const col of cols)
      for (const leaf of [...col.querySelectorAll("*")]
        .filter(
          (n) => n.children.length === 0 && n.textContent.trim().length > 2,
        )
        .slice(0, 4))
        leaf.textContent = `${leaf.textContent.trim()} ${word}`;
    return cols.map((col) => {
      const box = col.getBoundingClientRect();
      const past = [...col.querySelectorAll("*")].filter(
        (n) => n.getBoundingClientRect().right > box.right + 1,
      ).length;
      return {
        sideways: col.scrollWidth - col.clientWidth,
        past,
        scrollsX: /(auto|scroll)/.test(getComputedStyle(col).overflowX),
      };
    });
  });
  assert.ok(
    seen.length >= 1,
    `${life.placeName}: no columns on the Bills page`,
  );
  for (const [at, col] of seen.entries()) {
    assert.ok(
      col.sideways <= 1,
      `${life.placeName}: column ${at + 1} of the Bills page scrolls ${col.sideways}px sideways`,
    );
    assert.equal(
      col.past,
      0,
      `${life.placeName}: ${col.past} things in column ${at + 1} stand past its edge`,
    );
  }
  console.log(
    `ok: ${life.placeName}: ${seen.length} Bills columns hold a long word without a sideways scroll`,
  );
} finally {
  await browser.close();
}
