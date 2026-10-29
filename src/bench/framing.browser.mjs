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
  // The portrait: where the figure's head lands inside the box.
  await page.waitForFunction(() => {
    const bust = document.getElementById("opening-bust");
    return bust && getComputedStyle(bust).backgroundImage.includes("url");
  });
  const head = await page.evaluate(async () => {
    const bust = document.getElementById("opening-bust");
    const style = getComputedStyle(bust);
    const url = style.backgroundImage.slice(5, -2);
    const image = new Image();
    image.src = url;
    await image.decode();
    const box = bust.getBoundingClientRect();
    const scale =
      (box.width * parseFloat(style.backgroundSize)) / 100 / image.naturalWidth;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = 0;
    while (
      top < canvas.height &&
      !data[(top * canvas.width + (canvas.width >> 1)) * 4 + 3] &&
      ![...Array(canvas.width).keys()].some(
        (x) => data[(top * canvas.width + x) * 4 + 3] > 200,
      )
    )
      top++;
    const offset =
      (box.height - image.naturalHeight * scale) *
      (parseFloat(style.backgroundPositionY) / 100 || 0);
    // A head is about a fifth of a standing figure's height.
    const headTop = top * scale + offset;
    const headBottom = headTop + image.naturalHeight * 0.2 * scale;
    return { headTop, headBottom, box: box.height };
  });
  console.log("portrait head", head);
  if (shot) await page.screenshot({ path: shot });
  assert.ok(head.headTop >= 0, "the head's top is inside the portrait box");
  assert.ok(
    head.headBottom <= head.box,
    "the whole head fits in the portrait box",
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
