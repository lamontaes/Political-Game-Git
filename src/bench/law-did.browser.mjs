/* global process, console, fetch, URL */
// What this law did, on the law page (play-what-this-law-did-page), on the
// bench (npm run bench): a new life, dev mode on, a property tax rise passed by
// the town's own body through dev mode's bill route (every member yes, the
// chair hears it, the executive signs), the world run to the law's day and 45
// days of collections. The law page's "What this did" names the people the
// reach records hold, each with their money, and the page agrees to the
// dollar with dev mode's reach for the same law row. Then a second bill puts
// the rate back; once it takes over, the first law says when it stopped and
// for whom. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/law-did.browser.mjs [shots dir]
// PLACE_KEY and SEED replay one world (the audit's: PLACE_KEY=2845160 SEED=7df73e53cd67).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const [shots] = process.argv.slice(2);
/** The town's own bodies that may set a property tax, nearest first. */
const LOCAL = ["city", "town", "village", "township", "borough", "county"];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (process.env.PLACE_KEY || process.env.SEED)
  await page.route("**/api/newlife?*", (route) => {
    const url = new URL(route.request().url());
    if (process.env.SEED) url.searchParams.set("seed", process.env.SEED);
    if (process.env.PLACE_KEY)
      url.searchParams.set("placeKey", process.env.PLACE_KEY);
    return route.continue({ url: url.href });
  });
const dev = (path, body) =>
  page.evaluate(
    async ({ path, body }) => {
      const r = await fetch(`/api/dev/${path}`, {
        method: body ? "POST" : "GET",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return r.json();
    },
    { path, body },
  );
/** Pass a property tax rate through the town's body; the bill's law row. */
async function passRate(body, value, unit) {
  const intro = await dev("introduce", {
    bodyOfficeId: body.id,
    sponsorId: body.members[0].key,
    series: "property-tax",
    value,
    unit,
  });
  const billId = intro.mark?.facts?.billId ?? intro.billId;
  const decided = await dev("decide", {
    billId,
    margin: body.members.length,
    sign: true,
    chairHears: true,
  });
  assert.equal(decided.ending?.how, "law", `the bill became law: ${billId}`);
  const outcome = await dev(
    `bill-outcome?billId=${encodeURIComponent(billId)}`,
  );
  const law = outcome.laws.find((l) => l.series === "property-tax");
  assert.ok(law, "the bill made a property tax row");
  if (!law.inForce)
    await dev("run-until", {
      event: "law-takes-effect",
      subject: law.id,
      cap: 800,
    });
  await dev("run-until", { days: 45, cap: 45 });
  return { billId, law };
}
/** The Issues list's property tax page, and its "What this did" text. */
async function openLaw() {
  await page.keyboard.press("Escape");
  const start = Date.now();
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Issues", exact: true })
    .click();
  // The row sits on a later page of the roster box, scrolled inside nested boxes; Playwright's own
  // scroll-into-view never settles there ("waiting for element to be stable"), so the check scrolls
  // the row to the box's edge itself, as a player's wheel does, and then clicks it where it stands.
  const law = page.locator('.roster-row[data-key="property-tax"]');
  await law.waitFor();
  await law.evaluate((row) => row.scrollIntoView({ block: "nearest" }));
  await law.click();
  const section = page
    .locator("#sheet-body .sec")
    .filter({ hasText: "What this did" });
  await section.waitFor();
  const ms = Date.now() - start;
  // The page draws the section and then redraws it as its record arrives, so the section a check
  // holds can be replaced under it: read it where it stands, in one step, once it has stopped being
  // replaced (its text unchanged across a pause).
  let text = await section.innerText();
  for (let tries = 0; tries < 10; tries += 1) {
    await page.waitForTimeout(400);
    const now = await section.evaluate((node) => {
      node.scrollIntoView({ block: "nearest" });
      return node.innerText;
    });
    if (now === text) break;
    text = now;
  }
  return { text, ms };
}
try {
  const life = await startLife(page, { fresh: true });
  console.log("Place:", life.placeName, "Seed:", life.seed);
  await devModeOn(page);
  const bodies = await dev("lawmaking-bodies");
  // The town's own (dev mode lists every state's chambers too, by their state's id).
  const body = bodies
    .filter(
      (b) =>
        LOCAL.includes(b.level) &&
        b.members.length > 0 &&
        !b.id.startsWith("office:US-"),
    )
    .sort((a, b) => LOCAL.indexOf(a.level) - LOCAL.indexOf(b.level))[0];
  assert.ok(body, "the town has a body that may set its property tax");
  const laws = await dev("laws");
  const row = laws.series.find((s) => s.series === "property-tax");
  // The level's own rate where it has a row, else the rate in force here.
  const own = row.levels.find((l) => l.level === body.level)?.row;
  const was = own?.value ?? row.combined;
  assert.ok(typeof was === "number", "a property tax rate is in force here");
  const raised = Math.round(was * 150) / 100;
  console.log(`${body.name}: property tax ${was}% to ${raised}%`);
  const first = await passRate(body, raised, own?.unit);
  const opened = await openLaw();
  if (shots) await page.screenshot({ path: `${shots}/what-this-did.png` });
  console.log(`What this did (opened in ${opened.ms} ms):\n${opened.text}`);
  // The page agrees with dev mode's reach for the same row, to the dollar.
  const reach = await dev(`reach?lawId=${encodeURIComponent(first.law.id)}`);
  const did = await page.evaluate(async () =>
    (await fetch("/api/law/did?series=property-tax")).json(),
  );
  const shown = did.find((d) => d.lawId === first.law.id);
  assert.ok(shown, "the page lists the bill's law row");
  assert.ok(reach.records > 0, "the law reached someone");
  assert.equal(shown.records, reach.records);
  assert.equal(shown.fullInTown.amountMinor, reach.amountInTownMinor);
  assert.equal(shown.fullElsewhere.amountMinor, reach.amountElsewhereMinor);
  assert.equal(shown.counted.amountMinor, reach.amountCountedMinor);
  for (const p of reach.named.slice(0, 3)) {
    const mine = shown.named.find((n) => n.personId === p.personId);
    assert.equal(mine?.amountMinor, p.amountMinor, p.name);
    // Row labels are drawn in small capitals, so the text is read without case.
    assert.ok(
      opened.text.toLowerCase().includes(p.name.toLowerCase()),
      `the page names ${p.name}`,
    );
    console.log(`  ${p.name} (${p.personId}): ${p.amountMinor / 100} dollars`);
  }
  // The rate goes back; the first law then says when it stopped, for the same people.
  await passRate(body, was, own?.unit);
  const after = await openLaw();
  if (shots)
    await page.screenshot({ path: `${shots}/what-this-did-after.png` });
  console.log(`After it was put back:\n${after.text}`);
  assert.match(after.text, /until /i, "the replaced law says until when");
  assert.match(after.text, /stopped /i, "people show when it stopped");
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS what this law did, by its reach records");
} finally {
  await browser.close();
}
