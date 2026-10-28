/* global process, console, document, getComputedStyle */
// The creator's states and towns in a real browser on the bench (npm run bench):
// the lists page with Back and Continue under them and never scroll, so no
// native scroller shows (owner, Oct 28 sitting, point 6). The state with the
// towns is drawn from the list.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const list = (box, pager) =>
  page.evaluate(
    ([boxId, pagerId]) => {
      const node = document.getElementById(boxId);
      const rows = [...node.querySelectorAll("button")];
      const shown = rows.filter((r) => !r.classList.contains("paged-out"));
      const buttons = [
        ...document.getElementById(pagerId).querySelectorAll("button"),
      ];
      return {
        overflow: getComputedStyle(node).overflowY,
        scrolls: node.scrollHeight > node.clientHeight + 2,
        rows: rows.length,
        shown: shown.length,
        first: shown[0]?.textContent.trim().split("\n")[0] ?? "",
        pager: !document.getElementById(pagerId).hidden,
        next: buttons[1] ? !buttons[1].hidden : false,
      };
    },
    [box, pager],
  );
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-random-name").click();
  await page.locator("#cr-given:not([value=''])").waitFor();
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-place:not([hidden])").waitFor();
  await page.locator("#cr-states button").first().waitFor();
  await page.waitForTimeout(600);
  const states = await list("cr-states", "cr-states-pager");
  console.log(
    `states: ${states.rows} rows, ${states.shown} on the page, first "${states.first}", pager ${states.pager}, overflow ${states.overflow}`,
  );
  assert.notEqual(states.overflow, "auto", "the states list scrolls");
  assert.notEqual(states.overflow, "scroll", "the states list scrolls");
  assert.ok(states.rows > states.shown, "the states fit one page?");
  assert.ok(states.pager && states.next, "no pager under the states");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/06-states-page.png`,
    });
  await page.locator("#cr-states-pager button").last().click();
  const page2 = await list("cr-states", "cr-states-pager");
  console.log(`states page 2: first "${page2.first}"`);
  assert.notEqual(page2.first, states.first, "Continue did not turn the page");
  // The search narrows the list to one page, and the pager goes away.
  await page.locator("#cr-state-search").fill("new");
  await page.waitForTimeout(400);
  const narrowed = await list("cr-states", "cr-states-pager");
  assert.ok(!narrowed.pager, "a pager under a one-page search");
  await page.locator("#cr-state-search").fill("");
  await page.waitForTimeout(400);
  // A drawn state's towns, paged the same way when they overflow.
  const all = page.locator("#cr-states button");
  const at = Math.floor(Math.random() * (await all.count()));
  const stateName = (await all.nth(at).textContent()).trim();
  await page.locator("#cr-state-search").fill(stateName);
  await page.locator(`#cr-states button:not(.paged-out)`).first().click();
  await page.locator("#cr-towns button").first().waitFor();
  await page.waitForTimeout(600);
  const towns = await list("cr-towns", "cr-towns-pager");
  console.log(
    `${stateName}: ${towns.rows} towns, ${towns.shown} on the page, pager ${towns.pager}, overflow ${towns.overflow}`,
  );
  assert.notEqual(towns.overflow, "auto", "the towns list scrolls");
  assert.equal(
    towns.pager,
    towns.rows > towns.shown,
    "the towns' pager does not match their pages",
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/06-towns-page.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the states and towns page, nothing scrolls");
} finally {
  await browser.close();
}
