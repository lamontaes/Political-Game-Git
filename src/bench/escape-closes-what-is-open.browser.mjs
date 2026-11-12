/* global process, console */
// Escape closes the top thing that is open, and opens Options only when nothing is (owner, Sept 20,
// docs/coordination/prior-rulings/screens.md, ruling 18; pool item play-escape-opens-options-over-an-open-menu).
// On the bench (npm run bench) at 1440x900: a new life in a drawn place (BENCH_SEED names one); each
// menu on the rail is opened and one Escape closes it, with the room and the clock showing and Day
// pressable; a second Escape opens Options and a third closes it; a person's card over a talk closes
// first and the talk is still there after Options. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium [BENCH_SEED=<seed>] node src/bench/escape-closes-what-is-open.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const [shots] = process.argv.slice(2);
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : null;
const sheetOpen = () => page.locator("#sheet").isVisible();
const optionsOpen = async () =>
  (await sheetOpen()) &&
  (await page.locator("#sheet-title").innerText()).trim() === "Options";
try {
  if (process.env.BENCH_SEED) {
    await page.goto(`${base}/play`);
    const made = await page.request.post(
      `${base}/api/newlife?seed=${process.env.BENCH_SEED}`,
      { timeout: 600000 },
    );
    assert.equal(made.status(), 200, "the world builds from the seed");
  }
  const life = await startLife(page, { fresh: !process.env.BENCH_SEED });
  console.log(
    `ESCAPE BROWSER: ${life.placeName ?? (await page.locator("#card-place").innerText())}, seed ${life.seed ?? process.env.BENCH_SEED}`,
  );

  // The rail's menus: each one closes on one Escape.
  const tabs = await page
    .locator("#rings .ring[data-tab]")
    .evaluateAll((els) => els.map((e) => e.dataset.tab));
  assert.ok(tabs.length >= 3, `the rail has menus (${tabs.join(", ")})`);
  for (const tab of tabs) {
    await page
      .locator(`#rings .ring[data-tab="${tab}"]`)
      .first()
      .evaluate((e) => e.click());
    await page.locator("#sheet").waitFor({ state: "visible" });
    if (tab === "politics" || tab === tabs[0]) await shot(`open-${tab}`);
    const started = Date.now();
    await page.keyboard.press("Escape");
    await page.locator("#sheet").waitFor({ state: "hidden" });
    const took = Date.now() - started;
    assert.equal(
      await optionsOpen(),
      false,
      `${tab}: Options not opened over it`,
    );
    assert.ok(
      await page.locator("#card-clock").isVisible(),
      `${tab}: the clock shows`,
    );
    assert.ok(
      !(await page.locator("#day").isDisabled()),
      `${tab}: Day can be pressed`,
    );
    if (tab === "politics" || tab === tabs[0]) await shot(`closed-${tab}`);
    console.log(`${tab}: one Escape closed it in ${took} ms`);
  }

  // Nothing open: Escape opens Options, and the next one closes it.
  await page.keyboard.press("Escape");
  await page.locator("#sheet").waitFor({ state: "visible" });
  assert.ok(await optionsOpen(), "Escape with nothing open opens Options");
  await page.keyboard.press("Escape");
  await page.locator("#sheet").waitFor({ state: "hidden" });

  // A person's card closes before anything under it; a talk is not closed by Escape.
  const people = page.locator(
    "#here .person, #here button, #here [data-person]",
  );
  if (await people.count()) {
    await people.first().click();
    await page.locator("#talk-name").waitFor();
    await page.locator("#talk-name").click();
    await page.locator("#person:not([hidden])").waitFor();
    await page.keyboard.press("Escape");
    await page.locator("#person").waitFor({ state: "hidden" });
    assert.ok(
      await page.locator("#talk-name").isVisible(),
      "the talk is still there after the card closes",
    );
    await page.keyboard.press("Escape");
    await page.locator("#sheet").waitFor({ state: "visible" });
    assert.ok(await optionsOpen(), "Escape during a talk opens Options");
    await page.keyboard.press("Escape");
    await page.locator("#sheet").waitFor({ state: "hidden" });
    assert.ok(
      await page.locator("#talk-name").isVisible(),
      "the talk is still there after Options closes",
    );
  } else
    console.log(
      "no one in the room to talk to in this draw; talk steps skipped",
    );
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS Escape closes what is open, then opens Options");
} finally {
  await browser.close();
}
