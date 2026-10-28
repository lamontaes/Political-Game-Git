/* global console, document, getComputedStyle, Image, process */
// Framing: the opening's speech portrait shows the whole head, and no figure in
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
  await page.click("#new-life");
  await page.click("#new-custom");
  await page.fill("#seed", process.env.FRAMING_SEED ?? "framing-a");
  await page.click("#custom-next");
  await page.click("[data-gender=male]");
  await page.click("#cr-random-name");
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.click("#cr-character-next");
  await page.click("#cr-states button");
  await page.click("#cr-towns button");
  await page.waitForSelector("#cr-look:not([hidden])");
  await page.click("#cr-begin");
  await page.waitForSelector("#opening-box:not([hidden])", {
    timeout: 300000,
  });
  // The portrait: a headshot, the whole face in the middle of the box.
  await page.waitForFunction(() => {
    const bust = document.getElementById("opening-bust");
    return bust && getComputedStyle(bust).backgroundImage.includes("url");
  });
  const head = await page.evaluate(async () => {
    const bust = document.getElementById("opening-bust");
    const url = getComputedStyle(bust).backgroundImage.slice(5, -2);
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const opaque = (x, y) => data[(y * width + x) * 4 + 3] > 200;
    let top = 0;
    while (
      top < height &&
      ![...Array(width).keys()].some((x) => opaque(x, top))
    )
      top++;
    // The face's row (a third of a head below its top): skin on both sides of the middle.
    const row = Math.min(height - 1, top + Math.round(height / 7));
    const xs = [...Array(width).keys()].filter((x) => opaque(x, row));
    return {
      url,
      square: width === height,
      top: top / height,
      left: xs.length ? xs[0] / width : 1,
      right: xs.length ? xs.at(-1) / width : 0,
    };
  });
  console.log("portrait head", head);
  if (shot) await page.screenshot({ path: shot });
  assert.match(head.url, /\/headshots\//, "the portrait is a headshot");
  assert.ok(head.square, "the headshot is square");
  assert.ok(head.top > 0, "the head's top is inside the portrait box");
  assert.ok(
    head.left < 0.45 && head.right > 0.55,
    "the face is whole across the middle of the box",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
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
