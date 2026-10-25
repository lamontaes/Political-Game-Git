/* global process, URL, console, document, getComputedStyle */
// The night's news is a toast (play-first-08): it fades within ten seconds
// untouched, a click on its close removes it at once, and the story is still
// in News. Drawn place (New world), first evening. SHOTS=<label> saves
// screenshots into docs/reports/news-toast-2026-10-25/.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const port = process.env.BENCH_PORT ?? "3000";
const base = `http://localhost:${port}`;
const label = process.env.SHOTS;
const dir = "docs/reports/news-toast-2026-10-25";
if (label) mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
let tag = "";

/** A new drawn-place game up to the first evening at home. */
async function newGame(page) {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const r = await response;
  assert.equal(r.status(), 200);
  const seed = new URL(r.url()).searchParams.get("seed");
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 120000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
  await page.locator("#news-surface:not([hidden])").waitFor({ timeout: 60000 });
  const place = await page.locator("#card-place").innerText();
  tag = `${place.replace(/\W+/g, "-")}-seed-${seed}`;
  console.log("Place:", place, "Seed:", seed);
}
/** Gone: hidden, or fully transparent and not clickable. */
const gone = (page) =>
  page.evaluate(() => {
    const node = document.getElementById("news-surface");
    if (node.hidden) return true;
    const style = getComputedStyle(node);
    return (
      style.display === "none" ||
      style.visibility === "hidden" ||
      (Number(style.opacity) === 0 && style.pointerEvents === "none")
    );
  });

try {
  // Untouched: it fades within ten seconds.
  const page = await browser.newPage({
    viewport: { width: 1672, height: 941 },
  });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  await newGame(page);
  assert.equal(await gone(page), false, "the toast is not showing");
  assert.ok(
    (await page.locator("#news-surface-headline").innerText()).length > 0,
    "the toast has no story",
  );
  if (label)
    await page.screenshot({ path: `${dir}/${label}-1-appears-${tag}.png` });
  const start = Date.now();
  await page
    .waitForFunction(
      () => {
        const node = document.getElementById("news-surface");
        const style = getComputedStyle(node);
        return (
          node.hidden ||
          style.display === "none" ||
          (Number(style.opacity) === 0 && style.pointerEvents === "none")
        );
      },
      undefined,
      { timeout: 10000, polling: 100 },
    )
    .catch(async () => {
      if (label)
        await page.screenshot({
          path: `${dir}/${label}-2-after-ten-seconds-${tag}.png`,
        });
      throw new Error(
        "the news toast was still on screen ten seconds after the first evening began",
      );
    });
  console.log("Faded after", ((Date.now() - start) / 1000).toFixed(1), "s");
  if (label)
    await page.screenshot({
      path: `${dir}/${label}-2-after-ten-seconds-${tag}.png`,
    });
  await page.close();

  // A second appearance: one click on close removes it at once.
  const second = await browser.newPage({
    viewport: { width: 1672, height: 941 },
  });
  second.setDefaultTimeout(30000);
  second.on("pageerror", (e) => errors.push(e.message));
  await newGame(second);
  const headline = await second.locator("#news-surface-headline").innerText();
  const close = second.locator("#news-surface-close");
  assert.ok(await close.isVisible(), "the toast has no close control");
  assert.ok(
    ((await close.getAttribute("aria-label")) ?? "").length > 0,
    "the close control has no name",
  );
  await close.click();
  assert.equal(await gone(second), true, "the toast stayed after close");
  if (label)
    await second.screenshot({ path: `${dir}/${label}-3-closed-${tag}.png` });

  // The story is still in News.
  await second
    .locator('[data-tab="news"]')
    .first()
    .evaluate((e) => e.click());
  await second.locator(".paper").waitFor();
  const stories = await second.locator(".story-headline").allInnerTexts();
  assert.ok(
    stories.some((text) => text.trim() === headline.trim()),
    `the toast story is missing from News: "${headline}" not in ${JSON.stringify(stories)}`,
  );
  if (label)
    await second.screenshot({ path: `${dir}/${label}-4-in-news-${tag}.png` });
  assert.deepEqual(errors, []);
  console.log("OK news toast fades, closes and stays in News");
} finally {
  await browser.close();
}
