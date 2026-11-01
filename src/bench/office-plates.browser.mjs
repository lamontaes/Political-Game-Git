/* global process, URL, console, document */
// Politics → Your office on plates (owner, Oct 29): the seat as fact plates (office, pay, next
// meeting), the draft card on a plate of its own, the budget lines on a plate when the player
// sends a budget, and the sheet body never scrolling. Builds a world with the Advanced start (a
// place drawn from the seed), takes a place that has a body to sit in (a new draw, named, when
// it has none) and steps in as a member. BENCH_SEED replays a world; SHOTS_DIR saves the tabs.
// Run against a fresh bench: node src/bench/office-plates.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const visible = (id) =>
  page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);
try {
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  let seed = "";
  let names = [];
  let at = -1;
  for (let attempt = 1; attempt <= 5 && at < 0; attempt += 1) {
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    await ready;
    await page.locator("#new-life").click();
    const built = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#new-advanced").click();
    await page.locator("#front-advanced:not([hidden])").waitFor();
    await page.locator("#advanced-build").click();
    seed = new URL((await built).url()).searchParams.get("seed");
    await page.locator("#front-pick:not([hidden])").waitFor();
    names = await page.locator("#pick-list button").allInnerTexts();
    at = names.findIndex((t) =>
      new RegExp(
        process.env.PICK ??
          "council|commissioner|alderm|trustee|supervisor|selectm",
        "i",
      ).test(t),
    );
    if (at < 0)
      console.log(
        `unusable draw ${attempt}: seed ${seed}, no member of a body`,
      );
  }
  assert.ok(at >= 0, "no member of a body to step in as in five draws");
  await page.locator("#pick-list button").nth(at).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
    "Player:",
    names[at],
  );
  for (let i = 0; i < 20; i += 1) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1200);
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Your office" })
    .click();
  await page.locator(".office-screen").waitFor();
  const scrolls = () =>
    page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return body.scrollHeight > body.clientHeight + 1;
    });
  // The seat: office, pay and next meeting, each on a plate of its own.
  const seat = await page.locator(".office-body .fact-plate").allInnerTexts();
  console.log(
    "seat plates:",
    seat.map((t) => t.replace(/\n+/g, " ")),
  );
  assert.ok(seat.length >= 2, "the seat shows its office and pay on plates");
  assert.equal(await scrolls(), false, "the seat tab scrolls");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/seat.png` });
  // The draft card, on a plate of its own, for a member of a body.
  const draft = page.locator('.office-tabs [data-office="draft"]');
  if (await draft.count()) {
    await draft.click();
    await page.locator(".draft-card select").waitFor();
    assert.ok(
      await page.locator(".office-body .plate .draft-card").count(),
      "the draft card sits on a plate",
    );
    assert.equal(await scrolls(), false, "the drafts tab scrolls");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/drafts.png` });
  } else console.log("no body to draft in for this seat");
  // The budget lines, when the player sends a budget (an executive's seat).
  const budget = page.locator('.office-tabs [data-office="budget"]');
  if (await budget.count()) {
    await budget.click();
    assert.ok(
      await page.locator(".office-body .plate select").count(),
      "the budget lines sit on a plate",
    );
    assert.equal(await scrolls(), false, "the budget tab scrolls");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/budget.png` });
  }
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: Your office is plates, one tab at a time, and never scrolls",
  );
} finally {
  await browser.close();
}
