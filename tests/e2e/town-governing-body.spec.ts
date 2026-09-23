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
 * Standing for the town's own governing body, in a town the game has read in
 * depth and one it has not.
 *
 * Before this, a life in a small town could stand for the state legislature
 * or the governorship and for nothing in the town itself, because no town in
 * America carried an office of its own. The screen claims settled here are the
 * ones a unit test cannot settle: the town's body is on the office list beside
 * the state's, filing for it opens a campaign in that name, the election is
 * decided in the ordinary way, and the life carries on afterwards — with the
 * seat on the office screen when it is won.
 */

const TOWNS = [
  // A town the game has never read in depth: seated in the government the
  // Census listing records, given typical seats and terms, and told so.
  {
    key: "2360825",
    town: "Presque Isle",
    state: "Maine",
    government: "City of Presque Isle",
    seated: "You sit on the governing body of City of Presque Isle",
    rules: "The game has not read how this body is made up",
    cityScreen: false,
  },
  // A town the game has read in depth: seated in its own compiled government,
  // whose own rules give the body's size and term, and whose city screen then
  // shows the seat.
  {
    key: "2302795",
    town: "Bangor",
    state: "Maine",
    government: "City of Bangor",
    seated: "You sit on the",
    rules: "By the town's own rules the body has",
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
  test(`${town.town}, ${town.state}: the town's own governing body is a race a life can run and win`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const body = localGoverningBodiesForJurisdiction(
      lifePlaceByKey(town.key)!.context.jurisdiction.id,
    )[0]!;

    await page.goto("/");
    await startLife(page, { age: 34, state: town.state, place: town.town });
    await enterLife(page);
    await openElsewhere(page, "campaign");
    await expect(page.getByTestId("work-section-campaign")).toBeVisible();

    const browser = page.getByTestId("campaign-office-browser");
    await expect(
      browser.locator(`input[value="${body.officeKey}"]`),
    ).toHaveCount(1);
    // The state's own race is still offered on the same screen. In Maine the
    // legislature is not on the office list yet, so the governorship is what
    // stands beside the town's body.
    await expect(
      page.getByRole("heading", { name: "The state's top office" }),
    ).toBeVisible();
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
    await expect(page.getByTestId("town-seat-rules")).toContainText(town.rules);
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

    // The race being over does not close the office: picking it again offers
    // the next filing, as it did before the first. (Found in Ely, Minnesota,
    // where no second race could ever be filed.)
    await openElsewhere(page, "campaign");
    await page
      .getByTestId("campaign-office-browser")
      .locator(`input[value="${body.officeKey}"]`)
      .check();
    await expect(page.getByTestId("file-candidacy")).toBeEnabled();
  });
}

// A town whose voters elect its mayor. Presque Isle's own charter has not been
// read, so the mayor's race and term are the typical ones, and the office
// screen says so.
test("Presque Isle, Maine: the town's mayor is a race a life can run and win", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const mayor = localGoverningBodiesForJurisdiction(
    lifePlaceByKey("2360825")!.context.jurisdiction.id,
  ).find((office) => office.seat === "chief-executive")!;

  await page.goto("/");
  await startLife(page, { age: 34, state: "Maine", place: "Presque Isle" });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  const browser = page.getByTestId("campaign-office-browser");
  await expect(browser).toContainText(
    "Filing rechecks them.Upcoming election timing is not established in this save.MayorCity of Presque Isle",
  );

  await fileCandidacy(page, mayor.officeKey);
  await expect(page.getByTestId("campaign-band")).toContainText(
    " for Mayor · ",
  );

  expect(await campaignUntilDecided(page, passDay, 45)).toBe(true);
  const result = (
    await page.getByTestId("campaign-result").innerText()
  ).replace(/\s+/g, " ");
  console.log(`\n==== Presque Isle mayor result ====\n${result}\n`);
  expect(result).toMatch(/ won\./);

  await openElsewhere(page, "work");
  const seat = page.getByTestId("town-seat");
  await expect(seat).toContainText(
    "You have been Mayor, City of Presque Isle, since",
  );
  await expect(page.getByTestId("town-seat-rules")).toContainText(
    "The game has not read how long this town's mayor serves",
  );
  console.log(
    `---- Your office ----\n${(await seat.innerText()).replace(/\s+/g, " ")}\n`,
  );
});
