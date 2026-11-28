/* global process, console, document */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
// The title's rotation reaches the Lincoln Memorial at night, and the picture
// fills the window. Each load of the
// page is one visit to the title, so the check loads it until the rotation
// comes round. BENCH_PORT names the server; BENCH_SHOT, a screenshot folder.
const port = process.env.BENCH_PORT ?? "3000";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  let found = false;
  const seen = [];
  for (let visit = 0; visit < 20 && !found; visit++) {
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${port}/play`);
    const title = await (await ready).json();
    seen.push(title.place);
    if (process.env.BENCH_SHOT_ANY) {
      mkdirSync(process.env.BENCH_SHOT_ANY, { recursive: true });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `${process.env.BENCH_SHOT_ANY}/title-${title.place}.png`,
      });
      if (title.place !== "lincoln-memorial") break;
    }
    if (title.place !== "lincoln-memorial") continue;
    found = true;
    assert.equal(title.backdrop.file, "lincoln-memorial__night.jpg");
    await page.waitForFunction(() => {
      const img = document.getElementById("backdrop");
      return img && img.complete && img.naturalWidth > 0;
    });
    const box = await page.evaluate(() => {
      const img = document.getElementById("backdrop");
      const r = img.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        src: img.currentSrc,
        menu: !document.getElementById("front").hidden,
      };
    });
    assert.ok(box.src.endsWith("/art/backdrops/lincoln-memorial__night.jpg"));
    assert.ok(box.menu, "the title menu shows over the picture");
    assert.ok(
      box.x <= 0 && box.y <= 0 && box.w >= 1440 && box.h >= 900,
      `the picture fills the window: ${JSON.stringify(box)}`,
    );
    if (process.env.BENCH_SHOT) {
      mkdirSync(process.env.BENCH_SHOT, { recursive: true });
      await page.screenshot({
        path: `${process.env.BENCH_SHOT}/title-lincoln-night.png`,
      });
    }
    console.log(`Lincoln Memorial at night on visit ${visit + 1}`, box);
  }
  if (!process.env.BENCH_SHOT_ANY)
    assert.ok(found, `no Lincoln Memorial in 20 visits: ${seen.join(", ")}`);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
