/* global process, console, document, window */
// The title's monuments, in a real browser on the bench (npm run bench): each
// visit to the title opens on the next frame of the rotation, a monument in
// one of its lights (title.ts). Over a full round of visits every frame
// shows: only the Capitol, the White House and the Lincoln Memorial, never a
// convention or rally, in more than one light, each picture filling the
// window under the menu at 1440x900, 1280x800 and 1024x768. TITLE_SHOTS
// saves one picture per frame and size, named by monument and light.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots = process.env.TITLE_SHOTS;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const frames = new Map();
  let round = Infinity;
  for (let visit = 0; visit < round; visit += 1) {
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`${base}/play`);
    const title = await (await ready).json();
    round = Math.min(round, title.scenes.length);
    const name = `${title.place} ${title.backdrop.variant}`;
    assert.match(
      title.place,
      /^(us-capitol-exterior|white-house-exterior|lincoln-memorial)$/,
      name,
    );
    await page.waitForFunction((url) => {
      const img = document.getElementById("backdrop");
      return (
        img?.complete && img.naturalWidth > 0 && img.currentSrc.endsWith(url)
      );
    }, title.backdrop.url);
    if (frames.has(title.backdrop.file)) continue;
    frames.set(title.backdrop.file, name);
    for (const [width, height] of [
      [1440, 900],
      [1280, 800],
      [1024, 768],
    ]) {
      await page.setViewportSize({ width, height });
      const box = await page.evaluate(() => {
        const r = document.getElementById("backdrop").getBoundingClientRect();
        const menu = document.getElementById("front").getBoundingClientRect();
        return {
          fills:
            r.x <= 0 &&
            r.y <= 0 &&
            r.right >= window.innerWidth &&
            r.bottom >= window.innerHeight,
          menuInside:
            menu.bottom <= window.innerHeight &&
            menu.right <= window.innerWidth,
          scrolls:
            document.documentElement.scrollHeight > window.innerHeight + 1,
        };
      });
      assert.ok(box.fills, `${name} at ${width}x${height}: picture short`);
      assert.ok(box.menuInside, `${name} at ${width}x${height}: menu out`);
      assert.ok(!box.scrolls, `${name} at ${width}x${height}: page scrolls`);
      if (shots)
        await page.screenshot({
          path: `${shots}/title-${title.backdrop.file.replace(".jpg", "")}-${width}.png`,
        });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  console.log("Frames:", [...frames.values()].join(", "));
  const lights = new Set([...frames.values()].map((n) => n.split(" ")[1]));
  assert.ok(lights.size > 2, "the monuments show in fewer than three lights");
  assert.deepEqual(errors, []);
  console.log("PASS the title shows the monuments in their lights");
} finally {
  await browser.close();
}
