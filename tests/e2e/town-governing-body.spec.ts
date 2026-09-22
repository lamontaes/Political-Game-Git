import { campaignUntilDecided, fileCandidacy } from "./support/campaign";
import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  goTo,
  openElsewhere,
  startLife,
  waitForClockIdle,
} from "./support/creator";
import {
  lifePlaceByKey,
  localGoverningBodiesForJurisdiction,
} from "../../src/simulation";

/**
 * Standing for the town's own governing body, in a town the game has never
 * read in depth.
 *
 * Before this, a life in Paducah could stand for the Kentucky legislature or
 * the governorship and for nothing in Paducah itself, because no town in
 * America carried an office of its own. The screen claims settled here are the
 * ones a unit test cannot settle: the town's body is on the office list beside
 * the state's, filing for it opens a campaign in that name, the election is
 * decided in the ordinary way, and the life carries on afterwards — with the
 * seat on the office screen when it is won.
 */

const TOWNS = [
  // A town the game has never read in depth: seated in the government the
  // Census listing records, and told plainly what is not yet known.
  {
    key: "2158836",
    town: "Paducah",
    government: "City of Paducah",
    seated: "You sit on the governing body of City of Paducah",
    cityScreen: false,
  },
  // A town the game has read in depth: seated in its own compiled government,
  // whose city screen then shows the seat.
  {
    key: "2108902",
    town: "Bowling Green",
    government: "City of Bowling Green",
    seated: "You sit on the Board of Commissioners of",
    cityScreen: true,
  },
] as const;

async function passDay(page: Page) {
  const control = page.getByTestId("shell-pass-day");
  await expect(control).not.toHaveAttribute("aria-busy", "true");
  await waitForClockIdle(page);
  await control.click();
  await expect(control).not.toHaveAttribute("aria-busy", "true");
  await waitForClockIdle(page);
}

for (const town of TOWNS) {
  test(`${town.town}, Kentucky: the town's own governing body is a race a life can run and win`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const body = localGoverningBodiesForJurisdiction(
      lifePlaceByKey(town.key)!.context.jurisdiction.id,
    )[0]!;

    await page.goto("/");
    await startLife(page, { age: 34, state: "Kentucky", place: town.town });
    await enterLife(page);
    await openElsewhere(page, "campaign");
    await expect(page.getByTestId("work-section-campaign")).toBeVisible();

    const browser = page.getByTestId("campaign-office-browser");
    await expect(
      browser.locator(`input[value="${body.officeKey}"]`),
    ).toHaveCount(1);
    // The state's seats are still offered beside it.
    await expect(
      browser.locator('input[value^="us-ky-general-assembly-v1:"]'),
    ).not.toHaveCount(0);
    await expect(browser).toContainText(
      `Local governmentMember of the governing body${town.government}`,
    );

    await fileCandidacy(page, body.officeKey);
    await expect(page.getByTestId("campaign-band")).toContainText(
      `${town.government} governing body`,
    );

    expect(await campaignUntilDecided(page, passDay, 45)).toBe(true);
    const result = (
      await page.getByTestId("campaign-result").innerText()
    ).replace(/\s+/g, " ");
    console.log(`\n==== ${town.town} result ====\n${result}\n`);
    // This walk's seed wins on election day. If it stops winning, the seed or
    // the campaign odds changed, and this test should be re-seeded rather
    // than loosened into accepting either outcome.
    expect(result).toMatch(/ won\./);

    await openElsewhere(page, "work");
    const seat = page.getByTestId("town-seat");
    await expect(seat).toContainText(town.seated);
    await expect(page.getByTestId("no-office")).toHaveCount(0);
    console.log(
      `---- Your office ----\n${(await seat.innerText()).replace(/\s+/g, " ")}\n`,
    );

    if (town.cityScreen) {
      await goTo(page, "nav-municipal");
      const standing = page.getByTestId("municipal-standing");
      await expect(standing).toContainText("Seat: Elected");
      console.log(
        `---- City screen ----\n${(await standing.innerText()).replace(/\s+/g, " ")}\n`,
      );
    }
  });
}
