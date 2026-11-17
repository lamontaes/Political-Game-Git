/* global process, console, document, URL */
// The loading bar moves while a new world is built (owner, Nov 16: "It should continue to load.
// This is just poor optimization."; crew list #9747, item 3c). The warm-up ran all its days in one
// block and the history in another, so the bar stood still for ten seconds and more.
// On the bench (npm run bench) at 1440x900: New game, Advanced, a new world in a drawn place. The
// bar's width is read every 200 ms from the press until the build ends; the check fails when the bar
// stands still longer than STILL_MS, and names the step the loading line showed. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/loading-bar-moves.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";

/** How often the bar is read, in milliseconds. Engineering value. */
const SAMPLE_MS = 200;
/** The longest the bar may stand still, in milliseconds: the owner's "every second", plus one read. */
const STILL_MS = 1000 + SAMPLE_MS;
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(300000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.goto(`${base}/play`);
  await title;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  let building = true;
  made.then(() => (building = false));
  // Every read: the time, the bar's width and the loading line.
  const reads = [];
  while (building) {
    reads.push({
      at: Date.now(),
      ...(await page.evaluate(() => ({
        width: document.querySelector("#front .progress > *")?.style.width,
        line: document.getElementById("front-status")?.textContent ?? "",
      }))),
    });
    await page.waitForTimeout(SAMPLE_MS);
  }
  const response = await made;
  assert.equal(response.status(), 200, "the world builds");
  const body = await response.json();
  console.log(
    `LOADING BAR BROWSER: ${body.placeName}, seed ${new URL(response.url()).searchParams.get("seed")}`,
  );
  // The bar's still spells: from the read where its width last changed to the next change.
  const spells = [];
  let since = reads.find((read) => read.width)?.at;
  let width = reads.find((read) => read.width)?.width;
  let line = "";
  for (const read of reads) {
    if (!read.width) continue;
    if (read.width !== width) {
      spells.push({ ms: read.at - since, line, width });
      since = read.at;
      width = read.width;
    }
    line = read.line || line;
  }
  spells.push({ ms: reads.at(-1).at - since, line, width });
  const longest = spells.reduce((a, b) => (b.ms > a.ms ? b : a));
  const build = reads.at(-1).at - reads[0].at;
  console.log(
    `built in ${build} ms; the bar moved ${spells.length - 1} times; longest still ${longest.ms} ms at ${longest.width} ("${longest.line}")`,
  );
  for (const spell of spells.filter((s) => s.ms > STILL_MS))
    console.log(`  still ${spell.ms} ms at ${spell.width}: "${spell.line}"`);
  assert.ok(
    longest.ms <= STILL_MS,
    `the bar stood still ${longest.ms} ms at ${longest.width} ("${longest.line}")`,
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS the loading bar moves every second");
} finally {
  await browser.close();
}
