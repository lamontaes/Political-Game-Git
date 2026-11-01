/* global process, console, document */
// The Guide is its own entry on the rail, not a tab in Politics, and a term
// on a Politics screen (a leader's post: Speaker, Majority leader) wears the
// carbon-copy underline and shows its guide text on hover (owner, Oct 28
// sitting, point 23). Run against a bench with a life in progress:
//   node src/bench/guide-menu.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }

  // Politics has no Guide tab.
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator("#sheet-tabs button").first().waitFor();
  const tabs = await page.locator("#sheet-tabs button").allInnerTexts();
  console.log(`Politics tabs: ${tabs.join(", ")}`);
  assert.ok(
    !tabs.some((t) => /guide/i.test(t)),
    "Politics still has a Guide tab",
  );

  // A leader's post is underlined and explains itself on hover: a state
  // chamber's leaders, as member cards on Government.
  await page.locator('#sheet-body [data-level="state"]').click();
  await page.locator("#sheet-body .member-card .term").first().waitFor();
  const term = page.locator("#sheet-body .member-card .term").first();
  assert.ok(
    (await term.count()) > 0,
    "no underlined term on a Politics card (a leader's post)",
  );
  const word = (await term.innerText()).trim();
  await term.hover();
  await page.locator("#tip:not([hidden])").waitFor();
  const tip = await page.evaluate(() => ({
    term: document.getElementById("tip-term").textContent.trim(),
    short: document.getElementById("tip-short").textContent.trim(),
  }));
  console.log(`hover ${word}: ${tip.term} — ${tip.short}`);
  assert.equal(
    tip.term.toLowerCase(),
    word.toLowerCase(),
    "the tip names another term",
  );
  assert.ok(tip.short.length > 20, "the tip has no guide text");
  // The headshots load after the rows; the picture waits for them.
  if (process.env.SHOT_DIR) await page.waitForTimeout(1500);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/23-term-hover.png`,
    });

  // The Guide is its own entry on the rail and opens the Guide.
  const ring = page.locator('#rings .ring[data-tab="guide"]');
  assert.equal(await ring.count(), 1, "no Guide entry on the rail");
  assert.equal(await ring.getAttribute("title"), "Guide");
  await ring.click();
  await page.locator("#sheet-body .entry").first().waitFor();
  const heading = (await page.locator("#sheet-title").innerText()).trim();
  const entries = await page.locator("#sheet-body .entry").count();
  console.log(`rail Guide: "${heading}", ${entries} terms`);
  assert.equal(heading, "Guide");
  assert.ok(entries >= 10, "the Guide opened with too few terms");
  assert.equal(
    await page.locator("#sheet-tabs button").count(),
    0,
    "the Guide has tabs",
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/23-guide-menu.png`,
    });

  // Options no longer carries a Guide button: the rail is the one way in.
  await page.locator("#sheet-close").click();
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the Guide is its own menu entry, terms explain themselves");
} finally {
  await browser.close();
}
