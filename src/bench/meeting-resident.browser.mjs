/* global process, URL, console, document, fetch */
// A resident at a council or board meeting (pool item
// meetings-resident-player-speaks-at-public-comment): a new life in a drawn place plays on
// until the Calendar offers a posted meeting, marks it there, is stopped at its hour, and on
// the meeting panel finds the agenda with Speak for and Speak against, no vote, and Leave in
// place of Adjourn; speaks for an item, leaves, and the next day finds the body's members on
// People. BENCH_SEED replays a world; SHOTS_DIR saves the screens. BEFORE=<days>,<date>
// only plays that many days and pictures that date's plate (for a picture of main).
// Run against a fresh bench: node src/bench/meeting-resident.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
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
/** One step of play: a talk or a stop is answered, else the day goes on. True when the meeting panel is up. */
async function step() {
  if (await visible("meeting")) return true;
  if (await visible("talk-next")) await page.locator("#talk-next").click();
  else if (await visible("continue")) await page.locator("#continue").click();
  else if (await visible("talk")) {
    const reply = page.locator("#talk-choices .reply").first();
    if (await reply.count()) await reply.click();
    else if (await visible("talk-leave"))
      await page.locator("#talk-leave").click();
  } else if (!(await page.locator("#day").isDisabled()))
    await page.locator("#day").click();
  await page.waitForTimeout(900);
  return visible("meeting");
}
const idle = async () =>
  !(await visible("talk")) &&
  !(await visible("continue")) &&
  !(await visible("meeting")) &&
  !(await page.locator("#day").isDisabled());
