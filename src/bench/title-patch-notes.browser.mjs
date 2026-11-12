/* global process, console, document */
// Patch notes on the title, in a real browser on the bench (npm run bench): the item is live,
// the builds list newest first, the chosen build's changes sit in a strip per heading, choosing
// another build shows its own notes, and the sheet never scrolls as a page (owner, Oct 29; the
// Nov 8 front mock, fr-notes).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const item = page.locator("#front-patch-notes");
  assert.equal(await item.isDisabled(), false, "Patch notes is grayed out");
  await item.click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator("#sheet-body .roster-row").first().waitFor();
  const read = () =>
    page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return {
        title: document.getElementById("sheet-title").textContent,
        builds: [...document.querySelectorAll("#sheet-body .roster-row b")].map(
          (b) => b.textContent,
        ),
        chosen: document.querySelector(
          '#sheet-body .roster-row[aria-pressed="true"] b',
        )?.textContent,
        headings: [...document.querySelectorAll("#sheet-body .sechead")].map(
          (h) => h.textContent,
        ),
        text: body.innerText,
        scrolls: body.scrollHeight > body.clientHeight + 2,
        strays: [...document.querySelectorAll("#sheet button")].filter((b) =>
          /^\s*(continue|back)\s*$/i.test(b.textContent ?? ""),
        ).length,
      };
    });
  const newest = await read();
  console.log(
    `${newest.title}: ${newest.builds.length} builds on the first page, newest ${newest.chosen}; strips: ${newest.headings.join(", ")}`,
  );
  assert.equal(newest.title, "Patch notes");
  assert.ok(newest.builds.length >= 2, "the builds are listed");
  assert.equal(newest.chosen, newest.builds[0], "the newest build is chosen");
  assert.match(newest.chosen ?? "", /\d+\.\d+\.\d+/, "the build is named");
  assert.ok(
    newest.headings.length >= 2,
    "a strip for Builds and one per heading",
  );
  assert.ok(!/unreleased/i.test(newest.text), "nothing unreleased on the page");
  assert.equal(newest.scrolls, false, "the sheet scrolls");
  assert.equal(newest.strays, 0, "a Continue or Back button");
  await page.locator("#sheet-body .roster-row").nth(1).click();
  const second = await read();
  assert.equal(
    second.chosen,
    newest.builds[1],
    "the chosen build did not change",
  );
  assert.notEqual(
    second.text,
    newest.text,
    "the notes did not change with the build",
  );
  assert.deepEqual(errors, [], errors.join("; "));
  console.log("ok: Patch notes opens from the title");
} finally {
  await browser.close();
}
