/* global process, console, document, URL */
// The filing counter in a real browser, on the bench (npm run bench): a new
// life in a place drawn from all 56, Travel to the first office that takes
// filings, name each office there. The choices must read differently, the
// overlay's rules must read as words from the controls data (never a rule's
// id), the overlay must fit the window and nothing may cover it.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { checkRuleLabels } from "./filing-rule-labels.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-world").click();
  const response = await made;
  console.log("Seed:", new URL(response.url()).searchParams.get("seed"));
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 300000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  // Travel to the first place where filings are taken.
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  const go = page.locator("#sheet-body button", { hasText: /Go/ });
  await go.first().waitFor();
  const controlsResponse = await page.request.get(
    "http://localhost:3000/api/controls",
  );
  assert.ok(controlsResponse.ok(), "the controls data did not load");
  const controls = await controlsResponse.json();
  let opened = false;
  for (let i = 0; i < (await go.count()) && !opened; i++) {
    const label = await go.nth(i).getAttribute("aria-label");
    await go.nth(i).click();
    opened = await page
      .locator("#talk:not([hidden])")
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (opened) console.log("Office:", label);
  }
  assert.ok(opened, "no place in Travel takes filings");
  const choices = await page.locator("#talk-choices button").allInnerTexts();
  console.log("Choices:", choices.join(" | "));
  assert.equal(
    new Set(choices).size,
    choices.length,
    "two choices read the same",
  );
  await page.locator("#talk-choices button").first().click();
  await page.locator("#filing-overlay:not([hidden])").waitFor();
  // The rules read as words, never as a rule's id.
  const labels = await page
    .locator("#filing-checks .row > :first-child")
    .allInnerTexts();
  console.log("Rules:", labels.join(" | "));
  checkRuleLabels(labels, controls);
  // The overlay fits the window, and the news card is not over it.
  const box = await page.locator("#filing-overlay").boundingBox();
  assert.ok(
    box.y >= 0 && box.y + box.height <= 900,
    "the overlay runs off the screen",
  );
  assert.ok(
    !(await page.locator("#news-surface").isVisible()),
    "the news card is showing over the counter",
  );
  await page.screenshot({
    path: "docs/reports/filing-overlay-2026-10-24/overlay.png",
  });
  await page.locator("#talk-leave").click();
  await page
    .locator("#filing-overlay")
    .waitFor({ state: "hidden", timeout: 10000 })
    .catch(() => assert.fail("the overlay stays after leaving"));
  assert.deepEqual(errors, []);
  console.log("PASS the filing counter's choices, rules, fit and news card");
} finally {
  await browser.close();
}
