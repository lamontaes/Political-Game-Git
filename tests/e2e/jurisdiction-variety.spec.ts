import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";
import {
  TEST_JURISDICTIONS,
  chamberKeyFor,
  legislativeOfficeKey,
} from "./support/jurisdictions";

/**
 * The game is not Kentucky-shaped, and this is what proves it.
 *
 * The browser suite had settled on one town: Kentucky was named in 121 of its
 * explicit state choices and Lexington in 122 of its place choices, and the
 * shared route into a legislative seat asked for
 * `us-ky-general-assembly-v1:house` by its literal key. Nothing was wrong with
 * any one of those cases; together they meant a suite that could go green
 * while the rest of the country was broken, and a route that named a Kentucky
 * house seat could not have run in Nevada, whose lower chamber is an Assembly,
 * or in Nebraska, which has one chamber and calls it the Legislature.
 *
 * So this walks the ordinary creator into a different state each time and
 * reads back what that state's own campaign browser offers. It is deliberately
 * cheap: it stops at the offices on offer rather than running a campaign,
 * because what it is here to catch is a jurisdiction the game cannot describe
 * at all, and that shows up the moment the browser is drawn.
 */
test.setTimeout(120_000);

for (const jurisdiction of TEST_JURISDICTIONS) {
  test(`a life in ${jurisdiction.name} stands for its own legislature`, async ({
    page,
  }) => {
    await page.goto(
      `/?seed=jurisdiction-variety-${jurisdiction.placeKey.toLowerCase()}`,
    );
    await startLife(page, {
      age: 40,
      route: "normal",
      place: jurisdiction.place,
      state: jurisdiction.state,
    });
    await enterLife(page);

    // The life really is where it was asked to be, in the corner the player
    // reads it from, before anything is claimed about its legislature.
    await expect(page.getByTestId("shell-nav-cluster")).toHaveAttribute(
      "aria-label",
      new RegExp(`${jurisdiction.place}, ${jurisdiction.state}`),
    );

    await goTo(page, "elsewhere-campaign");
    const browser = page.getByTestId("campaign-office-browser");
    // Either the campaign surface is there, or it is withheld with a reason
    // in its place. Both are real states of this screen.
    const withheld = page.getByTestId("no-campaign");
    await expect(
      page.getByTestId("campaign-section").or(withheld).first(),
    ).toBeVisible();

    /*
     * What the game really does here, not what it ought to.
     *
     * Running this set the first time showed the country is not uniformly
     * playable on the January 5, 2026 start date: four of these nine states
     * refuse an ordinary forty-year-old a candidacy, for three different
     * reasons, and Ohio's refusal is the only one a player could act on.
     * Recording each state's own behaviour keeps those findings named and
     * visible, and keeps this file honest: a state that starts working fails
     * here and gets promoted, and a state that stops working fails too.
     * Relaxing the rules that produce these refusals to make the file green
     * would be weakening a contract to protect a test.
     */
    if (jurisdiction.candidacy.kind === "no-seats") {
      await expect(
        browser,
        `${jurisdiction.name} now offers seats; record it as "stands"`,
      ).toHaveCount(0);
      // A refusal has to say why. A blank surface would be the worse bug.
      await expect(
        withheld.or(page.getByTestId("campaign-unavailable")).first(),
      ).toContainText(jurisdiction.candidacy.because);
      return;
    }

    await expect(browser).toBeVisible();

    const offered = await browser
      .locator('input[name="campaign-office"]')
      .evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value),
      );

    // Every chamber this state's rule pack carries is on offer, under this
    // state's own pack — not another state's, and not a generic stand-in.
    for (const chamber of jurisdiction.chamberKeys) {
      expect(
        offered,
        `${jurisdiction.name} did not offer its ${chamber}`,
      ).toContain(`${jurisdiction.packId}:${chamber}`);
    }
    for (const key of offered) {
      if (!key.includes(":")) continue;
      const [packId] = key.split(":");
      if (packId?.startsWith("us-") && packId.endsWith("-v1")) {
        expect(
          packId,
          `${jurisdiction.name} was offered a seat from ${packId}`,
        ).toBe(jurisdiction.packId);
      }
    }

    // And the seat a caller means by "the lower chamber" is selectable here
    // under whatever this state calls it.
    const lower = browser.locator(
      `input[value="${legislativeOfficeKey(jurisdiction, "lower")}"]`,
    );
    await lower.press("Space");
    await expect(lower).toBeChecked();

    if (jurisdiction.candidacy.kind === "cannot-file") {
      await expect(
        page.getByTestId("file-candidacy"),
        `${jurisdiction.name} can file now; record it as "stands"`,
      ).toHaveCount(0);
      await expect(browser).toContainText(jurisdiction.candidacy.because);
      return;
    }

    await expect(page.getByTestId("file-candidacy")).toBeEnabled();
  });
}

test("the set covers a unicameral legislature and a chamber that is not a House", async () => {
  const unicameral = TEST_JURISDICTIONS.filter(
    (entry) => entry.chamberKeys.length === 1,
  );
  expect(unicameral.map((entry) => entry.name)).toContain("Omaha, Nebraska");

  const notAHouse = TEST_JURISDICTIONS.filter(
    (entry) => chamberKeyFor(entry, "lower") !== "house",
  );
  expect(notAHouse.map((entry) => entry.name)).toContain("Reno, Nevada");

  // One state per entry: a set that drifts into two towns in the same state
  // is testing the same legislature twice and reads as broader than it is.
  expect(
    new Set(TEST_JURISDICTIONS.map((entry) => entry.state)).size,
    "two entries share a state",
  ).toBe(TEST_JURISDICTIONS.length);

  // The set is only worth running if some of it actually reaches a ballot.
  const standing = TEST_JURISDICTIONS.filter(
    (entry) => entry.candidacy.kind === "stands",
  );
  expect(standing.length).toBeGreaterThanOrEqual(3);
  expect(
    standing.some((entry) => chamberKeyFor(entry, "lower") !== "house"),
    "no state that can stand has a lower chamber that is not a House",
  ).toBe(true);
});
