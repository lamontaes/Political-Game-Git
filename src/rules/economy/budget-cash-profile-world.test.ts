import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { budgetCandidates as nativeCandidates } from "../../simulation/public-budgets/opening";
import { researchedPublicCashOpeningProfile as native } from "../../simulation/public-budgets/opening-cash-profile";
import { municipalGovernments } from "../../simulation/municipal-government";
import { lifePlaceByKey } from "../../simulation/life-places";
import { US_STATE_USPS } from "../../simulation/nationwide-world/state-executive-candidacy-packs";
import { canonicalStateJurisdictionId } from "../../simulation/state-jurisdiction-id";
import { PUBLIC_CASH_OPENING_PROFILE_VERSION } from "../../simulation/world-setup/types";
import federal from "../../../data/research/money/federal-budget-fy2025.json";
import { budgetFacts } from "./test-support/budget-facts";
import {
  researchedPublicCashOpeningProfile,
  type PublicCashProfileFacts,
} from "./budget-cash-profile";
import type { World } from "../../simulation/types";
function facts(world: World): PublicCashProfileFacts {
  const governments = municipalGovernments();
  const ids = [
    ...nativeCandidates(world).candidates.map((x) => x.jurisdictionId),
    ...governments.flatMap((x) =>
      x.placeGeoid
        ? [lifePlaceByKey(x.placeGeoid)?.context.jurisdiction.id].filter(
            (x) => x !== undefined,
          )
        : [],
    ),
  ];
  return {
    onDate: world.currentDate,
    opening: budgetFacts(world, ids, [world.currentDate]),
    municipalGovernments: governments,
    stateUsps: US_STATE_USPS,
    stateIds: new Map(
      US_STATE_USPS.map((usps) => [
        usps,
        canonicalStateJurisdictionId("US-" + usps),
      ]),
    ),
    federalOutlays: federal.outlaysTotal,
    contractVersion: PUBLIC_CASH_OPENING_PROFILE_VERSION,
  };
}
describe("complete public opening cash source aggregation through native public owner", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const fixture = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:cash-profile:" + usps,
      });
      const own = researchedPublicCashOpeningProfile(facts(fixture.world));
      expect(own).toEqual(native(fixture.world));
      expect(Object.keys(own.stateByJurisdictionId)).toHaveLength(50);
      expect(own.federalMinorUnits).toBeGreaterThan(0);
      expect(own.localMinorUnits).toBeGreaterThan(0);
    });
});
