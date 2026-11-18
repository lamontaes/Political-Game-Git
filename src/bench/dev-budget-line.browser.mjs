/* global process, console, document, fetch, crypto, URLSearchParams */
// Dev mode's Budget bill panel (src/bench/dev-views/budget-line.ts): on Politics, Government with
// Dev mode on, pick a lawmaking body, one spending line of its government's budget in force and a
// change a year, press Introduce budget bill, and a bill is filed through dev mode's own
// `introduce` (line, deltaMinor); its paper then names the line. A place drawn from all 56
// (BUDGET_SEED replays one); BENCH_PORT picks the server; SHOTS_DIR saves the panel. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node --import tsx src/bench/dev-budget-line.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { drawPlace } from "../../scripts/core2-year/place.ts";
import { devModeOn } from "./dev-setup.mjs";

const runSeed = process.env.BUDGET_SEED ?? crypto.randomUUID();
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots = process.env.SHOTS_DIR;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const place = drawPlace(runSeed, "budget-line");
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Sponsor",
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed: place.seed, placeKey: place.key, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200);
  console.log(
    `Place: ${place.name} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  );
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name")?.textContent.trim(),
  );
  await devModeOn(page);
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  const panel = page.locator(".dev-budget-line");
  await panel.waitFor();
  const lines = panel.locator("select").nth(1).locator("option");
  assert.ok(await lines.count(), "the panel lists a spending line to change");
  const chosen = await lines.first().getAttribute("value");
  await panel.locator("select").nth(1).selectOption(chosen);
  await panel.locator("input").fill("250000");
  await panel.scrollIntoViewIfNeeded();
  if (shots)
    await page.screenshot({ path: `${shots}/dev-budget-line-before.png` });
  await panel.getByTestId("dev-budget-introduce").click();
  await page.waitForFunction(
    () =>
      /\S+ · \S+ · \S+/.test(
        document.querySelector(".dev-budget-line")?.innerText ?? "",
      ),
    undefined,
    { timeout: 120000 },
  );
  const text = await panel.innerText();
  console.log(text.replace(/\n+/g, " | "));
  const billId = text.match(/\S+ · \S+ · (\S+)\s*$/m)?.[1];
  assert.ok(billId, "the panel shows the filed bill's id");
  const paper = await page.evaluate(async (id) => {
    const r = await fetch(`/api/bill?${new URLSearchParams({ billId: id })}`);
    return { ok: r.ok, body: await r.text() };
  }, billId);
  assert.ok(paper.ok, "the filed bill has a paper");
  assert.ok(
    JSON.parse(paper.body).sections.some(
      (s) => s.key === `budget-line:${chosen}`,
    ),
    `the bill's paper has a section for the ${chosen} line`,
  );
  console.log("PAPER:", paper.body.slice(0, 400));
  if (shots)
    await page.screenshot({ path: `${shots}/dev-budget-line-after.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log(`PASS a budget bill on ${chosen} was introduced from the panel`);
} catch (e) {
  console.error(String(e.stack ?? e).slice(0, 800));
  if (shots)
    await page.screenshot({ path: `${shots}/failed.png` }).catch(() => {});
  throw e;
} finally {
  await browser.close();
}
