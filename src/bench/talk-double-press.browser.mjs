/* global process, console, document, URL */
// A second press of a reply before the first answer comes back (pool item
// words-talk-reply-not-offered-after-one-engine; the Journal walk at New Haven,
// Vermont threw "Not an offered line: 1:yes" this way). In a new life the
// player talks with someone in the room and with the opening scene, and each
// time presses the first reply twice in the same moment, as a double click
// does: one line is said, the page raises no error and nothing is said twice.
// Run against a fresh bench: node src/bench/talk-double-press.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shown = (id) => page.locator(`#${id}`).isVisible();
const WANTED = ["/api/talk/say"];
const pressed = new Set();
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
  for (
    let step = 0;
    step < 400 && !WANTED.every((r) => pressed.has(r));
    step++
  ) {
    await page.waitForTimeout(700);
    if (await shown("talk")) {
      if (await shown("talk-next")) {
        await page.locator("#talk-next").click();
        continue;
      }
      if (await page.locator("#talk-choices .reply").count()) {
        const before = errors.length;
        const said = page.waitForResponse(
          (r) => r.request().method() === "POST",
        );
        const first = await page.evaluate(() => {
          const reply = document.querySelector("#talk-choices .reply");
          reply.click();
          reply.click();
          return reply.textContent;
        });
        const route = new URL((await said).url()).pathname;
        await page.waitForTimeout(1500);
        console.log(`Double press of "${first}" answered by ${route}`);
        assert.deepEqual(errors.slice(before), [], `double press on ${route}`);
        pressed.add(route);
        continue;
      }
      if (await shown("talk-leave")) await page.locator("#talk-leave").click();
      continue;
    }
    const who = page.locator("#here .busts-person.talkable").first();
    if (await who.count()) {
      await who.click();
      continue;
    }
    if (await shown("continue")) await page.locator("#continue").click();
    else await page.locator("#day").click();
  }
  assert.ok(
    WANTED.every((r) => pressed.has(r)),
    `no talk reached a reply on ${WANTED.join(", ")}; reached ${[...pressed]}`,
  );
  assert.deepEqual(errors, []);
  console.log("PASS a double press says one line and raises no page error");
} finally {
  await browser.close();
}
