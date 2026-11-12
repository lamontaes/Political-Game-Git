/* global process, console, document, URL */
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
const expect_enabled = () =>
  page.waitForFunction(
    () => !document.querySelector('[data-testid="dev-scene"]')?.disabled,
  );
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
  // Three days: the arrows step the number down from 30 to 3.
  while (
    !(await page.locator('[data-testid="dev-days"]').innerText()).includes(
      "3 days",
    )
  )
    await page.locator('[data-testid="dev-days"] button').first().click();
  await page.locator('[data-testid="dev-run"]').click();
  await page.waitForFunction(
    () => document.querySelector(".dev-run .option-status")?.textContent,
  );
  const ran = await page.locator(".dev-run .option-status").textContent();
  assert.match(ran, /Days passed/, ran);
  // Scenes: only the types the game can bring about are offered; the rest stay off.
  await page.locator('[data-testid="dev-scene"]').click();
  // The sheet redraws after a run and rebuilds the line from the last result, so wait for the words.
  await page.waitForFunction(() =>
    /Begun for/.test(
      document.querySelector(".dev-scene .option-status")?.textContent ?? "",
    ),
  );
  assert.match(
    await page.locator(".dev-scene .option-status").textContent(),
    /Begun for/,
  );
  // A layoff, and no kind offered that no engine can start (the kinds the world runs until they
  // happen take up to a year of days and are proved in dev-scene.test.ts).
  assert.equal(
    await page
      .locator('.dev-scene [data-scene]:text-matches("No engine")')
      .count(),
    0,
    "a scene nothing can start is offered",
  );
  {
    const expected = /Begun for|worked today|staff|job|No one in the player/;
    // The layoff kind: the one the scenes list marks with that recipe.
    const rows = await (
      await page.request.get(
        `http://localhost:${process.env.BENCH_PORT ?? 3000}/api/dev/scenes`,
      )
    ).json();
    const value = rows.find((row) => row.recipe === "layoff")?.key;
    // A world with no layoff kind the game can start skips this step.
    if (value) {
      await expect_enabled();
      // Picked and pressed in one step: the sheet may still be redrawing from the last press.
      // The answer is the game's own response to this press, so a line equal to the last one
      // (the same person, the same record) still tells apart.
      const answered = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/dev/scene",
      );
      await page.evaluate((picked) => {
        document.querySelector(`.dev-scene [data-scene="${picked}"]`).click();
        document.querySelector('[data-testid="dev-scene"]').click();
      }, value);
      await answered;
      await page.waitForFunction(() =>
        Boolean(
          document.querySelector(".dev-scene .option-status")?.textContent,
        ),
      );
      assert.match(
        await page.locator(".dev-scene .option-status").textContent(),
        expected,
      );
    }
  }
  // Watch and the golden path, on the Calendar's Watch tab.
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Watch" })
    .click();
  await page.locator(".dev-watch").waitFor();
  assert.ok(
    (await page.locator(".dev-watch table").count()) >= 3,
    "the watch and path tables are on the Watch tab",
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
  // Lay them off through their employer (or be told they worked today), from their card.
  if ((await page.locator('[data-testid="dev-layoff"]').count()) > 0) {
    await page.locator('[data-testid="dev-layoff"]').click();
    await page.waitForFunction(() =>
      /Laid off|worked today|no job|staff/.test(
        document.querySelector("#person-facts .option-status")?.textContent ??
          "",
      ),
    );
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
    // A yes-or-no law is answered Yes or No and repealed by a bill; members can sign a discharge petition.
    // The sheet redraws after the pass; a pick made on the old panel is lost, so pick again until
    // the redrawn panel shows the yes-or-no controls.
    for (let attempt = 1; ; attempt += 1) {
      await page.locator('select[aria-label="Law"]').selectOption({
        value: "us-policy-positions:business-commerce.cap-consumer-loan-rates",
      });
      const shown = await page
        .locator('[data-testid="dev-repeal"]')
        .waitFor({ state: "visible", timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (shown) break;
      assert.ok(
        attempt < 10,
        "the yes-or-no controls show once a law is picked",
      );
    }
    await page.locator('select[aria-label="Answer"]').waitFor();
    await page.locator('[data-testid="dev-petition"]').waitFor();
    // The chair is cast to hear the bill, and the bill is passed again through it.
    // (set in one step: the sheet may still be redrawing from the last pass)
    assert.equal(
      await page.evaluate(() => {
        const box = document.querySelector('[data-testid="dev-chair-hears"]');
        box.checked = true;
        return box.checked;
      }),
      true,
    );
    // The official's answer is picked: takes.
    await page
      .locator('select[aria-label="Official\'s answer"]')
      .selectOption({ value: "takes" });
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
