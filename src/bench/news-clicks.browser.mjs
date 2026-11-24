/* global process, console, document, URLSearchParams */
// Every story opens on a click (owner, Nov 1: "I click on it, nothing happens"; Nov 16: "News
// stories open on click"): each paper lists every story as a headline, and clicking a headline
// opens that story at the right. The real News page of a drawn place is read: every listed
// headline is a button and opens its own story, and nothing on the page is a headline that
// does nothing.
// Run against a fresh bench: node src/bench/news-clicks.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/play`);
  const seed =
    process.env.BENCH_SEED ??
    (await (await page.request.get(`${base}/api/seed`)).json()).seed;
  await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date: "2025-01-20" })}`,
    { timeout: 300000 },
  );
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    `Seed ${seed}, place: ${await page.locator("#card-place").innerText()}`,
  );
  for (
    let i = 0;
    i < 8 && (await page.locator("#talk:visible").count());
    i += 1
  ) {
    await page
      .locator("#talk-leave:visible, #talk-next:visible, #talk-skip:visible")
      .first()
      .click();
    await page.waitForTimeout(500);
  }
  await page.locator('.ring[data-tab="news"]').click();
  await page.locator("#sheet-body .news-story").first().waitFor();
  await page.waitForTimeout(800);
  // Every story in the list is a button that opens its own story.
  const rows = page.locator(".news-board .news-row");
  const count = await rows.count();
  console.log(`${count} headlines that open`);
  assert.ok(count > 0, "the page lists no story");
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    assert.equal(await row.evaluate((node) => node.tagName), "BUTTON");
    const text = (await row.locator(".news-headline").innerText()).trim();
    const key = await row.getAttribute("data-key");
    await row.click();
    await page.waitForSelector(`.news-story.lead[data-key="${key}"]`);
    const lead = (
      await page.locator(".news-story.lead .news-headline").innerText()
    ).trim();
    assert.equal(lead, text, `"${text}" did not open`);
    assert.equal(await row.getAttribute("aria-pressed"), "true");
  }
  // Nothing scrolls as a page: the list and the story scroll inside their own columns.
  const fit = await page.evaluate(() => {
    const body = document.getElementById("sheet-body");
    return { all: body.scrollHeight, shown: body.clientHeight };
  });
  assert.ok(fit.all <= fit.shown + 1, "News scrolls as a page");
  if (shots)
    await page.screenshot({ path: `${shots}/news-opened-1440x900.png` });
  assert.deepEqual(errors, []);
  console.log("news clicks: pass");
} finally {
  await browser.close();
}
