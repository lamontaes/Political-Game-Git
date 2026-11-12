/* global process, URL, console, document, fetch */
// The bill at the state legislature (legislation mocks, Nov 8): dev mode introduces a bill in a
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
      new RegExp(
        process.env.BENCH_ROLE ??
          "state (senator|representative)|assembl|delegate",
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
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  // The Politics sheet, where the Bills tab is.
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  // Dev mode introduces a bill in a state chamber and passes it at a margin through the game's own votes.
  const result = await page.evaluate(async () => {
    const post = async (path, body) => {
      const r = await fetch(`/api/dev/${path}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { status: r.status, value: await r.json() };
    };
    const bodies = await (await fetch("/api/dev/lawmaking-bodies")).json();
    const chambers = bodies.filter(
      (b) => b.level === "state" && b.members.length > 0,
    );
    if (!chambers.length) return { error: "no state chamber" };
    // A chamber's committee can hold a bill before the floor: try questions and chambers until one
    // reaches a floor vote (the paper then has a roll to show), as the override check does.
    const laws = await (await fetch("/api/dev/laws")).json();
    const series = laws.series.filter(
      (row) => typeof row.combined === "number" && row.combined > 0,
    );
    const tried = [];
    for (let i = 0; i < 40; i += 1) {
      const chamber = chambers[i % chambers.length];
      const row = series[i % series.length];
      const intro = await post("introduce", {
        bodyOfficeId: chamber.id,
        sponsorId: chamber.members[(i * 7) % chamber.members.length].key,
        series: row.series,
        value: Math.round(row.combined * 120) / 100,
        unit: row.levels.find((l) => l.row)?.row.unit,
      });
      if (intro.status !== 200) {
        tried.push(`introduce ${intro.status}`);
        continue;
      }
      const billId = intro.value.mark?.facts?.billId ?? intro.value.billId;
      const decided = await post("decide", { billId, margin: 6 });
      const stage = await (
        await fetch(`/api/bill/stage?billId=${encodeURIComponent(billId)}`)
      ).json();
      tried.push(`${chamber.name} ${stage.status} floor ${stage.floor.length}`);
      if (stage.floor.length)
        return { chamber: chamber.name, billId, status: decided.status };
    }
    return { error: `no bill reached a floor vote: ${tried.join("; ")}` };
  });
  console.log("dev mode:", result);
  assert.ok(!result.error, `dev mode introduced and decided: ${result.error}`);
  // Following: the Bills tab lists it with where it stands and how your members voted.
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Bills", exact: true })
    .click();
  await page.locator(".roster-screen.bills .roster-row").first().waitFor();
  const listed = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .roster-row")].map(
      (n) => n.innerText,
    ),
  );
  console.log("bills:", listed.slice(0, 3));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bills-state.png` });
  // Two chambers can each have an "SB 2" with the same title: the bill is found by its place in the
  // list the Bills tab draws, which is the order the server follows them in.
  const place = await page.evaluate(async (id) => {
    const list = await (await fetch("/api/bills/following")).json();
    return list.findIndex((item) => item.id === id);
  }, result.billId);
  assert.ok(place >= 0, "the Bills tab follows the bill dev mode decided");
  // The bill by its own row in the list (the row carries the bill's id).
  await page
    .locator(
      `.roster-screen.bills .roster-row[data-key=${JSON.stringify(result.billId)}]`,
    )
    .click();
  // The page of that bill, not the one that was on screen before the click.
  await page
    .locator(
      `.roster-screen.bills .roster-page[data-key=${JSON.stringify(result.billId)}]`,
    )
    .waitFor();
  await page.locator(".stage-chamber").first().waitFor();
  const floor = await page.evaluate(() =>
    [...document.querySelectorAll(".stage-chamber")].map((n) => n.innerText),
  );
  console.log("floor result:", floor);
  assert.ok(
    floor.every((text) => /(Adopted|Passed|Defeated), \d+ to \d+\./.test(text)),
    "each chamber's result reads in words with names",
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bill-state-floor.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: a state bill is followed and its paper shows each chamber by name",
  );
} finally {
  await browser.close();
}
