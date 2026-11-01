/* global process, console, document, URLSearchParams */
// A held clock always shows what holds it (pool: play-calendar-skip-hides-open-stop). The server
// is made to hold a stop the page has not seen (an advance made behind the page's back), then the
// player skips with the calendar: the page must take the stop back and show Continue, never sit
// with the clock held and nothing to answer. A drawn place by default; BENCH_SEED replays one.
// Run against a fresh bench: node src/bench/skip-open-stop.browser.mjs [shot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const params = new URLSearchParams({
    seed: process.env.BENCH_SEED ?? `skip-${Date.now()}`,
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const made = await page.request.post(`${base}/api/newlife?${params}`, {
    timeout: 600000,
  });
  assert.equal(made.status(), 200, await made.text());
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Place:",
    await page.locator("#card-place").innerText(),
    "Seed:",
    params.get("seed"),
  );
  // Close the opening, so the page is at rest with a free clock.
  for (let i = 0; i < 40; i += 1) {
    const next = page.locator("#talk-next:visible, #continue:visible").first();
    if (!(await next.count())) break;
    await next.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  // Behind the page's back: skip the world forward until the server holds a stop.
  let held;
  for (let i = 0; i < 60 && !held; i += 1) {
    const result = await (
      await page.request.post(`${base}/api/advance?mode=week`, {
        timeout: 600000,
      })
    ).json();
    if (result.packet?.kind === "stop") held = result.packet;
  }
  assert.ok(held, "no stop opened within sixty weeks");
  console.log("The server holds a stop on", held.at.date);
  // The page still shows its old clock and no Continue. The calendar's skip must put it right.
  await page
    .locator('#rings [data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".calendar-layout").waitFor();
  for (let i = 0; i < 3; i += 1)
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.locator(".month .day:not(.past)").last().click();
  await page.locator(".calendar-day .go-to-day").click();
  await page.waitForTimeout(3000);
  const shown = await page.evaluate(() => ({
    continueShown: !document.getElementById("continue").hidden,
    talkShown: !document.getElementById("talk").hidden,
    day: document.getElementById("day").disabled,
  }));
  console.log("after the skip:", shown);
  if (shots) await page.screenshot({ path: `${shots}/after-skip.png` });
  assert.ok(
    shown.continueShown || shown.talkShown,
    "the clock is held and nothing on the page answers it",
  );
  assert.deepEqual(errors, []);
  console.log("PASS a held clock shows what holds it after a calendar skip");
} finally {
  await browser.close();
}
