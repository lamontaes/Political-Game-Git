/* global process, console, document, getComputedStyle */
// The creator's states and towns in a real browser on the bench (npm run bench):
// the lists scroll inside their boxes under the game's own thin scroller, with no
// Back or Continue under them (owner, Oct 28 point 6 and Oct 29). The state with the
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
const list = (box) =>
  page.evaluate((boxId) => {
    const node = document.getElementById(boxId);
    const rows = [...node.querySelectorAll("button")];
    return {
      overflow: getComputedStyle(node).overflowY,
      scrolls: node.scrollHeight > node.clientHeight + 2,
      rows: rows.length,
      first: rows[0]?.textContent.trim().split("\n")[0] ?? "",
      strays: [...document.querySelectorAll("#cr-place button")]
        .filter((b) => /^\s*(continue|back)\s*$/i.test(b.textContent ?? ""))
        .filter((b) => b.id !== "cr-place-back" && b.id !== "cr-place-next")
        .length,
    };
  }, box);
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
  const states = await list("cr-states");
  console.log(
    `states: ${states.rows} rows, first "${states.first}", overflow ${states.overflow}, scrolls ${states.scrolls}`,
  );
  assert.equal(
    states.overflow,
    "auto",
    "the states list scrolls inside itself",
  );
  assert.ok(states.scrolls, "the states fit with nothing to scroll?");
  assert.equal(states.strays, 0, "a Back or Continue under the states");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/06-states-page.png`,
    });
  // Scrolling to the end reaches the last state.
  await page
    .locator("#cr-states")
    .evaluate((node) => node.scrollTo(0, node.scrollHeight));
  const last = await page.locator("#cr-states button").last();
  assert.ok(await last.isVisible(), "the last state is out of reach");
  // The search narrows the list.
  await page.locator("#cr-state-search").fill("new");
  await page.waitForTimeout(400);
  const narrowed = await list("cr-states");
  assert.ok(narrowed.rows < states.rows, "the search did not narrow the list");
  await page.locator("#cr-state-search").fill("");
  await page.waitForTimeout(400);
  // A drawn state's towns, in a box that scrolls the same way.
  const all = page.locator("#cr-states button");
  const at = Math.floor(Math.random() * (await all.count()));
  const stateName = (await all.nth(at).textContent()).trim();
  await page.locator("#cr-state-search").fill(stateName);
  await page.locator("#cr-states button").first().click();
  await page.locator("#cr-towns button").first().waitFor();
  await page.waitForTimeout(600);
  const towns = await list("cr-towns");
  console.log(
    `${stateName}: ${towns.rows} towns, overflow ${towns.overflow}, scrolls ${towns.scrolls}`,
  );
  assert.equal(towns.overflow, "auto", "the towns list scrolls inside itself");
  assert.equal(towns.strays, 0, "a Back or Continue under the towns");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/06-towns-page.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the states and towns scroll inside their boxes");
} finally {
  await browser.close();
}
