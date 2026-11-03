/* global process, console, URLSearchParams, document */
// A person is clickable only while the director has something new to say to
// them (owner, Nov 1: "If there's no dialogue, you shouldn't be able to click
// on the person"): on the opening night the housemate is clickable, every
// topic is talked over once, and then the figure has no click state and a
// click does nothing. Run against a fresh bench:
// node src/bench/talk-clickable.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/play`);
  const seed = (await (await page.request.get(`${base}/api/seed`)).json()).seed;
  const person = JSON.stringify({
    givenName: "Alex",
    familyName: "Reyes",
    gender: "female",
    birthYear: 2007,
    birthMonth: 3,
    birthDay: 14,
  });
  await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date: "2025-01-20", person })}`,
    { timeout: 300000 },
  );
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const talkable = () => page.locator("#people .figure.talkable");
  // A world where nobody in the room has anything to say at the start (the
  // player lives alone, or the household has nothing new) is quiet from the
  // start: no figure is clickable and a click opens nothing.
  const quietFromStart = !(await talkable().count());
  if (quietFromStart)
    console.log("Nobody in the room has anything to say at the start.");
  let talks = 0;
  for (let step = 0; step < 60; step += 1) {
    if (await page.locator("#talk:visible").count()) {
      const reply = page.locator("#talk-choices .reply:visible").first();
      if (await reply.count()) await reply.click();
      else if (await page.locator("#talk-next:visible").count())
        await page.locator("#talk-next").click();
      else if (await page.locator("#talk-leave:visible").count())
        await page.locator("#talk-leave").click();
      await page.waitForTimeout(500);
      continue;
    }
    const open = talkable().first();
    if (!(await open.count())) break;
    if (shots && !talks)
      await page.screenshot({
        path: `${shots}/before-first-talk-1440x900.png`,
      });
    await open.click();
    talks += 1;
    await page.waitForTimeout(600);
  }
  assert.ok(quietFromStart || talks > 0, "the person was talked to");
  assert.equal(
    await talkable().count(),
    0,
    "no one is clickable once there is nothing new",
  );
  // A click on a figure with nothing to say does nothing.
  const figures = page.locator("#people .figure");
  for (let i = 0; i < (await figures.count()); i += 1) {
    await figures.nth(i).hover({ force: true });
    await figures.nth(i).click({ force: true });
  }
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator("#talk:visible").count(),
    0,
    "a click opened a talk",
  );
  if (shots)
    await page.screenshot({
      path: `${shots}/after-talks-hovering-1440x900.png`,
    });
  assert.deepEqual(errors, []);
  console.log(`talk clickable: pass (${talks} talks, then quiet)`);
} finally {
  await browser.close();
}
