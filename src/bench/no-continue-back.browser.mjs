/* global process, URL, console, document */
// No menu shows Continue or Back (play-menus-no-continue-back, owner Oct 29, third time):
// every rail sheet, every tab inside a sheet, a person card and the news reader open with no
// control that reads Continue or Back. The talk box keeps its own Continue (the narrator's beat).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const found = [];
// Visible controls that read Continue or Back (or start with them), outside the talk box.
const stray = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("button, a, [role=button]")]
      .filter((b) => {
        if (b.closest("#talk, .talk-box, #title, #front")) return false;
        if (b.checkVisibility?.() === false) return false;
        const r = b.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        return /^\s*(continue|back)\s*$/i.test(b.textContent ?? "");
      })
      .map(
        (b) => `${b.id || b.className || b.tagName}: "${b.textContent.trim()}"`,
      ),
  );
const check = async (where) => {
  const bad = await stray();
  console.log(`${where}: ${bad.length ? bad.join("; ") : "none"}`);
  for (const b of bad) found.push(`${where} · ${b}`);
  if (SHOTS)
    await page.screenshot({
      path: `${SHOTS}/${where.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`,
    });
};
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const r = await response;
  assert.equal(r.status(), 200);
  console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const tabs = await page
    .locator("#rings [data-tab]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab));
  for (const tab of tabs) {
    await page
      .locator(`#rings [data-tab="${tab}"]`)
      .first()
      .evaluate((e) => e.click());
    await page.waitForTimeout(1200);
    await check(`sheet ${tab}`);
    const inner = await page
      .locator("#sheet-tabs [data-tab]")
      .evaluateAll((nodes) =>
        nodes.filter((n) => n.checkVisibility()).map((n) => n.dataset.tab),
      );
    for (const sub of inner) {
      await page
        .locator(`#sheet-tabs [data-tab="${sub}"]`)
        .evaluate((e) => e.click());
      await page.waitForTimeout(800);
      await check(`sheet ${tab} · ${sub}`);
    }
  }
  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(found, [], "Continue or Back on a menu");
  console.log("No menu shows Continue or Back.");
} finally {
  await browser.close();
}
