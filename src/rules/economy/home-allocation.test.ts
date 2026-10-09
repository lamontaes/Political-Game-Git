import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import {
  homeForNewHousehold,
  TOWN_HOME_PRICE_FACTOR,
  TOWN_TENURE_KINDS,
} from "../../simulation/living-world/town-homes";
import { homeForHouseholdFromFacts } from "./home-allocation";

const places = lifePlaceStateIdentities();
const priceFactors = TOWN_HOME_PRICE_FACTOR as Readonly<Record<string, number>>;

describe("new household home allocation rule", () => {
  it.each(places)(
    "matches legacy kind and tenure selection in $jurisdictionKey",
    (place) => {
      const index = places.indexOf(place);
      const household = {
        members: Array.from({ length: 1 + (index % 6) }, (_, member) => ({
          age: 18 + index + member,
        })),
      };
      const working = index % 5 !== 0;
      const payMinor = 280_000 + index * 8_000;
      const paymentMinor = 70_000 + index * 2_500;
      const mayBorrow = index % 4 !== 0;
      const farm = index % 2 === 0;
      const expected = homeForNewHousehold(
        household,
        working,
        payMinor,
        paymentMinor,
        mayBorrow,
        farm,
      );

      expect(
        homeForHouseholdFromFacts({
          householdAges: household.members.map((member) => member.age),
          working,
          payMinor,
          paymentMinor,
          mayBorrow,
          farm,
          homePriceFactorByKind: priceFactors,
          tenureKinds: TOWN_TENURE_KINDS,
        }),
      ).toEqual(expected);
    },
  );

  it("keeps an empty household in a rental apartment and requires selected prices to carry a purchase", () => {
    const facts = {
      householdAges: [],
      working: true,
      payMinor: 1,
      paymentMinor: 1,
      homePriceFactorByKind: priceFactors,
      tenureKinds: TOWN_TENURE_KINDS,
    };
    expect(homeForHouseholdFromFacts(facts)).toEqual(
      homeForNewHousehold({ members: [] }, true, 1, 1),
    );
  });
});
