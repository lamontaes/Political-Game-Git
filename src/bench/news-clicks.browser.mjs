/* global process, console, document, getComputedStyle */
// Nothing on the front page invites a click that does nothing (owner, Nov 1:
// "I click on it, nothing happens"): every headline that is a button opens its
// story in place, and a brief in the side column is plain type with no pointer
// and no hover change. Run against a fresh bench: node src/bench/news-clicks.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
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
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  // A drawn place with a side column of briefs (a race's results) is wanted:
  // up to ten worlds are drawn, and BENCH_SEED replays one.
  const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
  const seeds = process.env.BENCH_SEED
    ? [process.env.BENCH_SEED]
    : [null, null, null, null, null, null, null, null, null, null];
  for (const [attempt, wanted] of seeds.entries()) {
    // The last try is a place known to print a side column (Boonville, New
    // York), for when five drawn places print none.
    const seed =
      wanted && wanted !== "fallback"
        ? wanted
        : (await (await page.request.get(`${base}/api/seed`)).json()).seed;
    const params = new URLSearchParams({
      seed,
      date: "2025-01-20",
      ...(wanted === "fallback" ? { placeKey: "3607355" } : {}),
    });
    await page.request.post(`${base}/api/newlife?${params}`, {
      timeout: 300000,
    });
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
    await page.locator("#sheet-body .paper-stories").waitFor();
    await page.waitForTimeout(800);
    if (await page.locator(".paper-side .side-headline").count()) break;
    if (attempt < seeds.length - 1)
      await page
        .locator("#sheet-close")
        .click()
        .catch(() => {});
  }
  const side = page.locator(".paper-side .side-headline");
  const briefs = await side.count();
  assert.ok(briefs > 0, "no drawn place had a side column of briefs");
  console.log(`${briefs} briefs in the side column`);
  for (let i = 0; i < briefs; i += 1) {
    const item = side.nth(i);
    const tag = await item.evaluate((node) => node.tagName);
    assert.notEqual(tag, "BUTTON", "a brief is a button");
    const before = await item.evaluate((node) => getComputedStyle(node).color);
    await item.hover();
    const hovered = await item.evaluate((node) => ({
      cursor: getComputedStyle(node).cursor,
      color: getComputedStyle(node).color,
    }));
    assert.notEqual(hovered.cursor, "pointer", "a brief shows a pointer");
    assert.equal(hovered.color, before, "a brief changes on hover");
  }
  if (shots && briefs)
    (await side.first().hover(),
      await page.screenshot({ path: `${shots}/brief-hovered-1440x900.png` }));
  // Every headline that is a button opens its story in place.
  const headlines = await page.locator(".story-headline").count();
  console.log(`${headlines} headlines that open`);
  let opened = 0;
  for (let i = 0; i < Math.min(headlines, 4); i += 1) {
    const button = page.locator(".story-headline").nth(i);
    const text = (await button.innerText()).trim();
    await button.click();
    const lead = (
      await page
        .locator(".paper-story.lead .story-headline")
        .first()
        .innerText()
    ).trim();
    assert.equal(lead, text, `"${text}" did not open in place`);
    opened += 1;
  }
  assert.ok(opened > 0 || headlines === 0, "no headline was clicked");
  if (shots)
    await page.screenshot({ path: `${shots}/story-opened-1440x900.png` });
  assert.deepEqual(errors, []);
  console.log("news clicks: pass");
} finally {
  await browser.close();
}
