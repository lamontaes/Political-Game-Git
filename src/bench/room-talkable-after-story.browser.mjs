/* global process, console, document, URL */
// After the opening's story scene ends, the people still in the room can be clicked to talk
// (pool: play-room-talkable-after-story). Plays the opening through its last Continue in three
// drawn places, then clicks a housemate. BENCH_SEEDS (comma list) replays worlds; the rest draw.
// Run against a fresh bench: node src/bench/room-talkable-after-story.browser.mjs [shot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const seeds = (process.env.BENCH_SEEDS ?? "").split(",").filter(Boolean);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const errors = [];
try {
  for (let run = 0; run < 3; run += 1) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    if (seeds[run])
      await page.route("**/api/newlife*", (route) => {
        const url = new URL(route.request().url());
        url.searchParams.set("seed", seeds[run]);
        return route.continue({ url: url.toString() });
      });
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    await ready;
    const built = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#new-life").click();
    if (await page.locator("#new-advanced").isVisible())
      await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const seed = new URL((await built).url()).searchParams.get("seed");
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    const place = await page.locator("#card-place").innerText();
    console.log("at load talkable:", await page.locator("#people .talkable").count(), "figures:", await page.locator("#people .figure").count());
    // The opening's story: every Continue, until the talk box closes.
    for (let i = 0; i < 30; i += 1) {
      await page.waitForTimeout(1500);
      console.log("t", i, await page.locator("#people .talkable").count(), await page.locator("#people .figure").count(), await page.locator("#talk-next:visible").count());
      const next = page.locator("#talk-next:visible");
      if (!(await next.count())) break;
      await next.click();
    }
    await page.waitForTimeout(2500);
    if (process.env.DEBUG_SHOT) await page.screenshot({ path: process.env.DEBUG_SHOT });
    console.log("people:", await page.locator("#people .figure").count(), "talk hidden:", await page.locator("#talk").isHidden(), "next:", await page.locator("#talk-next").isVisible());
    const talkable = await page.locator("#people .talkable").count();
    console.log(
      `${place} (seed ${seed}): ${talkable} talkable after the story`,
    );
    assert.ok(talkable > 0, `${place}, seed ${seed}: nobody can be clicked`);
    await page.locator("#people .talkable").first().click();
    await page.locator("#talk").waitFor({ state: "visible" });
    if (shots) await page.screenshot({ path: `${shots}/talk-${run + 1}.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS a housemate can be clicked to talk after the opening story",
  );
} finally {
  await browser.close();
}
