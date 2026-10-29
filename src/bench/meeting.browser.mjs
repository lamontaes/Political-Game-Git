/* global process, URL, console, document, Event */
// The meeting panel (owner, Oct 29: "the UI is terrible"): a member of a body drafts a bill,
// plays on to the meeting, and the panel shows the body's title, every member as a face,
// and after a vote the result with its tally bar and each member's ring by how they voted.
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
  const seed = new URL((await built).url()).searchParams.get("seed");
  await page.locator("#front-pick:not([hidden])").waitFor();
  const names = await page.locator("#pick-list button").allInnerTexts();
  const at = names.findIndex((t) =>
    /council|commissioner|alderm|trustee|supervisor|selectm/i.test(t),
  );
  assert.ok(at >= 0, "no member of a body to step in as");
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
  // Draft the first bill the body has the power to pass.
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1200);
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Your office" })
    .click();
  await page.locator("#sheet-body select").waitFor();
  const picked = await page.evaluate(() => {
    const select = document.querySelector("#sheet-body select");
    const option = [...select.options].find(
      (o) => !/Not a power|preempts|levy no|restricts/i.test(o.textContent),
    );
    if (!option) return null;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return option.textContent;
  });
  assert.ok(picked, "the body has no bill it may draft");
  await page
    .locator("#sheet-body button", { hasText: /^Draft$/ })
    .first()
    .click();
  await page.waitForTimeout(2500);
  await page.locator("#sheet-close").click();
  // On to the meeting.
  let panel = false;
  for (let i = 0; i < 80 && !panel; i += 1) {
    if (await visible("meeting")) panel = true;
    else if (await visible("talk-next"))
      await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (await visible("talk")) {
      const reply = page.locator("#talk-choices .reply").first();
      if (await reply.count()) await reply.click();
      else if (await visible("talk-leave"))
        await page.locator("#talk-leave").click();
    } else if (!(await page.locator("#day").isDisabled()))
      await page.locator("#day").click();
    await page.waitForTimeout(900);
  }
  assert.ok(panel, "no meeting in 80 days");
  await page.waitForTimeout(1500);
  if (SHOTS)
    await page.screenshot({ path: `${SHOTS}/meeting-before-vote.png` });
  const first = page.locator("#meeting-items .meeting-item").first();
  const seen = await page.evaluate(() => ({
    title: document.getElementById("meeting-title").textContent.trim(),
    faces: document.querySelectorAll(
      "#meeting-items .meeting-item:first-child .meeting-member",
    ).length,
  }));
  console.log(`panel "${seen.title}": ${seen.faces} members as faces`);
  assert.ok(seen.title, "the panel has no title");
  assert.ok(seen.faces >= 3, "the members are not drawn on the panel");
  assert.equal(
    await first.locator(".meeting-result").count(),
    0,
    "a result before any vote",
  );
  await first.locator(".meeting-acts button", { hasText: /^Yes$/ }).click();
  await page.waitForTimeout(2500);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/meeting-after-vote.png` });
  const after = await page.evaluate(() => {
    const item = document.querySelector("#meeting-items .meeting-item");
    return {
      result: item.querySelector(".meeting-result")?.textContent.trim() ?? "",
      tally: Boolean(item.querySelector(".meeting-tally span")),
      ringed: item.querySelectorAll(
        ".meeting-member.vote-yes, .meeting-member.vote-no, .meeting-member.vote-abstain",
      ).length,
      members: item.querySelectorAll(".meeting-member").length,
    };
  });
  console.log("after the vote:", after);
  assert.ok(after.result, "no result after the vote");
  assert.ok(after.tally, "no tally bar after the vote");
  assert.equal(
    after.ringed,
    after.members,
    "every member is ringed by their vote",
  );
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: the meeting shows its members, then the tally and the result",
  );
} finally {
  await browser.close();
}
