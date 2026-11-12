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
    // A chamber's committee can hold a bill before the floor: try bills until one is vetoed and
    // waits on the player's own override vote.
    const tried = [];
    // Many series, since a committee chair hears some questions and holds others.
    const laws = await (await fetch("/api/dev/laws")).json();
    const series = laws.series.filter(
      (row) => typeof row.combined === "number" && row.combined > 0,
    );
    // Chambers the player sits in (learned from the first bills); later bills go only there.
    const mine = new Set();
    for (let i = 0; i < 40; i += 1) {
      const pool = mine.size
        ? chambers.filter((c) => mine.has(c.id))
        : chambers;
      const chamber = pool[i % pool.length];
      const intro = await post("introduce", {
        bodyOfficeId: chamber.id,
        sponsorId: chamber.members[(i * 7) % chamber.members.length].key,
        series: series[i % series.length].series,
        value: Math.round(series[i % series.length].combined * 120) / 100,
        unit: series[i % series.length].levels.find((l) => l.row)?.row.unit,
      });
      if (intro.status !== 200) {
        tried.push(`introduce ${intro.status}`);
        continue;
      }
      const billId = intro.value.mark?.facts?.billId ?? intro.value.billId;
      await post("decide", {
        billId,
        margin: [6, 14, 22][i % 3],
        sign: false,
      });
      const stage = await (
        await fetch(`/api/bill/stage?billId=${encodeURIComponent(billId)}`)
      ).json();
      tried.push(
        `${chamber.name} ${stage.status} sits ${stage.yours.sits} pending ${stage.yours.overridePending} chosen ${stage.yours.overrideChosen}`,
      );
      if (stage.yours.sits) mine.add(chamber.id);
      if (stage.yours.overridePending)
        return { chamber: chamber.name, billId, number: stage.number, tried };
    }
    return {
      error: `no vetoed bill waited on the player: ${tried.join("; ")}`,
    };
  });
  console.log("dev mode:", result);
  assert.ok(!result.error, `dev mode introduced and decided: ${result.error}`);
  // Following: the Bills tab lists it with where it stands and how your members voted.
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Bills", exact: true })
    .click();
  await page.locator(".roster-screen.bills .roster-row").first().waitFor();
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
  // The veto message waits for the player's own vote on overriding it.
  await page.getByText("Override the veto", { exact: true }).waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/override-waiting.png` });
  await page.locator(".stage-vote button", { hasText: /^Yes$/ }).last().click();
  await page.getByRole("button", { name: "Take up the veto message" }).click();
  // The body voted it: the override result is on the paper by name.
  // The override is its own roll call on the paper, under its own heading.
  await page
    .getByText("The vote to override the veto", { exact: true })
    .waitFor();
  const results = await page.evaluate(() => {
    const heading = [...document.querySelectorAll(".sechead")].find(
      (n) => n.textContent === "The vote to override the veto",
    );
    return [...heading.parentElement.querySelectorAll(".stage-chamber")].map(
      (n) => n.innerText,
    );
  });
  console.log("results:", results);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/override-done.png` });
  assert.ok(
    results.some((text) => /Yes:/.test(text) && /No:/.test(text)),
    "the override roll call is on the paper",
  );
  // The committee stage is on the same paper: where the bill was referred, who chaired it, and
  // whom it heard from (or that the chair held it).
  const paper = await page.locator("#sheet-body").innerText();
  assert.match(paper, /In committee: /, "the paper shows the committee stage");
  assert.match(
    paper,
    /Referred to /,
    "the paper names the committee it went to",
  );
  assert.match(paper, /Chaired by /, "the paper names the chair");
  assert.match(
    paper,
    /Heard from|The chair held it and did not hear it/,
    "the paper says whom the committee heard from, or that the chair held it",
  );
  console.log(
    "committee on the paper:",
    paper
      .split("\n")
      .filter((line) =>
        /In committee|Referred to|Chaired by|Heard from|held it/.test(line),
      )
      .join(" | "),
  );
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: the player voted the override of a veto and the body took it up",
  );
} finally {
  await browser.close();
}
