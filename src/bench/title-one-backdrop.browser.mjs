/* global process, console, document, MutationObserver */
// One picture at a time, in a real browser on the bench (npm run bench): the
// title's rotation stops while a creator panel is open, and the opening loads
// its backdrop once, not the room and then the chamber (owner, Oct 28 sitting,
// point 2: "it fades into a background and then fades again, as if two
// pictures load"). Draws a state and town from the creator's own lists.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(240000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  // Every change of the painting from here on is counted.
  await page.evaluate(() => {
    const back = document.getElementById("backdrop");
    document.body.dataset.backdropLoads = "0";
    document.body.dataset.backdropFades = "0";
    new MutationObserver(() => {
      document.body.dataset.backdropLoads = String(
        Number(document.body.dataset.backdropLoads) + 1,
      );
    }).observe(back, { attributes: true, attributeFilter: ["src"] });
    new MutationObserver(() => {
      if (document.getElementById("backdrop-next").classList.contains("fading"))
        document.body.dataset.backdropFades = String(
          Number(document.body.dataset.backdropFades) + 1,
        );
    }).observe(document.getElementById("backdrop-next"), {
      attributes: true,
      attributeFilter: ["class"],
    });
  });
  const seconds = title.rotateSeconds ?? 20;
  await page.waitForTimeout((seconds + 5) * 1000);
  const onCreator = await page.evaluate(() => ({
    loads: Number(document.body.dataset.backdropLoads),
    fades: Number(document.body.dataset.backdropFades),
  }));
  console.log(
    `creator open ${seconds + 5}s: ${onCreator.loads} backdrop loads, ${onCreator.fades} fades`,
  );
  assert.equal(onCreator.loads, 0, "the painting changed under the creator");
  assert.equal(onCreator.fades, 0, "a scene faded in under the creator");
  // On through the creator with the drawn place.
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-random-name").click();
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-place:not([hidden])").waitFor();
  const states = page.locator("#cr-states button");
  await states.first().waitFor();
  const stateCount = await states.count();
  const stateAt = Math.floor(Math.random() * stateCount);
  const stateName = await states.nth(stateAt).innerText();
  await states.nth(stateAt).click();
  const towns = page.locator("#cr-towns button");
  await towns.first().waitFor();
  const townAt = Math.floor(Math.random() * (await towns.count()));
  const townName = (await towns.nth(townAt).innerText()).split("\n")[0];
  await towns.nth(townAt).click();
  await page.locator("#cr-look:not([hidden])").waitFor();
  await page.locator("#cr-begin").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.locator("#talk:not([hidden])").waitFor();
  await page.waitForTimeout(3000);
  const opened = await page.evaluate(() => ({
    loads: Number(document.body.dataset.backdropLoads),
    src: document.getElementById("backdrop").getAttribute("src"),
  }));
  console.log(
    `${townName}, ${stateName}: opening loaded ${opened.loads} backdrop(s): ${opened.src}`,
  );
  assert.equal(opened.loads, 1, "the opening loaded more than one backdrop");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/02-opening-one-backdrop.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: one backdrop on the creator and one in the opening");
} finally {
  await browser.close();
}
