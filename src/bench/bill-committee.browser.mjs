/* global process, URL, console, document, fetch */
// The committee stage of a state bill on its paper (item 2 of the legislation goal): dev mode
// introduces bills in a state chamber and passes them through the game's own votes until one
// has a hearing that heard witnesses; the Bills tab lists it and its paper names the committee,
// its chair, whom it heard from by name and what the markup changed.
// Builds a world with the Advanced start (a place drawn from the seed) and steps in as a
// member of a body. BENCH_SEED replays a world; SHOTS_DIR saves the screens.
// Run against a fresh bench: node src/bench/bill-committee.browser.mjs
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
    // A member of the played place's own legislature, matched by its government's records (the
    // State level of Politics: the home state's chambers and their members), never by a word in a
    // title: "Assemblymember" also matched another state's assembly (Frederick, Oklahoma stepped in
    // as a California member, Nov 11). Only a bill of the town's own state or the nation reaches
    // its residents, so only those hearings can hear them.
    const own = await page.evaluate(async () => {
      const v = await (
        await fetch("/api/government/bodies?id=&level=state&state=")
      ).json();
      const memberIds = new Set(
        v.legislative.flatMap((b) => b.members.map((m) => m.cardId)),
      );
      const holders = await (await fetch("/api/advanced/officeholders")).json();
      return {
        state: v.state.key,
        name:
          holders
            .filter((h) => memberIds.has(h.personId))
            .map((h) => h.name)
            .sort()[0] ?? null,
      };
    });
    // The picker lists the first 200 holders; searching for the member's name finds theirs.
    if (own.name && !process.env.BENCH_ROLE)
      await page.locator("#pick-search").fill(own.name);
    names = await page.locator("#pick-list button").allInnerTexts();
    at = process.env.BENCH_ROLE
      ? names.findIndex((t) => new RegExp(process.env.BENCH_ROLE, "i").test(t))
      : names.findIndex((t) => own.name && t.includes(own.name));
    if (at < 0)
      console.log(
        `unusable draw ${attempt}: seed ${seed}, no member of ${own.state}'s legislature`,
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
  // Dev mode introduces bills in the player's state chambers and passes them until one has a
  // hearing that heard witnesses.
  const result = await page.evaluate(async () => {
    const post = async (path, body) => {
      const r = await fetch(`/api/dev/${path}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { status: r.status, value: await r.json() };
    };
    // The played place's own state chambers, from its government's records: another state's bill
    // never reaches the town's residents, so its hearing has none of them to hear.
    const home = await (
      await fetch("/api/government/bodies?id=&level=state&state=")
    ).json();
    const ownChambers = new Set(home.legislative.map((b) => b.officeId));
    const bodies = await (await fetch("/api/dev/lawmaking-bodies")).json();
    const chambers = bodies.filter(
      (b) => ownChambers.has(b.id) && b.members.length > 0,
    );
    if (!chambers.length)
      return { error: `no chamber of ${home.state.key}'s legislature` };
    const laws = await (await fetch("/api/dev/laws")).json();
    // A hearing on a policy question hears the residents the interest groups show on each side.
    const rows = [...laws.series].sort(
      (a, b) =>
        Number(b.series.startsWith("us-policy-positions:")) -
        Number(a.series.startsWith("us-policy-positions:")),
    );
    const tried = [];
    for (let i = 0; i < 60; i += 1) {
      const chamber = chambers[i % chambers.length];
      const row = rows[i % rows.length];
      const intro = await post("introduce", {
        bodyOfficeId: chamber.id,
        sponsorId: chamber.members[(i * 7) % chamber.members.length].key,
        series: row.series,
        value:
          typeof row.combined === "number" && row.combined > 0
            ? Math.round(row.combined * 120) / 100
            : 1,
        unit: row.levels?.find((l) => l.row)?.row.unit,
      });
      if (intro.status !== 200) {
        tried.push(`introduce ${intro.status}`);
        continue;
      }
      const billId = intro.value.mark?.facts?.billId ?? intro.value.billId;
      await post("decide", {
        billId,
        margin: 10,
        sign: true,
        chairHears: true,
      });
      const stage = await (
        await fetch(`/api/bill/stage?billId=${encodeURIComponent(billId)}`)
      ).json();
      const heard = stage.committees?.find(
        (c) => c.heard && c.witnesses?.length,
      );
      tried.push(
        `${row.series} ${stage.status} heard ${stage.committees?.map((c) => c.heard + ":" + c.witnesses?.length)}`,
      );
      if (heard)
        return {
          billId,
          number: stage.number,
          committee: heard.committee,
          chair: heard.chair,
          witnesses: heard.witnesses.map((w) => w.name),
          markup: (heard.markup ?? []).length,
          keys: Object.keys(heard),
        };
    }
    return {
      error: `no hearing heard witnesses: ${tried.slice(0, 12).join("; ")}`,
    };
  });
  console.log("dev mode:", JSON.stringify(result).slice(0, 600));
  assert.ok(
    !result.error,
    `dev mode found a hearing with witnesses: ${result.error}`,
  );
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Bills", exact: true })
    .click();
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
  await page.getByText("In committee: ", { exact: false }).first().waitFor();
  const paper = await page.locator("#sheet-body").innerText();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/committee-paper.png` });
  assert.match(paper, /Referred to /, "the paper names the committee");
  assert.ok(paper.includes(result.chair), "the paper names the chair");
  assert.match(paper, /Heard from/, "the paper says whom the committee heard");
  for (const name of result.witnesses)
    assert.ok(paper.includes(name), `the paper names the witness ${name}`);
  console.log(
    "committee on the paper:",
    paper
      .split("\n")
      .filter((line) =>
        /In committee|Referred to|Chaired by|Heard from|markup/i.test(line),
      )
      .join(" | ")
      .slice(0, 500),
  );
  // The markup the committee made is on the paper when it made any.
  if (result.markup > 0)
    assert.match(paper, /Changes in markup/, "the paper lists the markup");
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: a committee heard witnesses and its paper names the committee, its chair and each witness",
  );
} finally {
  await browser.close();
}
