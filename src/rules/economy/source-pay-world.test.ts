import { describe, it, expect } from "vitest";
import programs from "../../../data/research/money/public-programs-2026.json";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import {
  countyLandSharesForPlace,
  countyGeoidsForPlace,
} from "../../simulation/government-units";
import { placeReferencePopulation } from "../../simulation/nationwide-world/place-population";
import {
  COUNTY_BUSINESS_ROWS,
  STATE_BUSINESS_ROWS,
  SALES_PER_EMPLOYEE_ROWS,
  LOCAL_BUSINESS_COUNT_KINDS,
} from "../../simulation/local-business-counts.generated";
import {
  PLACE_COUNTY_RELATIONS_ROWS,
  PLACE_COUNTY_RELATIONS_META,
} from "../../simulation/place-county-relations.generated";
import { NATIONAL_PLACES_ROWS } from "../../simulation/national-places.generated";
import { COUNTY_HOME_VALUE_ROWS } from "../../simulation/county-home-value.generated";
import { LIVING_COSTS_CATEGORY_DATA } from "../../simulation/living-costs-category-data";
import { livingCostsRegionForState } from "../../simulation/living-costs-data";
import { localBusinessSupplyFor as nativeSupply } from "../../simulation/local-business-counts";
import { homeValueForJurisdiction as nativeHome } from "../../simulation/county-home-value";
import * as nativePoverty from "../../simulation/household-pay";
import { estimatedMonthlyHouseholdLivingCosts as nativeLiving } from "../../simulation/living-costs-data";
import { recordedWorkAnnualPay as nativePay } from "../../simulation/recorded-work-pay";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import { createWorkCompensation, money } from "../../simulation/resources";
import { workRoleAt, workStatusAt } from "../../simulation/life-queries";
import { resourceFlowTermsAt } from "../../simulation/resource-queries";
import {
  localBusinessSupplyFor,
  type BusinessSupplyFacts,
} from "./business-supply";
import { homeValueForJurisdiction } from "./county-home-values";
import {
  annualPovertyLineMinor,
  annualizedRecordedPayMinor,
  type PovertyFacts,
} from "./household-pay-math";
import { estimatedMonthlyHouseholdLivingCosts } from "./living-cost-means";
import {
  recordedWorkAnnualPay,
  recordedPayReceiptKey,
  type RecordedPayFacts,
} from "./recorded-pay";
import type { World } from "../../simulation/types";
const populations = new Map<
  string,
  ReturnType<typeof placeReferencePopulation>
>();
for (const [geoid] of JSON.parse(NATIONAL_PLACES_ROWS) as readonly (readonly [
  string,
  ...unknown[],
])[])
  populations.set(geoid, placeReferencePopulation(geoid));
const guidelines = Object.entries(programs.federal.povertyGuidelines)
  .flatMap(([year, row]) =>
    /^\d{4}$/.test(year) &&
    typeof row === "object" &&
    row !== null &&
    "value" in row
      ? [[Number(year), row.value] as const]
      : [],
  )
  .sort((a, b) => a[0] - b[0]) as unknown as PovertyFacts["guidelines"];
