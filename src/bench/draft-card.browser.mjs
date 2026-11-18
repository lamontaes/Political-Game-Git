/* global process, URL, console, document, crypto */
// The draft card's Draft button (pool item play-draft-card-dark-for-blocked-subjects-and-past-days):
// a member of a body opens Write a bill and the card keeps Draft dark for every bill the engine
// would refuse. Checked as a player presses: a subject the body may not write on stays dark after
// the percent-a-year panel opens and closes; every date field starts at the game's tomorrow; a
// percent a year whose first day is past, or a dated step on a past day or out of order, keeps
// Draft dark with the card's line saying what is missing; days after today, in order, draft the
// bill with no page error.
// Runs at a drawn place and prints it (the faults were first seen at Bear, Delaware, on the Train
// at 29ef4685; no place is pinned).
// BENCH_SEED replays another world. Run against a fresh bench: npm run bench, then
// node src/bench/draft-card.browser.mjs (about four minutes; each step's limit is two minutes,
// the world's build ten).
import assert from "node:assert/strict";
import { chromium } from "playwright";

const SEED = process.env.BENCH_SEED || "";
const started = Date.now();
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
class NoCase extends Error {}
/** One world: false when its draw has no case the check needs, so another place is drawn. */
async function run() {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const visible = (id) =>
    page
      .locator(`#${id}`)
      .isVisible()
      .catch(() => false);
  try {
    // A drawn place by default; BENCH_SEED replays one world to reproduce a red.
    const drawnSeed = SEED || crypto.randomUUID();
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", drawnSeed);
      return route.continue({ url: url.toString() });
    });
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
    await built;
    await page.locator("#front-pick:not([hidden])").waitFor();
    const names = await page.locator("#pick-list button").allInnerTexts();
    const at = names.findIndex((t) =>
      /council|commissioner|alderm|trustee|supervisor|selectm/i.test(t),
    );
    assert.ok(at >= 0, `seed ${drawnSeed}: no member of a body to step in as`);
    await page.locator("#pick-list button").nth(at).click();
    await page.locator("#pick-play").click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    const place = await page.locator("#card-place").innerText();
    console.log("Seed:", drawnSeed, "Place:", place, "Player:", names[at]);
    for (let i = 0; i < 20; i += 1) {
      if (await visible("talk-next")) await page.locator("#talk-next").click();
      else if (await visible("continue"))
        await page.locator("#continue").click();
      else if (!(await page.locator("#week").isDisabled())) break;
      await page.waitForTimeout(800);
    }
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Your office" })
      .click();
    await page.locator(".office-board").waitFor();
    await page
      .locator('.office-board [data-act="write-a-bill"]')
      .first()
      .click();
    await page.locator(".draft-card .pick").first().waitFor();
    const draft = page
      .locator(".draft-card button", { hasText: /^Draft$/ })
      .first();
    const toggle = page.locator(".draft-card .draft-rise-toggle");
    const rise = page.locator(".draft-card .draft-rise");
    const needs = page.locator(".draft-card .draft-rise-needs");
    const subjects = await page
      .locator(".draft-card .pick")
      .evaluateAll((os) =>
        os.map((o) => ({ value: o.dataset.value, blocked: o.dataset.blocked })),
      );
    const pick = async (value) =>
      page.locator(`.draft-card .pick[data-value="${value}"]`).click();

    // 1. A subject the body may not write on, with an amount in force to raise: dark before the
    // percent panel and still dark after it opens and closes.
    let blocked = null;
    for (const s of subjects) {
      if (s.blocked !== "true" || !s.value.startsWith("series:")) continue;
      await pick(s.value);
      if (await toggle.isDisabled()) continue;
      blocked = s.value;
      break;
    }
    if (!blocked)
      throw new NoCase(
        `${place}, seed ${drawnSeed}: no subject the body may not write on has an amount in force`,
      );
    // Each case is checked and every failure listed, so a run on an older card shows all of them.
    const failed = [];
    const expect = (actual, expected, what) => {
      if (actual === expected) return true;
      failed.push(`${what} (got ${actual}, expected ${expected})`);
      return false;
    };
    expect(
      await draft.isDisabled(),
      true,
      `${blocked}: Draft lit before the panel`,
    );
    await toggle.click();
    await toggle.click();
    if (
      expect(
        await draft.isDisabled(),
        true,
        `${blocked}: Draft lit after the percent panel opened and closed`,
      )
    )
      console.log(`ok: ${blocked} stays dark after the percent panel`);

    // 2. A subject the body may write on, with an amount in force: a percent a year.
    let open = null;
    for (const s of subjects) {
      if (s.blocked === "true" || !s.value.startsWith("series:")) continue;
      await pick(s.value);
      if (await toggle.isDisabled()) continue;
      open = s.value;
      break;
    }
    if (!open)
      throw new NoCase(
        `${place}, seed ${drawnSeed}: no subject the body may write on has an amount in force`,
      );
    await toggle.click();
    await rise.locator("input[type=number]").first().fill("10");
    await rise.locator("input[type=number]").nth(1).fill("2");
    const first = rise.locator("input[type=date]");
    const min = await first.getAttribute("min");
    const known = /^\d{4}-\d{2}-\d{2}$/.test(min ?? "");
    expect(known, true, "the first increase's field has no earliest day");
    // With no earliest day on the page the steps below use days far ahead, and today is not tried.
    const tomorrow = known ? min : "2099-01-02";
    const today = known
      ? await page.evaluate((d) => {
          const t = new Date(`${d}T00:00:00Z`);
          t.setUTCDate(t.getUTCDate() - 1);
          return t.toISOString().slice(0, 10);
        }, min)
      : null;
    const dayAfter = (iso, years) =>
      `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;
    if (known)
      console.log(
        `ok: the date fields start at ${min}, the day after the game's ${today}`,
      );
    let darkPast = true;
    for (const past of ["1990-01-02", ...(today ? [today] : [])]) {
      await first.fill(past);
      darkPast =
        expect(
          await draft.isDisabled(),
          true,
          `${open}: Draft lit for a first increase on ${past}`,
        ) && darkPast;
      darkPast =
        expect(
          await needs.isVisible(),
          true,
          `${open}: no line for a first increase on ${past}`,
        ) && darkPast;
    }
    if (darkPast)
      console.log(
        `ok: a first increase on a past day or today keeps Draft dark: "${await needs.innerText()}"`,
      );
    await first.fill(tomorrow);
    expect(
      await draft.isDisabled(),
      false,
      `${open}: Draft dark for a first increase on ${tomorrow}`,
    );

    // 3. Dated steps: each after today and after the step before it.
    await toggle.click();
    await page.locator(".draft-card .draft-add-step").click();
    const steps = page.locator(".draft-card .draft-step input[type=date]");
    assert.equal(await steps.count(), 2, "two steps do not each have a day");
    for (const [n, field] of [steps.nth(0), steps.nth(1)].entries())
      expect(
        await field.getAttribute("min"),
        known ? min : "a day",
        `step ${n + 1}'s day has no earliest day of tomorrow`,
      );
    const amounts = page.locator(".draft-card .draft-step input[type=number]");
    await amounts.nth(0).fill("1");
    await amounts.nth(1).fill("2");
    const cases = [
      ["1990-01-02", dayAfter(tomorrow, 1), "the first step past"],
      [dayAfter(tomorrow, 1), "1990-01-02", "the second step past"],
      [
        dayAfter(tomorrow, 2),
        dayAfter(tomorrow, 1),
        "the second step before the first",
      ],
      [dayAfter(tomorrow, 1), dayAfter(tomorrow, 1), "both steps on one day"],
    ];
    let darkSteps = true;
    for (const [a, b, what] of cases) {
      await steps.nth(0).fill(a);
      await steps.nth(1).fill(b);
      darkSteps =
        expect(
          await draft.isDisabled(),
          true,
          `${open}: Draft lit with ${what}`,
        ) && darkSteps;
      darkSteps =
        expect(
          await needs.isVisible(),
          true,
          `${open}: no line with ${what}`,
        ) && darkSteps;
    }
    if (darkSteps)
      console.log(
        `ok: past or out-of-order steps keep Draft dark: "${await needs.innerText()}"`,
      );
    await steps.nth(0).fill(dayAfter(tomorrow, 1));
    await steps.nth(1).fill(dayAfter(tomorrow, 2));
    expect(
      await draft.isDisabled(),
      false,
      `${open}: Draft dark with steps after today, in order`,
    );
    expect(
      await needs.isVisible(),
      false,
      `${open}: the line stays with steps in order`,
    );
    const drafted = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/seat/act",
    );
    await draft.click();
    const response = await drafted;
    expect(
      response.status(),
      200,
      `the engine refused the bill: ${await response.text()}`,
    );
    expect(errors.length, 0, `the page threw: ${errors.join("; ")}`);
    if (failed.length === 0)
      console.log(
        `ok: steps on ${dayAfter(tomorrow, 1)} and ${dayAfter(tomorrow, 2)} draft the bill`,
      );
    console.log(`${Math.round((Date.now() - started) / 1000)} s`);
    assert.deepEqual(
      failed,
      [],
      `the draft card at ${place}, seed ${drawnSeed}`,
    );
    return true;
  } finally {
    await page.close();
  }
}
let passed = false;
try {
  for (let draw = 1; draw <= 6 && !passed; draw += 1) {
    try {
      passed = await run();
    } catch (error) {
      if (!(error instanceof NoCase) || SEED) throw error;
      console.log(`Passed over: ${error.message}`);
    }
  }
  assert.ok(passed, "six drawn places had no case for the draft card check");
} finally {
  await browser.close();
}
