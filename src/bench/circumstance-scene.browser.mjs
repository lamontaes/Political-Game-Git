/* global process, console, document, URL */
// Scenes from circumstance reach the screen (owner, Oct 27): in a new world,
// played week by week, the first scene the director stages from someone
// else's record (a story a household member read, the national news, a
// death in town) opens in the talk box with the person cast standing in it.
// A drawn place (New world).
// Run against a fresh bench: node src/bench/circumstance-scene.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const WEEKS = Number(process.env.CIRCUMSTANCE_WEEKS ?? 30);
// The causes a scene from circumstance cites (src/director/data/circumstances.json).
const CAUSES =
  /(?:news\.read:|meeting-held:|life\.death:|case:lobby:|office\.introduced:|person\.moved-away:|cause\.donated:|initiative\.organizing-started:|law\.effect-learned:)/;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const stories = [];
page.on("response", async (response) => {
  const url = new URL(response.url());
  if (url.pathname !== "/api/story") return;
  try {
    stories.push({
      momentId: url.searchParams.get("momentId") ?? "",
      body: await response.json(),
    });
  } catch {
    // A story the page did not finish reading.
  }
});
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  let found = null;
  for (let week = 0; week < WEEKS && !found; week++) {
    const before = stories.length;
    await page.locator("#week").click();
    // The week runs until it is done or a scene opens.
    await page.waitForFunction(
      () =>
        !document.getElementById("week").disabled ||
        !document.getElementById("talk").hidden,
      undefined,
      { timeout: 300000 },
    );
    // Leave any scene that is not one from circumstance, as a player would.
    const fresh = stories.slice(before);
    found = fresh.find((row) => CAUSES.test(row.momentId)) ?? null;
    if (found) break;
    if (await page.locator("#talk:not([hidden])").isVisible()) {
      if (shots)
        await page.screenshot({ path: `${shots}/week-${week}-scene.png` });
      // Played to its end: the first reply each time, then Continue or Leave.
      for (let beat = 0; beat < 20; beat++) {
        if (!(await page.locator("#talk:not([hidden])").isVisible())) break;
        const next = page
          .locator(
            "#talk-choices .reply, #talk-next:not([hidden]), #talk-leave:not([hidden])",
          )
          .first();
        if (!(await next.isVisible())) break;
        await next.click();
        await page.waitForTimeout(800);
      }
    }
  }
  assert.ok(found, `no scene from circumstance in ${WEEKS} weeks`);
  await page.locator("#talk:not([hidden])").waitFor();
  const read = await page.evaluate(() => ({
    date: document.getElementById("card-date")?.textContent?.trim() ?? "",
    talk: document.getElementById("talk").innerText,
    people: [...document.querySelectorAll("#people .talkable")].map((node) =>
      node.textContent.trim(),
    ),
  }));
  console.log("Scene:", found.momentId);
  console.log(JSON.stringify(read));
  assert.ok(read.talk.trim(), "the talk box is empty");
  assert.doesNotMatch(read.talk, /\b(?:person_|news\.read|jurisdiction_)/);
  assert.doesNotMatch(read.talk, /\d{4}-\d{2}-\d{2}/);
  if (shots) await page.screenshot({ path: `${shots}/circumstance-scene.png` });
  // The narrator first, then one Continue, then the person cast speaks (owner,
  // Oct 28 sitting, 36), with no Talk step; what they say comes from the record.
  assert.doesNotMatch(read.talk, /Talk ·/);
  const said = await page.locator("#talk").innerText();
  console.log("Talk:", JSON.stringify(said));
  assert.doesNotMatch(said, /\b(?:person_|news\.read|jurisdiction_)/);
  assert.deepEqual(errors, []);
  console.log("OK");
} finally {
  await browser.close();
}
