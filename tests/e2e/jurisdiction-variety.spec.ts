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
});
