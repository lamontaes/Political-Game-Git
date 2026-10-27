/* global process, console, document, getComputedStyle */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
// The title painting drifts by itself, and after the rotation interval the
// next national scene fades in over it. BENCH_PORT names the server;
// BENCH_SHOT, a screenshot folder.
const port = process.env.BENCH_PORT ?? "3000";
const shots = process.env.BENCH_SHOT;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/title-${name}.png` }) : undefined;
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${port}/play`);
  const title = await (await ready).json();
  assert.ok(title.scenes.length > 1, "the title offers a rotation");
  console.log(`first scene ${title.place}`);
  await page.waitForFunction(() => {
    const img = document.getElementById("backdrop");
    return img && img.complete && img.naturalWidth > 0;
  });
  // 1. A running animation whose transform changes between two samples.
  const sample = () =>
    page.evaluate(() => {
      const el = document.getElementById("backdrop");
      const running = el.getAnimations().some((a) => a.playState === "running");
      return { running, transform: getComputedStyle(el).transform };
    });
  const one = await sample();
  await shot("a");
  await page.waitForTimeout(2000);
  const two = await sample();
  await shot("b");
  assert.ok(one.running && two.running, "the painting is animating");
  assert.notEqual(one.transform, two.transform, "its transform moves");
  await page.waitForTimeout(2000);
  await shot("c");
  // 2. After the interval a second scene fades in over the first.
  const seconds = title.rotateSeconds;
  const first = await page.evaluate(
    () => document.getElementById("backdrop").src,
  );
  await page.waitForTimeout(seconds * 1000 + 800);
  const mid = await page.evaluate(() => {
    const next = document.getElementById("backdrop-next");
    return {
      src: next.src,
      opacity: Number(getComputedStyle(next).opacity),
    };
  });
  await shot("crossfade");
  assert.ok(
    mid.src.includes(title.scenes[1].backdrop.file),
    "next scene loads",
  );
  assert.ok(mid.opacity > 0 && mid.opacity <= 1, `fading in (${mid.opacity})`);
  await page.waitForTimeout(3500);
  const after = await page.evaluate(() => ({
    back: document.getElementById("backdrop").src,
    next: Number(
      getComputedStyle(document.getElementById("backdrop-next")).opacity,
    ),
  }));
  assert.notEqual(after.back, first, "the first scene faded out");
  assert.ok(after.back.includes(title.scenes[1].backdrop.file));
  assert.equal(after.next, 0);
  assert.deepEqual(errors, []);
  console.log("title motion: ok");
} finally {
  await browser.close();
}
