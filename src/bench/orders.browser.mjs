/* global process, URL, console, document, Event */
// The governor's order panel (done-when item 5, Nov 8): the player steps in as a governor, the clock
// runs, and the state's own calendar stops it at the State of the State: the panel opens with the address
// worded from the controls, the player gives it, and the clock runs on. Adapted from bill-desk.browser.mjs.
// Builds a world with the Advanced start (a place drawn from the seed) and steps in as a
// member of a body. BENCH_SEED replays a world; SHOTS_DIR saves the screens.
// Run against a fresh bench: node src/bench/orders.browser.mjs
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
  // Build a world, then step in as the state's governor: the government screen names the holders.
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
  await page.locator("#pick-list button").first().click();
  const played = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/play",
  );
  await page.locator("#pick-play").click();
  const meId = (await (await played).json()).personId;
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const governor = await page.evaluate(async (meId) => {
    const me = { personId: meId };
    const view = await (
      await fetch(
        `/api/government?id=${encodeURIComponent(me?.personId ?? "")}`,
      )
    ).json();
    const found = (view.seats ?? [])
      .filter((seat) => /^governor$/i.test(seat.title) && seat.holder?.personId)
      .map((seat) => seat.holder.personId);
    return { found, sample: JSON.stringify(view.seats?.slice(0, 2)) };
  }, meId);
  console.log("governor lookup:", JSON.stringify(governor));
  assert.ok(
    governor.found.length > 0,
    "the government screen names the governor",
  );
  await page.evaluate(async (id) => {
    await fetch(`/api/play?id=${encodeURIComponent(id)}`, { method: "POST" });
  }, governor.found[0]);
  console.log("Seed:", seed, "stepped in as governor", governor.found[0]);
  // Control of the chosen character binds when the clock next advances: play one day first.
  if (!(await page.locator("#day").isDisabled())) {
    await page.locator("#day").click();
    for (let i = 0; i < 10; i += 1) {
      await page.waitForTimeout(1200);
      if (await visible("desk")) break;
      if (await visible("talk-next")) await page.locator("#talk-next").click();
      else if (await visible("continue"))
        await page.locator("#continue").click();
      else break;
    }
  }
  // Run the clock; whenever the order panel opens, read its plates and act on the first order
  // (the button that sends or gives it). The state's own calendar names the day of each.
  const seen = [];
  for (
    let day = 0;
    day < 200 && !seen.includes("The State of the State");
    day += 1
  ) {
    if (await visible("desk")) {
      const plates = await page.locator("#desk-items > *").allInnerTexts();
      const titles = plates.map((t) => t.split("\n")[0].trim());
      for (const t of titles) {
        const name = /^the state of the state$/i.test(t)
          ? "The State of the State"
          : t;
        if (!seen.includes(name)) seen.push(name);
      }
      console.log(`day ${day}: panel`, JSON.stringify(titles.slice(0, 3)));
      if (SHOTS)
        await page.screenshot({ path: `${SHOTS}/orders-${seen.length}.png` });
      const text = plates.join(" ");
      assert.doesNotMatch(
        text,
        /[{}]|undefined|NaN|office-day|\d{4}-\d{2}-\d{2}/,
        "no raw ids or dates",
      );
      await page.locator("#desk-items .action").last().click();
      await page.waitForTimeout(1200);
      continue;
    }
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#day").isDisabled()))
      await page.locator("#day").click();
    await page.waitForTimeout(900);
  }
  // A state's own calendar decides which order comes first (the address, the budget, an executive
  // order on a passed bill); one of the state's two yearly orders must have reached the panel.
  assert.ok(
    seen.some((t) =>
      ["The State of the State", "THE STATE BUDGET"].includes(t),
    ),
    `a state order reached the governor's panel (saw ${JSON.stringify(seen)}); rerun for a new draw`,
  );
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: the governor's order panel opened on the state's calendar and its first order was acted on",
  );
} finally {
  await browser.close();
}
