/* global process, console, document, fetch */
// Saved games on the title, in a real browser on the bench (npm run bench):
// the item is live and opens a sheet that says what is kept and what is not
// built yet; it never does nothing (screen-to-mock: nothing on screen does nothing).
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
  const item = page.locator("#front-saves");
  assert.equal(await item.isDisabled(), false, "Saved games is grayed out");
  await item.click();
  await page.locator("#sheet:not([hidden])").waitFor();
  const read = await page.evaluate(() => ({
    title: document.getElementById("sheet-title").textContent,
    text: document.getElementById("sheet-body").innerText,
  }));
  console.log(`${read.title}: ${read.text.replace(/\s+/g, " ")}`);
  assert.equal(read.title, "Saved games");
  // The one life in progress is a strip with its name, its date and Load; with none, one plain line.
  const life = await page.locator("#front-continue").isEnabled();
  if (life) {
    assert.equal(await page.locator("#sheet .saves-row .sechead").count(), 1);
    assert.equal(
      await page.locator("#sheet .saves-row .action").innerText(),
      "Load",
    );
    // The bust follows the title's own record (the player's one face; none for a child).
    const face = await page.evaluate(
      async () => (await (await fetch("/api/title")).json()).life?.face,
    );
    assert.equal(
      await page.locator("#sheet .saves-row .mxbust .bust-stack").count(),
      face ? 1 : 0,
    );
  } else assert.ok(await page.locator("#sheet .saves-none").count());
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  assert.deepEqual(errors, [], errors.join("; "));
} finally {
  await browser.close();
}
