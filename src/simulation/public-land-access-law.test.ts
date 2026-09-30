import { describe, expect, it } from "vitest";
import { townRoster } from "./living-world/town-residents";
import { createProductionPolicyCatalog } from "./production-catalog";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { makeIsoDate } from "./dates";
import {
  PUBLIC_LAND_ACCESS_QUESTION,
  nearbyPublicLandAcres,
  publicLandAcres,
  publicLandManagementSpending,
  publicLandVisitorSales,
} from "./public-land-access-law";
import type { World } from "./types";
import type { PublicBudgetGovernment } from "./public-budgets/store";
const catalog = createProductionPolicyCatalog();
const proposition = Object.values(catalog.propositions).find(
  (p) => p.stableKey === PUBLIC_LAND_ACCESS_QUESTION,
)!;
function fixture(stateKey: string, answer: "yes" | "no" = "yes") {
  const state = stateJurisdictionForKey(stateKey)!;
  const town =
    searchLifePlaces("", 5000, { stateJurisdictionKey: stateKey }).find(
      (p) =>
        p.scope !== "state" &&
        townRoster(p.context.jurisdiction.id).population > 0,
    )?.context.jurisdiction ?? state;
  const world = {
    seed: "land-model-geography",
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: catalog,
    jurisdictions: { [state.id]: state, [town.id]: town },
    history: {
      nextSequence: 3,
      events: [],
      legislativeMeasures: [
        {
          id: "measure_land",
          jurisdictionId: state.id,
          propositionIds: [proposition.id],
          propositionAnswers: [{ propositionId: proposition.id, answer }],
          policyTerms: [
            {
              questionKey: PUBLIC_LAND_ACCESS_QUESTION,
              values: {
                accessIncreaseBasisPoints: 1000,
                annualManagementCostPerAcreCents: 3524,
              },
              reason: "Filed access and management proposal.",
              principleRecordIds: [],
            },
          ],
        },
      ],
      legislativeEnactments: [
        {
          id: "enactment_land",
          measureId: "measure_land",
          resolvedAt: "2026-01-01",
          effectiveAt: "2026-01-01",
          outcome: "enacted",
          sequence: 2,
        },
      ],
    },
  } as unknown as World;
  const government = {
    level: "state",
    stateKey,
    population: 1000,
    lawJurisdictionId: state.id,
  } as PublicBudgetGovernment;
  return { world, government, town: town.id };
}
describe("public-land access reaches visitor demand and management costs", () => {
  it("uses one rule in all 56 places, with named estimates where the source has no coverage", () => {
    expect(lifePlaceStateIdentities()).toHaveLength(56);
    for (const place of lifePlaceStateIdentities()) {
      const { world, government, town } = fixture(place.jurisdictionKey);
      expect(publicLandAcres(place.jurisdictionKey, 1000)).toBeGreaterThan(0);
      expect(
        publicLandManagementSpending(world, government, world.currentDate),
      ).toBeGreaterThan(0);
      expect(
        publicLandVisitorSales(world, town, "restaurant"),
        place.jurisdictionKey,
      ).toBeGreaterThan(0);
    }
  });
  it("reads saved bill terms, keeps geography stable, and removes the demand on repeal", () => {
    const yes = fixture("US-NH");
    const no = fixture("US-NH", "no");
    expect(nearbyPublicLandAcres(yes.world, yes.town)).toBe(
      nearbyPublicLandAcres(yes.world, yes.town),
    );
    expect(publicLandVisitorSales(no.world, no.town, "restaurant")).toBe(0);
    const stateKey = "US-NH";
    const opening = {
      parkVisitsPerAcre: 40,
      parkVisitorSpendingCents: 8000,
      libraryStaffHourlyCents: 3282,
    };
    const saved = {
      ...yes.world,
      openingLawEstimates: { [stateKey]: opening },
    };
    const doubled = {
      ...saved,
      openingLawEstimates: {
        [stateKey]: { ...opening, parkVisitsPerAcre: 80 },
      },
    };
    expect(publicLandVisitorSales(doubled, yes.town, "restaurant")).toBeCloseTo(
      2 * publicLandVisitorSales(saved, yes.town, "restaurant"),
      1,
    );
    expect(
      publicLandManagementSpending(
        doubled,
        yes.government,
        doubled.currentDate,
      ),
    ).toBe(
      publicLandManagementSpending(saved, yes.government, saved.currentDate),
    );
    expect(
      publicLandManagementSpending(
        no.world,
        no.government,
        no.world.currentDate,
      ),
    ).toBe(0);
    expect(publicLandVisitorSales(yes.world, yes.town, "hospital")).toBe(0);
    expect(
      publicLandManagementSpending(
        yes.world,
        { ...yes.government, level: "city" },
        yes.world.currentDate,
      ),
    ).toBe(0);
  });
  it("does not spend before the recorded operative date", () => {
    const { world, government, town } = fixture("US-NH");
    const earlier = { ...world, currentDate: makeIsoDate("2025-12-31") };
    expect(publicLandVisitorSales(earlier, town, "restaurant")).toBe(0);
    expect(
      publicLandManagementSpending(earlier, government, earlier.currentDate),
    ).toBe(0);
  });
});
