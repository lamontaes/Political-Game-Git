/* global process, URL, console, document, Event */
// The bill stage (legislation mocks, Nov 8): a member drafts a bill, the dev route holds its
// floor vote, and the bill's paper then shows the floor result by name: each chamber's yes and no,
// every name that has a card opening it.
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
  // Open the paper once to learn the bill's id from the request, then hold the vote.
  const asked = page.waitForRequest((r) =>
    r.url().includes("/api/bill?billId="),
  );
  await page
    .locator("#sheet-body button", { hasText: /Read the bill/ })
    .first()
    .click();
  const billId = new URL((await asked).url()).searchParams.get("billId");
  assert.ok(billId, "the paper names its bill");
  await page.locator(".bill-doc").waitFor();
  // An amendment: lower section 1 (the difference split with the law in force), then the body votes it.
  await page
    .locator(".stage-vote button", { hasText: /^Lower section 1$/ })
    .click();
  await page.locator(".stage-strike del").waitFor();
  const struck = await page.locator(".stage-strike del").first().innerText();
  const inserted = await page.locator(".stage-insert ins").first().innerText();
  console.log("amendment:", { struck, inserted });
  assert.notEqual(
    struck,
    inserted,
    "the amendment strikes one clause for another",
  );
  await page.getByRole("button", { name: "Call the vote on it" }).click();
  await page
    .locator("b", { hasText: /^(Adopted|Rejected)$/ })
    .first()
    .waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bill-amendment.png` });
  // The player sits on the body, so they may choose their own vote before the floor: No.
  await page.locator(".stage-vote button", { hasText: /^No$/ }).click();
  await page
    .locator(".stage-vote button.chosen", { hasText: /^No$/ })
    .waitFor();
  const held = await page.evaluate(async (id) => {
    const r = await fetch("/api/dev/hold-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billId: id }),
    });
    return r.status;
  }, billId);
  assert.equal(held, 200, "dev mode holds the floor vote");
  // Back, and open the paper again: the floor now has a result by name.
  await page.locator("#sheet-body button.action").first().click();
  await page.waitForTimeout(800);
  await page
    .locator("#sheet-body button", { hasText: /Read the bill/ })
    .first()
    .click();
  await page.locator(".stage-chamber").first().waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bill-stage.png` });
  const floor = await page.evaluate(() =>
    [...document.querySelectorAll(".stage-chamber")].map((n) => n.innerText),
  );
  console.log("floor result:", floor);
  assert.ok(floor.length > 0, "the floor result is on the paper");
  const mine = await page.evaluate(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  assert.ok(
    floor.some((text) =>
      text
        .split("\n")
        .some((row) => row.startsWith("No:") && row.includes(mine)),
    ),
    `${mine} chose No and is on the floor result`,
  );
  assert.ok(
    floor.every((text) => /\d/.test(text) && text.length > 10),
    "each chamber names its counts and members",
  );
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the paper shows the floor result by name");
} finally {
  await browser.close();
}
