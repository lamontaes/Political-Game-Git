/* global process, URL, console, document, fetch */
// The Campaigns screen's record section (pool item play-campaigns-shows-your-record): a member who has voted and sponsored a bill sees their record where they plan a re-run. Derived from bill-screens.browser.mjs's start.
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
  await page.locator("#pick-play").click();
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
  // Vote on the floor: let the world run past the day the floor takes up a first bill.
  await page.evaluate(async () => {
    for (let i = 0; i < 30; i += 1) {
      const r = await fetch("/api/advance?mode=day", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      const packet = body.packet;
      if (packet && packet.kind !== "complete" && packet.kind !== "choice")
        await fetch(
          `/api/resume?pauseId=${encodeURIComponent(packet.pauseId ?? "")}`,
          { method: "POST" },
        );
    }
  });
  await page.waitForTimeout(1500);
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1200);
  console.log(
    "tabs:",
    await page.locator("#sheet-tabs button").allInnerTexts(),
  );
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Elections" })
    .click();
  await page.waitForTimeout(1200);
  const entries = page.locator(".roster-entry, .roster button, [data-contest]");
  const total = await entries.count();
  let text = "";
  let shown = 0;
  let rowTexts = [];
  for (let at = 0; at < total; at += 1) {
    await entries.nth(at).click();
    await page.waitForTimeout(800);
    const body = await page.locator("#sheet-body").innerText();
    const hasRecord = /Your record in office/.test(body);
    if (hasRecord && !text) {
      text = body;
      rowTexts = await page
        .locator("[data-record-id]")
        .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
      if (SHOTS)
        await page.screenshot({ path: `${SHOTS}/campaigns-record.png` });
    }
    if (hasRecord) shown += 1;
  }
  console.log("elections page:", text.replace(/\s+/g, " ").slice(0, 900));
  console.log(`record shown under ${shown} of ${total} races`);
  assert.ok(
    shown >= 1 && shown < total,
    "the record shows under the player's own races only, not every race",
  );
  assert.match(
    text,
    /Your record in office/,
    "the record section is on Campaigns",
  );
  assert.ok(rowTexts.length > 0, "each record row carries its record id");
  for (const row of rowTexts)
    assert.doesNotMatch(
      row,
      /past-bill:|us-policy-positions|\w+:\w+:\w+/,
      `a record row shows a raw id: ${row}`,
    );
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Campaigns shows the player's record");
} finally {
  await browser.close();
}
