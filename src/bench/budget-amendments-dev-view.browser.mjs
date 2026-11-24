/* global process, console, document, fetch, URL */
// With Dev mode on, Politics, Government carries the Budget amendments panel (the arithmetic of the
// room a body has to amend its adopted budget, and each amendment bill's cause), on the bench
// (npm run bench): a new life at Lincolnshire, Kentucky (2146540), played to 2026-02-01, a year and
// more into the town's adopted budget. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/budget-amendments-dev-view.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { devModeOn } from "./dev-setup.mjs";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const day = process.env.RUN_TO ?? "2026-02-01";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(900000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/newlife*", (route) => {
  const url = new URL(route.request().url());
  url.searchParams.set("placeKey", process.env.PLACE_KEY ?? "2146540");
  return route.continue({ url: url.toString() });
});
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  await page.evaluate(async (until) => {
    const date = (await (await fetch("/api/dev/state")).json()).date;
    const days = Math.round((Date.parse(until) - Date.parse(date)) / 864e5);
    await fetch("/api/dev/run-until", {
      method: "POST",
      body: JSON.stringify({ days, cap: days + 1 }),
    });
  }, day);
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.reload();
  await title;
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-clock")?.textContent.trim(),
  );
  await devModeOn(page);
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".dev-budget-amendments").waitFor();
  await page.waitForTimeout(800);
  const text = await page.evaluate(
    () => document.querySelector(".dev-budget-amendments").innerText,
  );
  console.log(text.replace(/\n+/g, " | "));
  assert.match(text, /Room to amend/);
  assert.match(text, /Already amended in this year/);
  assert.match(text, /Receipts (over|under) plan/);
  await page.locator(".dev-budget-amendments").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  if (shots)
    await page.screenshot({ path: `${shots}/budget-amendments-dev.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "PASS dev mode shows a body's amendment room and each bill's cause",
  );
} catch (e) {
  console.error(String(e.stack ?? e).slice(0, 600));
  if (shots)
    await page.screenshot({ path: `${shots}/failed.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