/** Open the Calendar on a date's plate. */
async function openDay(date) {
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".calendar-board").waitFor();
  for (let i = 0; i < 3; i += 1) {
    const cell = page.locator(`.month .day[data-date="${date}"]`);
    if (await cell.count()) {
      await cell.click();
      return;
    }
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  }
  throw new Error(`the calendar never showed ${date}`);
}
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
  const life = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const response = await life;
  assert.equal(response.status(), 200);
  const seed = new URL(response.url()).searchParams.get("seed");
  await playOpening(page, (await response.json()).sceneMomentId ?? null);
  await page.waitForFunction(() =>
    document.getElementById("card-name")?.textContent.trim(),
  );
  const me = await page.evaluate(async () => {
    const title = await (await fetch("/api/title")).json();
    return title.life?.personId ?? title.life?.id ?? null;
  });
  assert.ok(me, "the title has no saved life to read the player from");
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
    "Player:",
    await page.locator("#card-name").innerText(),
  );
  const offered = () =>
    page.evaluate(async (id) => {
      const body = await (
        await fetch(`/api/calendar?id=${encodeURIComponent(id)}`)
      ).json();
      return body.items.filter((item) => item.kind === "meeting");
    }, me);

  if (process.env.BEFORE) {
    // The same days on main, and the same date's plate: no way in.
    const [days, date] = process.env.BEFORE.split(",");
    let pressed = 0;
    for (let i = 0; i < 400 && pressed < Number(days); i += 1) {
      if (await idle()) pressed += 1;
      await step();
    }
    for (let i = 0; i < 40 && !(await idle()); i += 1) await step();
    await openDay(date);
    await page.waitForTimeout(600);
    assert.equal(await page.locator(".attend-meeting").count(), 0);
    await shot(page, "before-calendar-meeting-day");
    console.log("Before:", date, "has no way to attend");
  } else {
    let days = 0;
    let spoke = null;
    for (let meetings = 0; meetings < 5 && !spoke; meetings += 1) {
      // Play on until the Calendar offers a posted meeting.
      let open = null;
      for (let i = 0; i < 600 && !open; i += 1) {
        if (await idle()) {
          open = (await offered()).find(
            (item) => item.attend && !item.attend.marked,
          );
          if (open) break;
          days += 1;
        }
        await step();
      }
      assert.ok(open, "no posted meeting was offered on the Calendar");
      await openDay(open.attend.date);
      const control = page.locator(".calendar-day .attend-meeting").first();
      await control.waitFor();
      assert.equal((await control.innerText()).trim(), "Attend");
      console.log(
        `Calendar ${open.attend.date} (after ${days} days): "${open.line}" with "${(await control.innerText()).trim()}"`,
      );
      if (!meetings) await shot(page, "after-1-calendar-attend");
      await control.click();
      const pressed = page.locator(
        '.calendar-day .attend-meeting[aria-pressed="true"]',
      );
      await pressed.waitFor();
      const plan = (
        await page.locator(".calendar-day .attend-plan").first().innerText()
      ).trim();
      assert.match(plan, /\d (a|p)\.m\./, "the plan says the hour");
      assert.equal((await pressed.first().innerText()).trim(), "Not going");
      console.log(`Marked: "${plan}" with "Not going"`);
      if (!meetings) await shot(page, "after-2-calendar-marked");
      await page.locator("#sheet-close").click();
      // On to the meeting's hour.
      let panel = false;
      for (let i = 0; i < 200 && !panel; i += 1) panel = await step();
      assert.ok(panel, "the marked meeting never stopped the clock");
      await page.waitForTimeout(1500);
      const seen = await page.evaluate(() => ({
        title: document.getElementById("meeting-title").textContent.trim(),
        clock: document.getElementById("card-clock").textContent.trim(),
        note:
          document
            .querySelector("#meeting-items .meeting-note")
            ?.textContent.trim() ?? "",
        items: [...document.querySelectorAll("#meeting-items .meeting-item")]
          .length,
        buttons: [...document.querySelectorAll("#meeting button")].map((b) =>
          b.textContent.trim(),
        ),
      }));
      console.log(
        `Panel "${seen.title}" at ${seen.clock}: ${seen.items} items; note "${seen.note}"; buttons ${[...new Set(seen.buttons)].join(", ")}`,
      );
      // A resident speaks and leaves: no vote, no adjournment.
      for (const word of ["Yes", "No", "Abstain", "Decide for me", "Adjourn"])
        assert.ok(
          !seen.buttons.includes(word),
          `a resident is offered ${word}`,
        );
      assert.ok(seen.buttons.includes("Leave"), "no way to leave");
      if (!seen.items) {
        assert.ok(seen.note, "an empty agenda says nothing");
        await shot(page, "after-3-panel-empty-agenda");
      } else {
        assert.ok(seen.buttons.includes("Speak for"));
        assert.ok(seen.buttons.includes("Speak against"));
        await shot(page, "after-4-panel-agenda");
        const first = page.locator("#meeting-items .meeting-item").first();
        const title = (
          await first.locator(".meeting-title").innerText()
        ).trim();
        await first
          .locator(".meeting-acts button", { hasText: /^Speak for$/ })
          .click();
        await page
          .locator("#meeting-items .meeting-item .meeting-remarks")
          .first()
          .waitFor();
        const remarks = (
          await first.locator(".meeting-remarks").allInnerTexts()
        ).join(" | ");
        const name = (await page.locator("#card-name").innerText()).trim();
        assert.ok(
          remarks.includes(name.split(/\s+/).at(-1)),
          `the player is not listed among the speakers: ${remarks}`,
        );
        console.log(`Spoke for "${title}": ${remarks.replace(/\s+/g, " ")}`);
        await shot(page, "after-5-panel-spoke");
        spoke = await page.evaluate(async () => {
          const scene = await (await fetch("/api/meeting")).json();
          return scene.members.map((m) => m.name);
        });
      }
      await page.locator("#meeting-adjourn").click();
      await page.locator("#meeting").waitFor({ state: "hidden" });
    }
    assert.ok(spoke, "five meetings and never an item to speak on");
    // The day closes, the body votes, and the members who heard are people the player knows.
    const today = await page.locator("#card-clock").textContent();
    const talks = new Set();
    for (let i = 0; i < 200; i += 1) {
      // Whatever is told between leaving and the next morning, as played.
      if (await visible("talk"))
        for (const line of await page.locator("#talk-lines li").allInnerTexts())
          talks.add(line.replace(/\s+/g, " ").trim());
      if (
        (await idle()) &&
        (await page.locator("#card-clock").textContent()).split(
          /\d{1,2}:\d/,
        )[0] !== today.split(/\d{1,2}:\d/)[0]
      )
        break;
      await step();
    }
    console.log(
      `Told before the next morning (${talks.size} lines): ${[...talks].join(" / ") || "nothing"}`,
    );
    await page
      .locator('[data-tab="people"]')
      .first()
      .evaluate((e) => e.click());
    await page.waitForTimeout(2500);
    const roster = await page.locator("#sheet-body").innerText();
    const met = spoke.filter((name) => roster.includes(name));
    console.log(
      `People the next day lists ${met.length} of ${spoke.length} members: ${met.join(", ")}`,
    );
    await shot(page, "after-6-people");
    assert.ok(met.length > 0, "no member who heard the player is on People");
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("ok");
} finally {
  await browser.close();
}
