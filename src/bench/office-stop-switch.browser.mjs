/* global process, URL, URLSearchParams, console, document */
// Your office's stop switches (owner's card, Nov 14, 2026, "Stop me at every vote"): steps in as a
// member of a body, switches "Meetings of your body" Off on Politics, Your office, plays on past a
// meeting day without a meeting holding the clock, and reads the absent row; with it On, a meeting
// holds the clock. BENCH_SEED replays a world; SHOTS_DIR saves screens; BENCH_PORT names the bench.
// Run against a fresh bench: node src/bench/office-stop-switch.browser.mjs
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
    if (await visible("talk-next"))
      await page
        .locator("#talk-next")
        .click({ timeout: 5000 })
        .catch(() => {});
    else if (await visible("continue"))
      await page
        .locator("#continue")
        .click({ timeout: 5000 })
        .catch(() => {});
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  const openOffice = async () => {
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page.waitForTimeout(1200);
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Your office" })
      .click();
    await page.locator(".office-board").waitFor();
  };
  const closeSheet = async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  };
  const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
  /**
   * Play `days` days through the advance route as the Day button does, answering every stop with
   * Continue the way the page does; true when a meeting held the clock on the way.
   */
  const playOn = async (days) => {
    let met = false;
    for (let day = 0; day < days && !met; day += 1) {
      const moved = await (
        await page.request.post(`${base}/api/advance?mode=day`, {
          timeout: 600000,
        })
      ).json();
      let packet = moved.packet;
      for (let guard = 0; packet?.kind === "stop" && guard < 8; guard += 1) {
        const keys = (packet.stop?.modules ?? []).map((m) => m.reasonKey);
        if (keys.includes("office-day.meeting")) {
          met = true;
          break;
        }
        packet = (
          await (
            await page.request.post(
              `${base}/api/resume?${new URLSearchParams({ kind: "stop", pauseId: packet.pauseId })}`,
            )
          ).json()
        ).packet;
      }
      if (packet?.kind === "choice") break;
    }
    await page.reload();
    await page.locator("#front-continue").click();
    await page.waitForTimeout(1500);
    return met;
  };
  await openOffice();
  const strip = page.locator(".office-board section", {
    hasText: "Stop me for",
  });
  await strip.waitFor();
  console.log("stops strip:", (await strip.innerText()).replace(/\n+/g, " | "));
  assert.ok(
    await page
      .locator(
        '[data-testid="office-stop-meetings-on"].active, [data-testid="office-stop-meetings-on"][aria-pressed="true"]',
      )
      .count(),
    "the meetings switch starts On",
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/stops-on.png` });
  // STRIP_ONLY=1 only shows the strip (a seat with a desk has no meeting to wait for).
  if (process.env.STRIP_ONLY) {
    console.log("ok: the strip shows");
    await browser.close();
    process.exit(0);
  }
  // Off: play 70 days; no meeting may hold the clock.
  const off = page.waitForResponse((r) =>
    r.url().includes("/api/office/stops"),
  );
  await page.locator('[data-testid="office-stop-meetings-off"]').click();
  const reply = await (await off).json();
  assert.deepEqual(
    reply.stops.map((s) => [s.key, s.on]),
    [["meetings", false]],
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/stops-off.png` });
  await closeSheet();
  const heldOff = await playOn(75);
  console.log("meeting held the clock while Off:", heldOff);
  assert.equal(heldOff, false, "a meeting held the clock with the switch Off");
  await openOffice();
  const acts = (await page.locator(".office-board").innerText()).replace(
    /\n+/g,
    " | ",
  );
  console.log("Your office after:", acts);
  assert.match(
    acts,
    /Absent: you did not attend/,
    `no absent row after the meetings passed: ${acts.slice(acts.indexOf("What you have done")).slice(0, 500)}`,
  );
  assert.doesNotMatch(acts, /\b(yes|no|abstain)\b ·/, "a raw vote word shows");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/absent-row.png` });
  // On again: the next meeting holds the clock.
  await page.locator('[data-testid="office-stop-meetings-on"]').click();
  await closeSheet();
  const heldOn = await playOn(75);
  console.log("meeting held the clock after On again:", heldOn);
  assert.equal(heldOn, true, "no meeting held the clock with the switch On");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/meeting-held.png` });
  // The meeting the switch held: adjourn it, and the votes read in words, not as raw votes.
  if (!(await visible("meeting")) && (await visible("continue")))
    await page.locator("#continue").click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-reload.png` });
  await page.locator("#meeting:not([hidden])").waitFor();
  await page.locator("#meeting-adjourn").click();
  await page.waitForTimeout(1500);
  await openOffice();
  const after = (await page.locator(".office-board").innerText()).replace(
    /\n+/g,
    " | ",
  );
  const vote = after.match(/VOTE \| [^|]*\|?[^|]*/i)?.[0] ?? "";
  console.log("Vote row after adjourning:", vote);
  assert.match(
    after,
    /(Yes|No|Abstained)( · Cast when you adjourned)?/,
    "the votes read in words",
  );
  const done = after
    .slice(after.indexOf("What you have done"))
    .split(" | Stop me for")[0];
  assert.doesNotMatch(
    done,
    /\b(yes|no|abstain)\b/,
    `a raw vote word shows in: ${done.slice(0, 400)}`,
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/adjourned-row.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the meetings switch holds and frees the clock");
} finally {
  await browser.close();
}