const poverty: PovertyFacts = { guidelines, stateNames: STATES };
const provenance = {
  kind: "authored" as const,
  note: "Labeled saved employment edge; not spontaneous hiring or ordinary NPC pay.",
};
function payFacts(world: World): RecordedPayFacts {
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  return {
    onDate: world.currentDate,
    nextSequence: world.history.nextSequence,
    work: world.history.workRelationships,
    flows: world.history.resourceFlows,
    roles: new Map(
      world.history.workRelationships.map((w) => [
        recordedPayReceiptKey(w.id, cutoff),
        workRoleAt(world, w.id, cutoff) ?? null,
      ]),
    ),
    statuses: new Map(
      world.history.workRelationships.map((w) => [
        recordedPayReceiptKey(w.id, cutoff),
        workStatusAt(world, w.id, cutoff) ?? null,
      ]),
    ),
    terms: new Map(
      world.history.resourceFlows.map((f) => [
        recordedPayReceiptKey(f.id, cutoff),
        resourceFlowTermsAt(world, f.id, cutoff) ?? null,
      ]),
    ),
  };
}
describe("economy source selection and recorded-pay KEEP owners on native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: makeIsoDate("2026-01-05"),
        seed: "rules2:economy:sources:" + usps,
      });
      const ids = [base.jurisdictionId, base.stateJurisdictionId];
      const places = new Map(
        ids.map((id) => [id, lifePlaceByJurisdictionId(id)]),
      );
      const geoids = [...places.values()].flatMap((p) =>
        p?.sourceGeoid ? [p.sourceGeoid] : [],
      );
      const supply: BusinessSupplyFacts = {
        kinds: LOCAL_BUSINESS_COUNT_KINDS,
        countyRows: COUNTY_BUSINESS_ROWS,
        stateRows: STATE_BUSINESS_ROWS,
        salesRows: SALES_PER_EMPLOYEE_ROWS,
        countyRelationsRows: PLACE_COUNTY_RELATIONS_ROWS,
        nationalPlacesRows: NATIONAL_PLACES_ROWS,
        geographyAsOf: PLACE_COUNTY_RELATIONS_META.geographyAsOf,
        places,
        populations,
        landShares: new Map(
          geoids.map((g) => [g, countyLandSharesForPlace(g)]),
        ),
      };
      const home = {
        countyRows: COUNTY_HOME_VALUE_ROWS,
        places,
        countiesByGeoid: new Map(
          geoids.map((g) => [g, countyGeoidsForPlace(g)]),
        ),
      };
      for (const id of [...ids, null]) {
        expect(localBusinessSupplyFor(supply, id)).toEqual(nativeSupply(id));
        expect(homeValueForJurisdiction(home, id)).toEqual(nativeHome(id));
      }
      for (const date of [
        makeIsoDate("2000-01-01"),
        base.world.currentDate,
        makeIsoDate("2040-01-01"),
      ])
        for (const size of [0, 1, 1.5, 2, 5, 9])
          expect(
            annualPovertyLineMinor(poverty, "US-" + usps, size, date),
          ).toEqual(
            nativePoverty.annualPovertyLineMinor("US-" + usps, size, date),
          );
      for (const cadence of [
        "weekly",
        "schedule:biweekly",
        "schedule:semimonthly",
        "monthly",
        "annual",
        "unsupported",
      ])
        expect(annualizedRecordedPayMinor(12345, cadence)).toEqual(
          nativePoverty.annualizedRecordedPayMinor(12345, cadence),
        );
      const region = livingCostsRegionForState("US-" + usps);
      for (const size of [1, 2, 3, 4, 5, 8])
        expect(
          estimatedMonthlyHouseholdLivingCosts(
            { categories: LIVING_COSTS_CATEGORY_DATA },
            region,
            size,
          ),
        ).toEqual(nativeLiving(region, size));
      let world = createOrganization(base.world, {
        stableKey: "rules2:sources:employer",
        formedAt: base.world.currentDate,
        provenance,
        initialProfile: {
          name: "Authored saved compensation employer",
          classification: "sector:private",
          locationJurisdictionId: base.jurisdictionId,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      for (const [i, cadenceKind] of (
        [
          "schedule:weekly",
          "schedule:biweekly",
          "schedule:monthly",
          "schedule:annual",
        ] as const
      ).entries()) {
        const jurisdictionId =
          i % 2 ? base.stateJurisdictionId : base.jurisdictionId;
        world = createWorkRelationship(world, {
          stableKey: "rules2:sources:work:" + i,
          personId: base.personId,
          organizationId,
          startedAt: world.currentDate,
          kind: "employment:staff",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Authored saved role",
            occupationClassification: "profession:policy-analysis",
            locationJurisdictionId: jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: 20 + i, maximumHours: 40 },
              attention: "high",
              concurrency: "partly-concurrent",
              scheduleRigidity: "mixed",
              interruptibility: "limited",
              locationJurisdictionId: jurisdictionId,
            },
          },
        });
        world = createWorkCompensation(world, {
          stableKey: "rules2:sources:pay:" + i,
          workRelationshipId: world.history.workRelationships.at(-1)!.id,
          startsAt: world.currentDate,
          amount: money(125000 + i * 10000, "USD"),
          cadenceKind,
          restrictionKind: null,
          jurisdictionId,
          provenance,
        });
      }
      const facts = payFacts(world);
      for (const jurisdictionId of [...ids, null])
        for (const weeklyHours of [0, 20, 40])
          for (const excludeWorkId of [
            undefined,
            world.history.workRelationships[0]!.id,
          ]) {
            const input = {
              occupation: "profession:policy-analysis",
              workKind: "employment:staff",
              jurisdictionId,
              weeklyHours,
              excludeWorkId,
            };
            expect(recordedWorkAnnualPay(facts, input)).toEqual(
              nativePay(world, input),
            );
          }
      expect(
        recordedWorkAnnualPay(facts, {
          occupation: null,
          workKind: "employment:staff",
          jurisdictionId: null,
          weeklyHours: 40,
        }),
      ).toEqual(
        nativePay(world, {
          occupation: null,
          workKind: "employment:staff",
          jurisdictionId: null,
          weeklyHours: 40,
        }),
      );
    });
});
