/* global process, URL, console, document, setTimeout */
// A second quick press of a vote at a meeting acts once and is never a page error
// (play-meeting-second-vote-press-page-error): a member of a local body in a drawn
// place reaches the meeting, presses Yes on the first item twice without waiting,
// and the panel shows one vote of theirs, the result, and no page error. The way
// to the meeting is meeting.browser.mjs's. BENCH_SEED replays; SHOTS_DIR saves it.
// Run against a fresh bench: node src/bench/meeting-double-vote.browser.mjs
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
  // Writing a bill opens from the board: a list of subjects beside the chosen one's page.
  await page.locator('.office-board [data-act="write-a-bill"]').first().click();
  await page.locator(".draft-card .pick").first().waitFor();
  const picked = await page.evaluate(async () => {
    const option = [...document.querySelectorAll(".draft-card .pick")].find(
      (o) => !/Not a power|preempts|levy no|restricts/i.test(o.textContent),
    );
    if (!option) return null;
    option.click();
    await new Promise((done) => setTimeout(done, 100));
    return option.querySelector("b").textContent;
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
  const yes = first.locator(".meeting-acts button", { hasText: /^Yes$/ });
  // Two presses as a quick double-click lands them: the second before the panel redraws.
  await yes.evaluate((button) => {
    button.click();
    button.click();
  });
  await page.waitForTimeout(2500);
  if (SHOTS)
    await page.screenshot({ path: `${SHOTS}/meeting-double-vote.png` });
  const after = await page.evaluate(() => {
    const item = document.querySelector("#meeting-items .meeting-item");
    return {
      result: item.querySelector(".meeting-result")?.textContent.trim() ?? "",
      mine: item.querySelectorAll(
        ".meeting-member.you.vote-yes, .meeting-member.you.vote-no, .meeting-member.you.vote-abstain",
      ).length,
    };
  });
  console.log("after a double press of Yes:", after);
  assert.deepEqual(errors, [], `seed ${seed}: page errors`);
  assert.ok(after.result, `seed ${seed}: no result after the vote`);
  assert.equal(
    after.mine,
    1,
    `seed ${seed}: the player's vote is not shown once`,
  );
  console.log("PASS a double press of Yes votes once, with no page error");
} finally {
  await browser.close();
}
