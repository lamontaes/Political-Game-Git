/* global process, console, document */
// Patch notes on the title, in a real browser on the bench (npm run bench):
// the item is live, it opens the release notes one release a page, newest
// first, and nothing unreleased is on the page (owner, Oct 28 sitting, point 1).
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
  await page.locator("#sheet-body h3").first().waitFor();
  const shown = await page.evaluate(() => ({
    title: document.getElementById("sheet-title").textContent,
    sections: [...document.querySelectorAll("#sheet-body h3")].map(
      (h) => h.textContent,
    ),
    text: document.getElementById("sheet-body").innerText,
    strays: [...document.querySelectorAll("#sheet button")].filter((b) =>
      /^\s*(continue|back)\s*$/i.test(b.textContent ?? ""),
    ).length,
  }));
  console.log(`${shown.title}: ${shown.sections.join(" | ")}`);
  assert.equal(shown.title, "Patch notes");
  assert.ok(shown.sections.length >= 1, "the releases are listed");
  assert.match(shown.sections[0], /\d+\.\d+\.\d+/, "the release is named");
  assert.doesNotMatch(shown.text, /UNRELEASED|CANDIDATE|\*\*|^- /m);
  assert.equal(shown.strays, 0, "Back or Continue on the patch notes");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/01-title-patch-notes.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Patch notes opens from the title");
} finally {
  await browser.close();
}
