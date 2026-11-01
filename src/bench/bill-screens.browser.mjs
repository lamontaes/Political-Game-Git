/* global process, URL, console, document, Event */
// The bill screens (owner, Oct 29: "the layout of all those bill screens needs to be adjusted"):
// a member of a body drafts a law amount on the draft card, which shows what is in force today
// beside the new amount, and reads the bill, whose estimate shows today's amount beside the new one.
// Builds a world with the Advanced start (a place drawn from the seed) and steps in as a
// member of a body. BENCH_SEED replays a world; SHOTS_DIR saves the screens.
// Run against a fresh bench: node src/bench/meeting.browser.mjs
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
  // A place can have no body to step in as (a seat of one executive); take a new draw and name it.
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
      /council|commissioner|alderm|trustee|supervisor|selectm/i.test(t),
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
  // The draft card: the issue, what is in force today and the new amount.
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1200);
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Your office" })
    .click();
  // The drafts are on their own tab of Your office.
  await page.locator('.office-tabs [data-office="draft"]').click();
  await page.locator(".draft-card select").waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/draft-card.png` });
  const chosen = await page.evaluate(() => {
    const select = document.querySelector(".draft-card select");
    const allowed = [...select.options].filter(
      (o) =>
        o.value.startsWith("series:") &&
        !/Not a power|preempts|levy no|restricts/i.test(o.textContent),
    );
    // The sales tax where the body may draft it (the case the merger found), else the first.
    const option =
      allowed.find((o) => /Sales tax rate/i.test(o.textContent)) ?? allowed[0];
    if (!option) return null;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      issue: option.textContent,
      today: document.querySelector(".draft-today").textContent,
      unit: document.querySelector(".draft-unit").textContent,
    };
  });
  assert.ok(chosen, "the body has no law amount it may draft");
  console.log("draft card:", chosen);
  assert.ok(chosen.today, "the draft card shows nothing in force today");
  await page.locator(".draft-card input").fill("2");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/draft-card-filled.png` });
  await page
    .locator(".draft-card button", { hasText: /^Draft$/ })
    .first()
    .click();
  await page.waitForTimeout(2500);
  // The paper: today's amount beside the new one.
  await page
    .locator("#sheet-body button", { hasText: /Read the bill/ })
    .first()
    .click();
  await page.locator(".bill-compare").waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bill-paper.png` });
  const cells = await page.evaluate(() =>
    [...document.querySelectorAll(".bill-compare-cell strong")].map((n) =>
      n.textContent.trim(),
    ),
  );
  console.log("bill paper:", cells);
  assert.equal(cells.length, 2, "today's amount and the new one");
  assert.notEqual(cells[0], cells[1], "the new amount differs from today's");
  // The card and the paper say one thing about what is in force today.
  assert.equal(
    cells[0],
    chosen.today,
    `the draft card says ${chosen.today} today, the paper says ${cells[0]}`,
  );
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: the draft card and the paper show today's amount beside the new one",
  );
} finally {
  await browser.close();
}
