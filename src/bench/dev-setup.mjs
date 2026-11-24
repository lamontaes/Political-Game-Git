/* global document, URL */
// Browser-check helpers that set a campaign up through dev mode's controls on the game's own screens
// (Options, then the Calendar): a seat the player may file for, money in a campaign, volunteers who
// say yes. Each click drives the game's own code (the world's days, the campaign day's raise-money
// choice, the volunteer ask's decision), never a written fact. The checks that need a precondition
// call these instead of depending on what the drawn player happens to have.

const route = (name) => (response) =>
  new URL(response.url()).pathname === `/api/dev/${name}`;

/** Dev mode on, from Options. */
export async function devModeOn(page) {
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  await page.locator("#sheet-close").click();
}

/** Dev mode off, from Options: the screens a player sees. */
export async function devModeOff(page) {
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Off", exact: true }).last().click();
  await page.locator("#sheet-close").click();
}

/** The Calendar, where the dev panels sit. */
async function calendar(page) {
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator('[data-testid="dev-run"]').waitFor();
}

/** Run the world until a seat the player may file for has its filing window open; returns what stopped it. */
export async function devRunUntilMayFile(page) {
  await calendar(page);
  const done = page.waitForResponse(route("run-until"), { timeout: 600000 });
  await page.evaluate(() => {
    // The panel's own cap (three years) holds for a player not yet old enough to file.
    document.querySelector('[data-testid="dev-until-may-file"]').click();
    document.querySelector('[data-testid="dev-run"]').click();
  });
  const out = await (await done).json();
  await page.locator("#sheet-close").click();
  return out;
}

/** Donors give to the player's campaign (the campaign day's own raise-money choice); returns the result line. */
export async function devDonorsGive(page) {
  await calendar(page);
  await page.locator('[data-testid="dev-donors-give"]').waitFor();
  const done = page.waitForResponse(route("raise-money"), { timeout: 600000 });
  await page.evaluate(() =>
    document.querySelector('[data-testid="dev-donors-give"]').click(),
  );
  const out = await (await done).json();
  await page.locator("#sheet-close").click();
  return out;
}

/** Every person the volunteer ask reaches is cast yes; returns how many. */
export async function devEveryoneSaysYes(page) {
  await calendar(page);
  await page.locator('[data-testid="dev-volunteer-yes"]').waitFor();
  const people = await page.evaluate(() =>
    [...document.querySelectorAll(".dev-campaign select")[1].options].map(
      (o) => o.value,
    ),
  );
  for (const person of people) {
    // The panel is drawn again once the screens refresh after a pick: the next pick waits for that new one.
    const panel = await page.locator(".dev-campaign").elementHandle();
    const done = page.waitForResponse(route("volunteer-cast"));
    await page.evaluate((id) => {
      const pick = document.querySelectorAll(".dev-campaign select")[1];
      pick.value = id;
      document.querySelector('[data-testid="dev-volunteer-yes"]').click();
    }, person);
    await done;
    await page.waitForFunction(
      (old) => document.querySelector(".dev-campaign") !== old,
      panel,
    );
  }
  await page.locator("#sheet-close").click();
  return people.length;
}
