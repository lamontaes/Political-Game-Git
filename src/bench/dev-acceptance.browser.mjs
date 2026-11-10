/* global process, URL, console, document, fetch */
// Dev mode as the acceptance check, on the screen (Fable audit, Nov 9, 2026, root cause 2): a
// second session passes a one-section state bill from the game, then reads on the bill's own page
// how it ended, that no trade added a section, the law row it made, who that law reached in people
// and dollars, and where the money went against the same world left alone.
// Builds a world with the Advanced start (a place drawn from the seed) and steps in as a state
// legislator. BENCH_SEED replays a world; SHOTS_DIR saves the screens.
// Run against a fresh bench: node src/bench/dev-acceptance.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { devModeOn } from "./dev-setup.mjs";
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
  // Dev mode on, from Options, so the bill's page carries its dev card.
  await devModeOn(page);
  // The Politics sheet, where the Bills tab is.
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  // A state bill that changes an amount, passed through the game's own votes with the chair cast to
  // hear it and the governor to sign. A bill a trade added a section to is not a clean test: try the
  // next law until one becomes law with no section added.
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
    const laws = await (await fetch("/api/dev/laws")).json();
    const series = laws.series
      .filter((row) => typeof row.combined === "number" && row.combined > 0)
      .sort(
        (a, b) =>
          Number(/tax/.test(b.series)) - Number(/tax/.test(a.series)) ||
          a.series.localeCompare(b.series),
      );
    const tried = [];
    for (let i = 0; i < 40; i += 1) {
      const chamber = chambers[i % chambers.length];
      const row = series[Math.floor(i / chambers.length) % series.length];
      const intro = await post("introduce", {
        bodyOfficeId: chamber.id,
        sponsorId: chamber.members[(i * 7) % chamber.members.length].key,
        series: row.series,
        value: Math.round(row.combined * 120) / 100,
        unit: row.levels.find((l) => l.row)?.row.unit,
      });
      if (intro.status !== 200) {
        tried.push(`${row.series}: introduce ${intro.status}`);
        continue;
      }
      const billId = intro.value.mark?.facts?.billId ?? intro.value.billId;
      const decided = await post("decide", {
        billId,
        margin: 6,
        sign: true,
        chairHears: true,
      });
      const ending = decided.value.ending?.how;
      const added = decided.value.addedSections;
      tried.push(`${row.series}: ${ending}, ${added} added`);
      if (ending === "law" && added === 0)
        return { chamber: chamber.name, billId, series: row.series, tried };
    }
    return { error: `no clean bill became law: ${tried.join("; ")}` };
  });
  console.log("dev mode:", result);
  assert.ok(
    !result.error,
    `a one-section state bill became law: ${result.error}`,
  );
  // Open the bill's page from the Bills tab.
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Bills", exact: true })
    .click();
  await page
    .locator("#sheet-body")
    .getByRole("button", { name: "Read the bill" })
    .first()
    .waitFor();
  const place = await page.evaluate(async (id) => {
    const list = await (await fetch("/api/bills/following")).json();
    return list.findIndex((item) => item.id === id);
  }, result.billId);
  assert.ok(place >= 0, "the Bills tab follows the bill dev mode decided");
  const openPaper = async () => {
    await page
      .locator("#sheet-body")
      .getByRole("button", { name: "Read the bill" })
      .nth(place)
      .click();
    await page.locator('[data-testid="dev-bill-ending"]').waitFor();
  };
  await openPaper();
  const read = (testid) =>
    page.locator(`[data-testid="${testid}"]`).allInnerTexts();
  const ending = (await read("dev-bill-ending"))[0];
  const added = (await read("dev-bill-added-sections"))[0];
  const lawLines = await read("dev-bill-law");
  console.log("ending:", ending, "|", added, "|", lawLines);
  assert.match(ending, /became law/i, "the card says how the bill ended");
  assert.match(added, /: 0$/, "no section was added by a trade");
  assert.ok(lawLines.length > 0, "the card names the law row the bill made");
  await page
    .locator('[data-testid="dev-bill-ending"]')
    .scrollIntoViewIfNeeded();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/01-what-came-of-it.png` });
  // Not yet in force: run until this law takes effect, and nothing else stops the run.
  if (await page.locator('[data-testid="dev-bill-run-to-effect"]').count()) {
    const ran = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/dev/run-until",
      { timeout: 900000 },
    );
    await page
      .locator('[data-testid="dev-bill-run-to-effect"]')
      .first()
      .click();
    const out = await (await ran).json();
    console.log("run until it takes effect:", out);
    assert.equal(
      out.reason,
      "event",
      "the run stopped on the law taking effect",
    );
    assert.ok(
      out.records.every((id) => id.includes("law-took-effect")),
      "it stopped on a law-took-effect record",
    );
  }
  // Paydays under the law: 45 days with dev mode's own run, then read who it reached.
  const days = await page.evaluate(async () => {
    const r = await fetch("/api/dev/run-until", {
      method: "POST",
      body: JSON.stringify({ days: 45, cap: 45 }),
    });
    return r.json();
  });
  console.log("ran:", days.from, "to", days.to);
  // Redraw the page: back to the Bills tab and into the paper again.
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(500);
  if (!(await page.locator('[data-testid="dev-bill-ending"]').count())) {
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Bills", exact: true })
      .click();
    await openPaper();
  }
  const reach = await read("dev-bill-reach");
  const sides = await read("dev-bill-reach-side");
  const people = await read("dev-bill-reach-person");
  const none = await read("dev-bill-reach-none");
  console.log("reach:", reach, sides.slice(0, 6), people.slice(0, 5), none);
  await page
    .locator('[data-testid="dev-bill-law"]')
    .first()
    .scrollIntoViewIfNeeded();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/02-who-it-reached.png` });
  // The money, against the same world left alone.
  const twin = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/dev/twin-money",
    { timeout: 900000 },
  );
  await page.locator('[data-testid="dev-twin-run"]').click();
  const money = await (await twin).json();
  await page.locator('[data-testid="dev-twin-class"]').first().waitFor();
  console.log(
    "money against the twin:",
    money.classes.map((c) => `${c.key} ${Math.round(c.diffMinor / 100)}`),
    "holders moved:",
    money.holdersMoved,
    "ms:",
    money.twinMs,
  );
  assert.equal(
    money.classes.reduce((sum, c) => sum + c.diffMinor, 0),
    0,
    "every dollar is accounted for across the holders and the outside",
  );
  await page.locator('[data-testid="dev-twin-span"]').scrollIntoViewIfNeeded();
  if (SHOTS)
    await page.screenshot({ path: `${SHOTS}/03-follow-the-money.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log(
    `ok: ${result.series} at ${result.chamber}: the card said how the bill ended, named its law, who it reached and where the money went`,
  );
} finally {
  await browser.close();
}
