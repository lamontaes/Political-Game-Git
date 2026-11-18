/* global process, console, document, URL */
// A bill's Compare never strikes a sentence and adds the same one back
// (play-bill-compare-strikes-and-adds-the-same-sentence): a council member in a
// drawn place lets two weeks run so bills are filed, then opens each bill in
// Politics, Bills and presses Compare. Every struck sentence (the law in force
// today) differs from the sentence the bill adds; a section with no rule in
// force strikes nothing. BENCH_SEED replays; SHOTS_DIR saves the first Compare.
// Run against a fresh bench: node src/bench/bill-compare-differs.browser.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { finishTalk } from "./start-life.mjs";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const seed = process.env.BENCH_SEED ?? randomUUID();
const SHOTS = process.env.SHOTS_DIR;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", seed);
    return route.continue({ url: url.toString() });
  });
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  const built = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-advanced").click();
  await page.locator("#front-advanced:not([hidden])").waitFor();
  await page.locator("#advanced-build").click();
  await built;
  await page.locator("#front-pick:not([hidden])").waitFor();
  const names = await page.locator("#pick-list button").allInnerTexts();
  const at = names.findIndex((t) =>
    /council|alder|selectm|trustee|supervisor|commission/i.test(t),
  );
  assert.ok(at >= 0, `seed ${seed}: no local body member to step in as`);
  await page.locator("#pick-list button").nth(at).click();
  await page.locator("#pick-play").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await finishTalk(page);
  const place = await page.locator("#card-place").innerText();
  console.log("Place:", place, "seed", seed);
  // Two weeks, so the bodies have filed their bills (dev mode's run-until).
  const ran = await page.request.post(`${base}/api/dev/run-until`, {
    data: { days: 14, cap: 14 },
    timeout: 1800000,
  });
  assert.equal(ran.status(), 200, await ran.text());
  await page.reload();
  await page
    .locator("#front-continue")
    .click()
    .catch(() => {});
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await finishTalk(page);
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-tabs").waitFor();
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: /^Bills$/ })
    .click();
  await page.waitForTimeout(1200);
  const rows = page.locator("#sheet-body .roster-row");
  const count = await rows.count();
  assert.ok(count > 0, `${place} (seed ${seed}): Bills lists no bill`);
  let read = 0;
  let struckSeen = 0;
  for (let i = 0; i < count; i += 1) {
    await rows.nth(i).click();
    await page.locator(".bill-doc").waitFor();
    const compare = page
      .locator("#sheet-body")
      .getByRole("button", { name: /^Compare$/ });
    if (!(await compare.count())) continue;
    await compare.first().click();
    await page.waitForTimeout(500);
    const sections = await page.evaluate(() =>
      [...document.querySelectorAll(".bill-doc u")].map((added) => {
        const struck = added.previousElementSibling;
        return {
          added: added.textContent.trim(),
          struck: struck?.tagName === "S" ? struck.textContent.trim() : null,
        };
      }),
    );
    if (!sections.length) continue;
    const title = await page
      .locator(".bill-doc h2, .bill-doc h3")
      .first()
      .innerText();
    if (SHOTS && sections.some((s) => s.struck === s.added))
      await page.screenshot({ path: `${SHOTS}/compare-same.png` });
    for (const s of sections) {
      if (s.struck) struckSeen += 1;
      assert.notEqual(
        s.struck,
        s.added,
        `${place} (seed ${seed}), ${title}: Compare strikes and adds "${s.added}"`,
      );
    }
    if (SHOTS && read === 0)
      await page.screenshot({ path: `${SHOTS}/compare.png` });
    console.log(
      `${title}: ${sections.length} sections, ${sections.filter((s) => s.struck).length} struck, none the same as added`,
    );
    read += 1;
  }
  assert.ok(
    read > 0,
    `${place} (seed ${seed}): no bill with sections to compare`,
  );
  assert.deepEqual(errors, [], "page errors");
  console.log(
    `PASS ${read} bills compared in ${place} (seed ${seed}), ${struckSeen} sections struck, each different from what it adds`,
  );
} finally {
  await browser.close();
}
