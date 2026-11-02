/* global process, console, document, URL */
// The President's address plays as a montage (owner, Oct 29 02:35 and Nov 1:
// "supposed to start with the president, like in the Oval Office or something,
// and then doing like a montage. But here it's just like I'm just clicking
// continue"): each Continue is the next part of the address with its own
// picture and people: the President at the desk, the town along a route, the
// colonnade, the officials named by office, and home at the end. Run against
// a fresh bench: node src/bench/opening-montage.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    const made = page.waitForResponse((r) => r.url().includes("/api/newlife"));
    await page.locator("#new-life").click();
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    console.log(
      `${width}x${height} seed`,
      new URL((await made).url()).searchParams.get("seed"),
    );
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    console.log("Place:", await page.locator("#card-place").innerText());
    const beats = [];
    for (let i = 0; i < 16; i += 1) {
      await page.waitForTimeout(500);
      await page.waitForFunction(
        () => document.getElementById("backdrop").complete,
      );
      await page.waitForTimeout(1200);
      if (!(await page.locator("#talk:visible").count())) break;
      const state = await page.evaluate(() => ({
        backdrop: document.getElementById("backdrop").src.split("/").at(-1),
        people: document.querySelectorAll("#people .figure").length,
        text: document.getElementById("talk-lines").innerText,
        who: document.getElementById("talk-name").textContent,
      }));
      if (state.text.trim() && state.who.trim()) {
        beats.push(state);
        if (shots)
          await page.screenshot({
            path: `${shots}/beat-${beats.length}-${width}x${height}.png`,
          });
      }
      const next = page.locator("#talk-next:visible");
      if (!(await next.count())) break;
      await next.click();
    }
    for (const [at, beat] of beats.entries())
      console.log(
        `  ${at + 1}. ${beat.backdrop} · ${beat.people} people · ${beat.text.replace(/\n+/g, " / ").slice(0, 110)}`,
      );
    const pictures = new Set(beats.map((beat) => beat.backdrop));
    assert.ok(beats.length >= 3, `the address has only ${beats.length} parts`);
    assert.match(
      beats[0].backdrop,
      /^oval-/,
      "the address does not start at the desk",
    );
    assert.ok(beats[0].people >= 1, "the President is not at the desk");
    assert.ok(
      pictures.size >= 3,
      `only ${pictures.size} pictures: ${[...pictures]}`,
    );
    assert.match(
      beats.at(-1).backdrop,
      /^house-|^apartment-|^trailer-|-living/,
      "the address does not end at home",
    );
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log("opening montage: pass");
} finally {
  await browser.close();
}
