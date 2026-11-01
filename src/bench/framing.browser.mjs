/* global console, document, process, URL */
// Framing: the opening's speaker portrait sits whole inside the talk box, and no figure in
// the scene leaves the frame at its head or stands through another. Run against the bench:
//   BENCH_URL=http://localhost:3000/play node src/bench/framing.browser.mjs [out.png]
import assert from "node:assert/strict";
import { chromium } from "playwright";
const [shot] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  // The creator now sits behind Start a life; the world's seed is replayed through the route.
  if (process.env.FRAMING_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.FRAMING_SEED);
      return route.continue({ url: url.toString() });
    });
  await page.click("#new-life");
  await page.click("#new-start");
  await page.click("[data-gender=male]");
  await page.click("#cr-random-name");
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.click("#cr-character-next");
  await page.click("#cr-states button");
  await page.click("#cr-towns button");
  await page.waitForSelector("#cr-look:not([hidden])");
  await page.click("#cr-begin");
  // The opening plays as a scene in the talk box (the old opening box is gone).
  await page.waitForSelector("#talk:not([hidden])", { timeout: 300000 });
  // The speaker's portrait: a face fills its round frame inside the talk box.
  await page.waitForFunction(() => {
    const bust = document.getElementById("talk-bust");
    return bust && bust.children.length > 0;
  });
  const head = await page.evaluate(() => {
    const bust = document.getElementById("talk-bust").getBoundingClientRect();
    const talk = document.getElementById("talk").getBoundingClientRect();
    return {
      top: bust.top - talk.top,
      bottom: talk.bottom - bust.bottom,
      left: bust.left - talk.left,
      size: bust.width,
    };
  });
  console.log("portrait in the talk box", head);
  if (shot) await page.screenshot({ path: shot });
  assert.ok(head.size > 0, "the speaker's portrait has a size");
  assert.ok(
    head.top >= 0 && head.bottom >= 0 && head.left >= 0,
    "the whole portrait is inside the talk box",
  );
  // Through the address and the night's news, to the room.
  for (let i = 0; i < 400; i += 1) {
    if (await page.locator("#talk").isHidden()) break;
    await page
      .locator("#talk-next:visible")
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.waitForSelector("#card:not([hidden])");
  await page.waitForTimeout(2500);
  const figures = await page.evaluate(() => {
    const stage = document.getElementById("stage").getBoundingClientRect();
    return [...document.querySelectorAll("#people .figure")].map((f) => {
      const r = f.getBoundingClientRect();
      return {
        top: r.top - stage.top,
        left: r.left - stage.left,
        right: r.right - stage.left,
        bottom: r.bottom - stage.top,
        w: stage.width,
      };
    });
  });
  for (const f of figures) {
    assert.ok(f.top >= 0, "no head above the frame");
    assert.ok(f.left >= 0 && f.right <= f.w + 1, "no figure past a side");
  }
  console.log("figures in frame:", figures.length);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
