/* global process, console, URL, document */
// The creator's first screen and its one Random (owner, Nov 16 and 17; #9995):
//   - no person and no look before a gender is picked;
//   - the birthday opens on age 18, the youngest a life may begin at;
//   - once a gender is picked the person appears, and skin and colors are swatches while hair,
//     facial hair and the top are pictures, never arrows;
//   - one Random draws the whole character (gender, name, birthday, place, look) and nothing
//     else on the screen is a second Random for the name or the birthday.
// Run against a fresh bench: node src/bench/creator-gender-first.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  // Before a gender: no person, no look, and the one column only.
  assert.equal(await page.locator("#cr-bust .bust-stack").count(), 0);
  assert.ok(
    await page.locator("#cr-look-col").isHidden(),
    "the look is shown before a gender",
  );
  assert.equal(await page.locator("#cr-given").inputValue(), "");
  // Age 18 unless picked.
  const year = (
    await page.locator("#cr-year option:checked").innerText()
  ).trim();
  assert.match(year, /\(age 18\)$/, `the birthday opens on ${year}`);
  if (shots)
    await page.screenshot({
      path: `${shots}/creator-before-gender-1440x900.png`,
    });
  // One Random only: none for the name, the birthday or the look.
  for (const gone of [
    "#cr-random-name",
    "#cr-random-birthday",
    "#cr-randomize",
  ])
    assert.equal(await page.locator(gone).count(), 0, `${gone} is still there`);

  // A gender brings the person and the look: swatches and pictures, never arrows.
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-bust .bust-stack").waitFor();
  await page
    .locator("[data-testid=engine-appearance-hair] .pick-picture")
    .first()
    .waitFor();
  assert.ok(await page.locator("#cr-look-col").isVisible());
  for (const row of ["skin", "hair-color"])
    assert.ok(
      (await page
        .locator(`[data-testid=engine-appearance-${row}] .swatch-button`)
        .count()) > 1,
      `${row} is not swatches`,
    );
  for (const row of ["hair", "top"])
    assert.ok(
      (await page
        .locator(`[data-testid=engine-appearance-${row}] .pick-picture`)
        .count()) > 1,
      `${row} is not pictures`,
    );
  assert.equal(
    await page.locator("#cr-rows .look-row .action").count(),
    0,
    "a look row still has arrows",
  );
  // Picking a hair picture changes the bust.
  const layers = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("#cr-bust .bust-stack img")]
        .map((i) => new URL(i.src).pathname)
        .join(),
    );
  const before = await layers();
  await page
    .locator(
      "[data-testid=engine-appearance-hair] .pick-picture[aria-pressed=false]",
    )
    .first()
    .click();
  await page.waitForFunction(
    (was) =>
      [...document.querySelectorAll("#cr-bust .bust-stack img")]
        .map((i) => new URL(i.src).pathname)
        .join() !== was,
    before,
  );
  if (shots)
    await page.screenshot({
      path: `${shots}/creator-after-gender-1440x900.png`,
    });

  // Random: gender, name, birthday, place and look all at once, and different on the next press.
  const draw = async () => {
    const answered = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/creator/character",
    );
    await page.locator("#cr-random").click();
    return await (await answered).json();
  };
  const first = await draw();
  await page.locator("#cr-bust .bust-stack").waitFor();
  assert.equal(
    await page.locator("#cr-given").inputValue(),
    first.name.givenName,
  );
  assert.equal(
    await page.locator("#cr-family").inputValue(),
    first.name.familyName,
  );
  assert.equal(
    await page
      .locator(`[data-gender=${first.gender}]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator("#cr-month").inputValue(),
    String(first.birthday.month),
  );
  assert.equal(
    await page.locator("#cr-year").inputValue(),
    String(first.birthday.year),
  );
  assert.match(
    await page.locator("#cr-place-summary-name").innerText(),
    new RegExp(first.place.state.name),
  );
  const second = await draw();
  assert.notDeepEqual(
    [second.name, second.birthday, second.place.town.key],
    [first.name, first.birthday, first.place.town.key],
    "a second Random drew the same character",
  );
  if (shots)
    await page.screenshot({ path: `${shots}/creator-random-1440x900.png` });
  // Begin works on a randomized character.
  assert.ok(await page.locator("#cr-begin").isEnabled());
  assert.deepEqual(errors, []);
  console.log("creator-gender-first: ok");
} finally {
  await browser.close();
}
