/* global process, console, document */
// The Politics menu's State level in a real browser on the bench (npm run
// bench) with a life in progress: on the Executive branch a one-seat office
// (the governor) shows no line under its title (owner, Oct 28 sitting, point
// 16; Nov 7: no subtitles on menus) and no party bar with a 1 on it (point 17).
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
// The executive branch's offices as drawn: any line under the chief's room
// name, the chief drawn as the leader block under the room (since the Nov 8
// mock the executive shows its chief as a leader, not a member card) and how
// many party bars the view holds (a one-seat office gets none).
const executiveView = () =>
  page.evaluate(() => ({
    line: [...document.querySelectorAll(".split-screen .chamber-caption > *")]
      .filter((node) => !node.classList.contains("chamber-name"))
      .map((node) => node.textContent.trim())
      .join(" "),
    bars: document.querySelectorAll(".split-screen .seat-numbers").length,
    leaders: [...document.querySelectorAll(".split-screen .leader")].map(
      (node) => node.querySelector(".leader-name")?.textContent.trim() ?? "",
    ),
  }));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  const stateName = title.life.placeName.split(", ").at(-1);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('.government-picker .tab[data-level="state"]').click();
  await page.locator(".split-screen .chamber").waitFor();
  await page
    .locator('.government-branch .tab[data-branch="executive"]')
    .click();
  await page.waitForTimeout(800);
  const seen = await executiveView();
  console.log(
    `State executive: line "${seen.line}", ${seen.bars} bars, leaders ${seen.leaders.join(", ") || "none"}`,
  );
  assert.ok(
    seen.leaders.length > 0 && seen.leaders.every(Boolean),
    "no executive office on the State level",
  );
  assert.equal(
    seen.line,
    "",
    `a line under the governor's room name (${stateName})`,
  );
  assert.equal(seen.bars, 0, "a party bar for one-seat offices");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/16-politics-one-seat.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: no state line under a state office, no bar for one seat");
} finally {
  await browser.close();
}
