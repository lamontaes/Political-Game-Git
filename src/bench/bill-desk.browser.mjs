/* global process, URL, console, document, Event */
// The mayor's desk (legislation mocks, Nov 8): dev mode passes a council bill, the bill waits on the mayor's
// desk, and the player reads it, sees where they stand and vetoes it; the paper then names them and the reasons.
// (Adapted from bill-override.browser.mjs.) The older note: the bill at the state legislature (legislation mocks, Nov 8): dev mode introduces a bill in a
// state chamber and passes it at a margin; the Bills tab lists it and its paper shows the result by
// name. (Adapted from bill-stage.browser.mjs, whose head drafts a bill from Your office instead.) The
// old note follows: a member drafts a bill, the dev route holds its
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
      new RegExp(process.env.BENCH_ROLE ?? "^mayor", "i").test(t),
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
  // Control of the chosen character binds when the clock next advances: play one day first.
  if (!(await page.locator("#week").isDisabled())) {
    await page.locator("#week").click();
    for (let i = 0; i < 10; i += 1) {
      await page.waitForTimeout(1200);
      if (await visible("talk-next")) await page.locator("#talk-next").click();
      else if (await visible("continue"))
        await page.locator("#continue").click();
      else break;
    }
  }
  // Dev mode: a council member introduces a bill and the council passes it at a margin; the mayor is the player.
  const result = await page.evaluate(async () => {
    const post = async (path, body) => {
      const r = await fetch(`/api/dev/${path}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { status: r.status, value: await r.json() };
    };
    const bodies = await (await fetch("/api/dev/lawmaking-bodies")).json();
    const laws = await (await fetch("/api/dev/laws")).json();
    const series = laws.series.filter(
      (row) => typeof row.combined === "number" && row.combined > 0,
    );
    const councils = bodies.filter(
      (b) =>
        b.level !== "state" && b.level !== "federal" && b.members.length > 0,
    );
    const tried = [];
    for (let i = 0; i < 24; i += 1) {
      const council = councils[i % councils.length];
      const row = series[i % series.length];
      const intro = await post("introduce", {
        bodyOfficeId: council.id,
        sponsorId: council.members[0].key,
        series: row.series,
        value: Math.round(row.combined * 120) / 100,
        unit: row.levels.find((l) => l.row)?.row.unit,
      });
      if (intro.status !== 200) {
        tried.push(`introduce ${intro.status}`);
        continue;
      }
      const billId = intro.value.mark?.facts?.billId ?? intro.value.billId;
      await post("decide", { billId, margin: 6 });
      const stage = await (
        await fetch(`/api/bill/stage?billId=${encodeURIComponent(billId)}`)
      ).json();
      tried.push(`${council.name} ${stage.status} desk ${stage.desk.waiting}`);
      if (stage.desk.waiting)
        return { billId, number: stage.number, council: council.name, tried };
    }
    return { error: `no bill waited on the mayor's desk: ${tried.join("; ")}` };
  });
  console.log("dev mode:", result);
  assert.ok(
    !result.error,
    `dev mode passed a bill to the desk: ${result.error}`,
  );
  // The desk holds the clock the next morning: the desk panel opens.
  for (let day = 0; day < 6 && !(await visible("desk")); day += 1) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled()))
      await page.locator("#week").click();
    await page.waitForTimeout(1800);
  }
  assert.ok(await visible("desk"), "the mayor's desk opened");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/mayor-desk.png` });
  await page
    .locator("#desk-items")
    .getByRole("button", { name: "Read the bill" })
    .first()
    .click();
  await page
    .getByText("The executive's desk", { exact: true })
    .first()
    .waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/mayor-desk-paper.png` });
  await page.locator(".stage-vote button", { hasText: /^Veto it$/ }).click();
  // Decided: the paper names who vetoed it and the reasons that weighed.
  await page
    .getByText("The executive's desk · Vetoed", { exact: true })
    .waitFor();
  const decided = await page.evaluate(() => {
    const heading = [...document.querySelectorAll(".sechead")].find((n) =>
      n.textContent.startsWith("The executive's desk ·"),
    );
    return heading.parentElement.innerText;
  });
  console.log("decided:", decided);
  assert.match(decided, /By:/, "the paper names who decided");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/mayor-desk-vetoed.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: the mayor read a passed bill at the desk and vetoed it with the reasons on the paper",
  );
} finally {
  await browser.close();
}
