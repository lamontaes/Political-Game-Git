/* global process, console, document, URL */
// The title and New game start fresh each game (owner, Nov 16: "each game,
// it should start with new ones"), and loading shows the player's state.
// Two visits to the title open on different orders of the monument
// paintings, and New game's faces change with them. Then a life started
// from the creator in a drawn state loads over that state's capitol.
// Run against the bench: node src/bench/title-fresh.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const visit = async () => {
    const reply = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/title",
    );
    await page.goto(`${base}/play`);
    const title = await (await reply).json();
    await page.waitForFunction(
      () => document.getElementById("backdrop").complete,
    );
    return {
      order: title.scenes.map((s) => s.backdrop.file),
      shown: new URL(await page.locator("#backdrop").getAttribute("src"), base)
        .pathname,
      faces: JSON.stringify(title.newGame.advanced.map((f) => f.bust.layers)),
    };
  };
  const one = await visit();
  if (shots) await page.screenshot({ path: `${shots}/title-visit-1.png` });
  const two = await visit();
  if (shots) await page.screenshot({ path: `${shots}/title-visit-2.png` });
  console.log("visit 1 opens on", one.order[0], "visit 2 on", two.order[0]);
  assert.equal(
    new Set(one.order).size,
    one.order.length,
    "a painting shows twice",
  );
  assert.deepEqual([...one.order].sort(), [...two.order].sort());
  assert.notDeepEqual(one.order, two.order, "two visits play the same order");
  assert.equal(one.shown, `/art/backdrops/${one.order[0]}`);
  assert.notEqual(one.faces, two.faces, "New game shows the same faces twice");
  // Loading shows the player's state: a state chosen in the creator.
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  await page.locator("[data-gender=female]").click();
  const states = page.locator("#cr-states .item");
  await states.first().waitFor();
  const count = await states.count();
  const pick = states.nth(Math.floor(Math.random() * count));
  const stateName = (await pick.innerText()).trim();
  await pick.click();
  await page.locator("#cr-towns .item").first().click();
  await page.locator("#cr-given").fill("Test");
  await page.locator("#cr-family").fill("Player");
  const life = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#cr-begin").click();
  // What the window draws: the picture once it has loaded, not the address it was asked for.
  await page.waitForFunction(
    () => {
      const img = document.getElementById("backdrop");
      return (
        img.complete &&
        img.naturalWidth > 0 &&
        img.currentSrc.includes("/state-capitol-")
      );
    },
    null,
    { timeout: 30000 },
  );
  const loading = await page.evaluate(
    () => new URL(document.getElementById("backdrop").currentSrc).pathname,
  );
  console.log(`loading in ${stateName} over ${loading}`);
  if (shots) await page.screenshot({ path: `${shots}/loading.png` });
  assert.match(
    loading,
    /\/state-capitol-/,
    `${stateName}: loading does not show the state`,
  );
  await life;
  assert.deepEqual(errors, []);
  console.log("title fresh: pass");
} finally {
  await browser.close();
}
