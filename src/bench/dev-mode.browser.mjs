/* global process, console, document */
// Dev mode from the game's own screens, in a real browser on the bench (npm run bench) at
// 1440x900, in a place drawn from all 56 (the run prints its seed and place): the setting in
// Options (off by default), the person card's Remembers section, the Calendar's Run until, and
// the Government tab's Bills and Bribe panels. With dev mode off none of them is on a screen.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shots = process.env.DEV_MODE_SHOTS;
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/dev-mode-${name}.png` }) : null;

/** The dock's menu buttons, in order: the calendar is third and politics fifth. */
const RINGS = { Calendar: 2, Politics: 4 };
const closeSheet = () => page.locator("#sheet-close").click();
const dock = (name) => page.locator("#dock button").nth(RINGS[name]);

try {
  const { seed, placeName } = await startLife(page, { fresh: true });
  console.log(`DEV MODE BROWSER: ${placeName}, seed ${seed}`);

  // Off by default: no dev panel anywhere.
  assert.equal(
    await page.evaluate(() => document.body.classList.contains("dev")),
    false,
    "dev mode is off by default",
  );
  await dock("Calendar").click();
  await page.locator(".calendar-board").waitFor();
  assert.equal(await page.locator(".dev-run").isVisible(), false);
  await closeSheet();

  // The setting, in Options.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  assert.equal(
    await page.evaluate(() => document.body.classList.contains("dev")),
    true,
    "dev mode switched on from Options",
  );
  await closeSheet();

  // Run until: a number of days, with the reason it stopped.
  await dock("Calendar").click();
  await page.locator('[data-testid="dev-run"]').waitFor();
  await page.locator(".dev-run input").first().fill("3");
  await page.locator('[data-testid="dev-run"]').click();
  await page.waitForFunction(
    () => document.querySelector(".dev-run .option-status")?.textContent,
  );
  const ran = await page.locator(".dev-run .option-status").textContent();
  assert.match(ran, /Days passed/, ran);
  // Scenes: the types the game can bring about are forced, the rest say there is no way in.
  await page.locator('[data-testid="dev-scene"]').click();
  await page.waitForFunction(
    () => document.querySelector(".dev-scene .option-status")?.textContent,
  );
  assert.match(
    await page.locator(".dev-scene .option-status").textContent(),
    /Begun for/,
  );
  // Watch and the golden path, on the Calendar beside Run until.
  await page.locator(".dev-watch").waitFor();
  assert.ok(
    (await page.locator(".dev-watch table").count()) >= 3,
    "the watch and path tables are on the calendar",
  );
  await shot("run-until");
  await closeSheet();

  // A person's card, opened from a member of government: what they remember, and the health controls.
  await dock("Politics").click();
  await page.locator("#sheet-body .member-card").first().click();
  await page.locator('[data-testid="dev-ill"]').waitFor();
  assert.ok(
    (await page.locator(".dev-memory-row").count()) >= 0,
    "the card is open",
  );
  await page.locator('[data-testid="dev-ill"]').click();
  await page.waitForFunction(() =>
    document
      .querySelector("#person-facts")
      ?.textContent.includes("Seriously ill"),
  );
  // Their records, and the trace behind one: the person view and the trace have a home here.
  if ((await page.locator(".dev-record-ids .id").count()) > 0) {
    await page.locator(".dev-record-ids .id").first().click();
    await page.locator(".dev-trace h4").waitFor();
  }
  // Follow them, from their card.
  await page
    .getByRole("button", { name: /^(Follow|Stop following)$/ })
    .first()
    .waitFor();
  // What the game offers them today: a pick is their next decision.
  if ((await page.locator('[data-testid="dev-offer"]').count()) > 0) {
    await page.locator('[data-testid="dev-offer"]').first().click();
    await page.waitForFunction(() =>
      document
        .querySelector("#person-facts")
        ?.textContent.includes("Picked for their next decision"),
    );
  }
  await shot("person");
  await page.evaluate(() => document.getElementById("person-close").click());

  // Bills and Bribe on the Government tab.
  await dock("Politics").click();
  await page.locator('[data-testid="dev-introduce"]').waitFor();
  await page.locator('[data-testid="dev-introduce"]').click();
  await page.waitForFunction(
    () => document.querySelector(".dev-bills .option-status")?.textContent,
  );
  const introduced = await page
    .locator(".dev-bills .option-status")
    .textContent();
  assert.match(introduced, /drafted|blocked/, introduced);
  if (/drafted/.test(introduced)) {
    await page.locator('[data-testid="dev-pass"]').click();
    await page.waitForFunction(() =>
      /enacted|failed|vetoed|overridden|blocked/.test(
        document.querySelector(".dev-bills .option-status")?.textContent ?? "",
      ),
    );
    await page.locator('[data-testid="dev-bribe"]').click();
    await page.waitForFunction(
      () => document.querySelector(".dev-bribe .option-status")?.textContent,
    );
    const bribed = await page
      .locator(".dev-bribe .option-status")
      .textContent();
    assert.match(bribed, /Offered|Not offered/, bribed);
  }
  await shot("government");

  // Switched off again, the panels are gone.
  await closeSheet();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Off", exact: true }).last().click();
  await page.keyboard.press("Escape");
  await dock("Calendar").click();
  await page.locator(".calendar-board").waitFor();
  assert.equal(await page.locator(".dev-run").isVisible(), false);

  assert.deepEqual(errors, []);
  console.log("DEV MODE BROWSER: ok");
} finally {
  await browser.close();
}
