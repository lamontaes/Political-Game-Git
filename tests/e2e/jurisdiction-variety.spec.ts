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

/**
 * States where an ordinary 2026-01-05 life is refused a candidacy today.
 *
 * This is a recorded finding, not a tolerance. Running this set the first time
 * showed five of the nine states draw no office browser at all: the eligibility
 * layer reads the constitutional provision that establishes the seat, sees it
 * was observed in source in September 2026, and refuses to apply it to a world
 * standing on January 5, 2026 — for instance Nebraska's
 *
 *   "Neb. Const. art. III, § 8 was observed in current source text on
 *    2026-09-09; that later observation does not establish the rule on
 *    2026-01-05."
 *
 * The provenance rule itself is right, and quietly relaxing it to make this
 * file green would be weakening a contract to protect a test. The rule packs
 * for these states do carry their chambers — `candidacyAuthority` returns
 * them — so what is missing is source observed at or before the world's own
 * start date, which is corpus work in another lane, not a test fix.
 *
 * So the set is named here and asserted in both directions. A state that
 * starts offering its seats fails this file (delete it from the set, and the
 * ordinary assertions below take over). A state that stops offering them
 * fails too. Either way the change is deliberate and visible, rather than a
 * jurisdiction going dark unnoticed.
 */
const REFUSED_BY_LATER_SOURCE: ReadonlySet<string> = new Set([
  "Omaha, Nebraska",
  "Anchorage, Alaska",
  "Minneapolis, Minnesota",
  "Baltimore, Maryland",
  "Columbus, Ohio",
]);

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
    const refusal = page.getByTestId("campaign-unavailable");
    await expect(browser.or(refusal).first()).toBeVisible();

    if (REFUSED_BY_LATER_SOURCE.has(jurisdiction.name)) {
      await expect(
        browser,
        `${jurisdiction.name} now offers offices; take it out of REFUSED_BY_LATER_SOURCE`,
      ).toHaveCount(0);
      // The refusal has to say why, in the shape of the provenance rule. A
      // blank surface, or a vague "not available here", would be the failure
      // this case exists to catch.
      await expect(refusal).toContainText(
        /observed in .*source.* on 20\d\d-\d\d-\d\d; that later observation does not establish/,
      );
      await expect(refusal).toContainText("2026-01-05");
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

  // Whatever the refusal set holds, the states that DO run have to keep
  // covering the shapes this file is here for, or the varied-jurisdiction
  // coverage has quietly collapsed back to one kind of place.
  const running = TEST_JURISDICTIONS.filter(
    (entry) => !REFUSED_BY_LATER_SOURCE.has(entry.name),
  );
  expect(running.length).toBeGreaterThanOrEqual(3);
  expect(
    running.some((entry) => chamberKeyFor(entry, "lower") !== "house"),
    "no runnable state has a lower chamber that is not a House",
  ).toBe(true);
  expect(
    new Set(running.map((entry) => entry.state)).size,
    "runnable states are not distinct",
  ).toBe(running.length);

  // Every named refusal is a real entry in the table.
  for (const name of REFUSED_BY_LATER_SOURCE) {
    expect(
      TEST_JURISDICTIONS.map((entry) => entry.name),
      `${name} is in the refusal set but not in the table`,
    ).toContain(name);
  }
});
