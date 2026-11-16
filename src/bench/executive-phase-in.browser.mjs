/* global process, URL, console, document */
// An executive's phase-in, played (pool item play-draft-card-executive-phase-in-asked-as-zero;
// the owner's ruling of Sept 30, 2026: the sponsor writes "a start date and a phase-in"). The
// mayor of Ridgeville, Alabama, whose bills go through a member, drafts the local sales tax in two
// dated steps on the draft card, asks the member most likely to say yes, and reads the bill the
// member filed under Bills: one section per step, each with its amount and the day it takes effect.
// Pinned: Ridgeville, Alabama (0164656), world seed
// 3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178 (the draw "8341-pin"/"p6" that
// executive-bill-menu.test.ts and executive-phase-in.test.ts name), its mayor. Run against a fresh
// bench: npm run bench, then node src/bench/executive-phase-in.browser.mjs (about a minute; each
// step's limit is two minutes, the world's build ten).
import assert from "node:assert/strict";
import { chromium } from "playwright";

const SEED = "3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178";
const PLACE_KEY = "0164656";
const SUBJECT = "series:sales-tax";
const STEPS = [
  { amount: "6", date: "2025-07-20", said: "July 20, 2025" },
  { amount: "6.5", date: "2026-07-20", said: "July 20, 2026" },
];
const started = Date.now();
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
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", SEED);
    url.searchParams.set("placeKey", PLACE_KEY);
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
  const at = names.findIndex((t) => /\bmayor\b/i.test(t));
  assert.ok(at >= 0, `seed ${SEED}: no mayor to step in as`);
  await page.locator("#pick-list button").nth(at).click();
  await page.locator("#pick-play").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  console.log("Seed:", SEED, "Place:", place, "Player:", names[at]);
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
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Your office" })
    .click();
  await page.locator(".office-board").waitFor();
  await page.locator('.office-board [data-act="write-a-bill"]').first().click();
  await page.locator(`.draft-card .pick[data-value="${SUBJECT}"]`).click();
  await page.locator(".draft-card .draft-add-step").click();
  const amounts = page.locator(".draft-card .draft-step input[type=number]");
  const dates = page.locator(".draft-card .draft-step input[type=date]");
  for (const [i, step] of STEPS.entries()) {
    await amounts.nth(i).fill(step.amount);
    await dates.nth(i).fill(step.date);
  }
  await page
    .locator(".draft-card button", { hasText: /^Draft$/ })
    .first()
    .click();
  // The executive picks who carries it: the member most likely to say yes is first.
  const ask = page.locator('[data-act="ask-member"]').first();
  const member = (await ask.innerText()).split("·")[0].trim();
  await ask.click();
  await page.waitForTimeout(3000);
  const seat = (await page.locator("#sheet-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  assert.ok(
    seat.includes(`${member} agreed to carry your bill`),
    `${member} did not carry the bill: ${seat.slice(-400)}`,
  );
  console.log(`ok: ${member} agreed to carry the bill`);
  // The bill the member filed, as the player reads it under Bills.
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Bills" })
    .click();
  await page
    .locator("#sheet-body button", { hasText: "local sales tax" })
    .first()
    .click();
  await page.waitForTimeout(1500);
  const paper = (await page.locator("#sheet-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  const failed = [];
  if (!paper.includes(`Sponsor ${member}`))
    failed.push(`the bill does not name ${member} as its sponsor`);
  for (const [i, step] of STEPS.entries()) {
    if (!paper.includes(`Section ${i + 1} takes effect on ${step.said}`))
      failed.push(`no Section ${i + 1} taking effect on ${step.said}`);
    if (!paper.includes(`to ${step.amount} percent`))
      failed.push(`no section raising the rate to ${step.amount} percent`);
  }
  if (/to 0 percent/.test(paper)) failed.push("a section sets the rate to 0");
  if (errors.length) failed.push(`the page threw: ${errors.join("; ")}`);
  console.log(`${Math.round((Date.now() - started) / 1000)} s`);
  assert.deepEqual(
    failed,
    [],
    `the bill at ${place}, seed ${SEED}: ${paper.slice(paper.indexOf("Sponsor"), paper.indexOf("Sponsor") + 900)}`,
  );
  console.log(
    `ok: the bill ${member} filed has Section 1 on ${STEPS[0].said} and Section 2 on ${STEPS[1].said}`,
  );
} finally {
  await browser.close();
}
