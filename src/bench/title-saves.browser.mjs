/* global process, console, document, fetch */
// Saved games on the title, in a real browser on the bench (npm run bench):
// the item is live and opens a sheet with one strip for each saved life, or
// one plain line when there is none; it never does nothing (screen-to-mock).
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
  // Each saved life is a strip with its name, its date and Load; with none, one plain line.
  const title = await page.evaluate(async () =>
    (await fetch("/api/title")).json(),
  );
  if (title.saves.length) {
    assert.equal(
      await page.locator("#sheet .saves-row .sechead").count(),
      title.saves.length,
    );
    assert.equal(
      await page.locator("#sheet .saves-row .action").first().innerText(),
      "Load",
    );
    // The bust follows each save's own record (the player's one face; none for a child).
    assert.equal(
      await page.locator("#sheet .saves-row .mxbust .bust-stack").count(),
      title.saves.filter((life) => life.face).length,
    );
  } else assert.ok(await page.locator("#sheet .saves-none").count());
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  assert.deepEqual(errors, [], errors.join("; "));
} finally {
  await browser.close();
}
