/* global process, URL, console, document, fetch */
// Dev mode shows what a repeal ended (pool item dev-mode-repeal-reach-reads-nobody). A state
// representative at Ridgeville, Alabama has Alabama's sales tax repealed through dev mode's bill
// controls (introduce as the Repeal button sends it, decided with the chair hearing it and the
// governor signing), opens the bill's page under Bills, presses Run until it ends on its dev card,
// and reads there the law the repeal ended, who it reached while in force and who no longer gets it.
// Pinned: Ridgeville, Alabama (0164656), world seed
// 3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178 (the draw "8341-pin"/"p6"
// dev-repeal-reach.test.ts names). SHOTS_DIR saves the card. Run against a fresh bench: npm run
// bench, then node src/bench/dev-repeal.browser.mjs (about three minutes).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { devModeOn } from "./dev-setup.mjs";

const SEED = "3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178";
const PLACE_KEY = "0164656";
const BODY = "office:US-AL:legislature-lower";
const ENDED = "law:US-AL:state:sales-tax:general:2025-01-01";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const started = Date.now();
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
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", SEED);
    url.searchParams.set("placeKey", PLACE_KEY);
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
  await built;
  await page.locator("#front-pick:not([hidden])").waitFor();
  const names = await page.locator("#pick-list button").allInnerTexts();
  const at = names.findIndex((t) => /state representative/i.test(t));
  assert.ok(at >= 0, `seed ${SEED}: no state representative to step in as`);
  await page.locator("#pick-list button").nth(at).click();
  await page.locator("#pick-play").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  console.log("Seed:", SEED, "Place:", place, "Player:", names[at]);
  for (let i = 0; i < 20; i += 1) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  await devModeOn(page);
  // The repeal, as the dev bills panel's Repeal sends it, decided through the game's own votes.
  const billId = await page.evaluate(async (body) => {
    const post = async (path, input) =>
      (
        await fetch(`/api/dev/${path}`, {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).json();
    const bodies = await (await fetch("/api/dev/lawmaking-bodies")).json();
    const chamber = bodies.find((b) => b.id === body);
    const intro = await post("introduce", {
      bodyOfficeId: body,
      sponsorId: chamber.members[0].key,
      series: "sales-tax",
      value: 0,
      repeal: true,
    });
    await post("decide", {
      billId: intro.bill.id,
      margin: 40,
      sign: true,
      chairHears: true,
    });
    return intro.bill.id;
  }, BODY);
  console.log("repeal bill:", billId);
  const openCard = async () => {
    // The sheet open from the last read closes first, so the ring opens it again on Politics.
    if (await visible("sheet-close")) await page.locator("#sheet-close").click();
    await page
      .locator('#rings [data-tab="politics"]')
      .first()
      .evaluate((e) => e.click());
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Bills", exact: true })
      .click();
    await page.locator(".roster-screen.bills .roster-row").first().waitFor();
    await page
      .locator(
        `.roster-screen.bills .roster-row[data-key=${JSON.stringify(billId)}]`,
      )
      .click();
    await page.locator('[data-testid="dev-bill-ended-law"]').waitFor();
  };
  const read = (testid) =>
    page.locator(`[data-testid="${testid}"]`).allInnerTexts();
  await openCard();
  const failed = [];
  const endedBefore = await read("dev-bill-ended-law");
  console.log("before:", endedBefore, await read("dev-bill-none-ended"));
  if (!/sales-tax · state · 4 percent · Ends /.test(endedBefore[0] ?? ""))
    failed.push(`the card does not name the row it will end: ${endedBefore}`);
  if (!(await read("dev-bill-none-ended")).length)
    failed.push("before its day, the card says some of its reach ended");
  // Run until it ends, on the card.
  const ran = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/dev/run-until",
    { timeout: 600000 },
  );
  await page.locator('[data-testid="dev-bill-run-to-end"]').click();
  const until = await (await ran).json();
  console.log("run until it ends:", until.from, "to", until.to, until.records);
  if (!until.records?.includes(`law-ended:${ENDED}`))
    failed.push(`Run until it ends stopped on ${until.records}`);
  await openCard();
  const endedAfter = await read("dev-bill-ended-law");
  const gone = await read("dev-bill-no-longer-reached");
  console.log("after:", endedAfter, gone);
  if (!/· Ended /.test(endedAfter[0] ?? ""))
    failed.push(`the card does not say the row ended: ${endedAfter}`);
  if (!/^Records [1-9]/.test(gone[0] ?? ""))
    failed.push(`no one is listed as no longer reached: ${gone}`);
  await page
    .locator('[data-testid="dev-bill-ended-law"]')
    .scrollIntoViewIfNeeded();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/dev-repeal-ended.png` });
  await page
    .locator('[data-testid="dev-bill-no-longer-reached"]')
    .scrollIntoViewIfNeeded();
  if (SHOTS)
    await page.screenshot({
      path: `${SHOTS}/dev-repeal-no-longer-reached.png`,
    });
  if (errors.length) failed.push(`the page threw: ${errors.join("; ")}`);
  console.log(`${Math.round((Date.now() - started) / 1000)} s`);
  assert.deepEqual(failed, [], `the repeal's card at ${place}, seed ${SEED}`);
  console.log(
    "ok: the card names the sales tax the repeal ended and who no longer gets it",
  );
} finally {
  await browser.close();
}
