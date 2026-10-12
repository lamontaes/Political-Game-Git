import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { ageOnDate, addDays } from "../../simulation/dates";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { countyGeoidsForPlace } from "../../simulation/government-units";
import * as source from "../../simulation/living-world/town-pay.generated";
import { TOWN_JOB_SOC } from "../../simulation/living-world/town-job-soc";
import * as native from "../../simulation/living-world/town-pay";
import { SeededRng } from "../../simulation/rng";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import {
  organizationProfileAt,
  workStatusAt,
} from "../../simulation/life-queries";
import {
  createWorkCompensation,
  money,
  recordResourceFlowTerms,
} from "../../simulation/resources";
import { resourceFlowTermsAt } from "../../simulation/resource-queries";
import {
  townJobRate,
  townMinimumHourly,
  stateMedianAnnualWage,
  nationalMedianAnnualWage,
  type WageSourceFacts,
} from "./wage-source";
import { townPayPeriod } from "./pay-period";
import {
  nextRecordedPaydayDate,
  nextPaydayDate,
  type RecordedPaydayFacts,
} from "./recorded-payday";
import type { World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Explicit saved wage/size/weekly office-prefix controls, not ordinary hiring or office salary.",
};
function paydayFacts(world: World): RecordedPaydayFacts {
  return {
    onDate: world.currentDate,
    records: world.history,
    terms: new Map(
      world.history.resourceFlows.map((f) => [
        f.id,
        resourceFlowTermsAt(world, f.id) ?? null,
      ]),
    ),
    statuses: new Map(
      world.history.workRelationships.map((w) => [
        w.id,
        workStatusAt(world, w.id),
      ]),
    ),
  };
}
describe("economy complete wage source/area selection, private size-group via public period owner and saved payday timing", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:wage:" + usps,
      });
      const places = new Map(
        base.world.jurisdictionOrder.map((id) => [
          id,
          lifePlaceByJurisdictionId(id),
        ]),
      );
      const facts: WageSourceFacts = {
        places,
        counties: new Map(
          [...places.values()].flatMap((p) =>
            p?.sourceGeoid
              ? [[p.sourceGeoid, countyGeoidsForPlace(p.sourceGeoid)] as const]
              : [],
          ),
        ),
        countyAreas: source.TOWN_PAY_COUNTY_AREAS,
        occupations: TOWN_JOB_SOC,
        percentiles: source.TOWN_PAY_PERCENTILES,
        minimumWages: source.TOWN_MINIMUM_WAGES,
        federalMinimum: source.FEDERAL_MINIMUM_HOURLY,
      };
      const occupations = [
        ...Object.keys(TOWN_JOB_SOC).slice(0, 8),
        "occupation:missing-row",
        null,
      ];
      for (const id of [...places.keys(), null]) {
        expect(townMinimumHourly(facts, id)).toEqual(
          native.townMinimumHourly(id),
        );
        for (const occupation of occupations)
          for (const percentile of [10, 25, 37.5, 50, 75, 90]) {
            expect(townJobRate(facts, occupation, id, percentile)).toEqual(
              native.townJobRate(occupation, id, percentile),
            );
            for (const minimum of [null, 0, 25])
              expect(
                townJobRate(facts, occupation, id, percentile, minimum),
              ).toEqual(
                native.townJobRate(occupation, id, percentile, minimum),
              );
            if (occupation) {
              expect(stateMedianAnnualWage(facts, occupation, id)).toEqual(
                native.stateMedianAnnualWage(occupation, id),
              );
              expect(nationalMedianAnnualWage(facts, occupation)).toEqual(
                native.nationalMedianAnnualWage(occupation),
              );
            }
          }
      }
      const startedAt = addDays(base.world.currentDate, -4);
      let world = createOrganization(base.world, {
        stableKey: "rules2:wage:employer",
        formedAt: startedAt,
        provenance,
        initialProfile: {
          name: "Saved wage employer",
          classification: "enterprise:retail",
          locationJurisdictionId: base.jurisdictionId,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      const periodFacts = {
        shares: source.TOWN_PAY_PERIOD_SHARES,
        profiles: new Map([
          [organizationId, organizationProfileAt(world, organizationId)],
        ]),
        nativePositions: new Map([
          [
            organizationId,
            new SeededRng(world.seed)
              .fork(`${native.TOWN_PAY_VERSION}:period:${organizationId}`)
              .next(),
          ],
        ]),
      };
      for (const classification of [
        "enterprise:retail",
        "service:hospital",
        "missing-classification",
        "sector:local-government-office",
      ])
        for (const staff of [
          0, 9, 10, 19, 20, 49, 50, 99, 100, 249, 250, 499, 500, 999, 1000,
        ])
          expect(
            townPayPeriod(periodFacts, organizationId, classification, staff),
          ).toEqual(
            native.townPayPeriod(world, organizationId, classification, staff),
          );
      const personId = world.personOrder.find(
        (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
      )!;
      world = createWorkRelationship(world, {
        stableKey: "rules2:wage:work",
        personId,
        organizationId,
        startedAt,
        kind: "employment:staff",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: "Saved clerk",
          occupationClassification: "occupation:office-clerk",
          locationJurisdictionId: base.jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 40, maximumHours: 40 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "mixed",
            interruptibility: "limited",
            locationJurisdictionId: base.jurisdictionId,
          },
        },
      });
      expect(nextRecordedPaydayDate(paydayFacts(world))).toEqual(
        native.nextRecordedPaydayDate(world),
      );
      world = createWorkCompensation(world, {
        stableKey: "office-salary:rules2:weekly-control",
        workRelationshipId: world.history.workRelationships.at(-1)!.id,
        startsAt: startedAt,
        amount: money(100000, "USD"),
        cadenceKind: "schedule:weekly",
        restrictionKind: null,
        jurisdictionId: base.jurisdictionId,
        provenance,
      });
      expect(nextRecordedPaydayDate(paydayFacts(world))).toEqual(
        native.nextRecordedPaydayDate(world),
      );
      expect(
        nextRecordedPaydayDate(paydayFacts(world)) <
          nextPaydayDate(world.currentDate),
      ).toBe(true);
      const flow = world.history.resourceFlows.at(-1)!;
      for (const cadenceKind of [
        "schedule:monthly",
        "schedule:weekly",
      ] as const) {
        world = recordResourceFlowTerms(world, {
          stableKey: "rules2:wage:terms:" + cadenceKind,
          resourceFlowId: flow.id,
          supersedesTermsId: resourceFlowTermsAt(world, flow.id)!.id,
          reason: "Saved cadence edge",
          effectiveAt: world.currentDate,
          amount: money(100000, "USD"),
          cadenceKind,
          status: "active",
          provenance,
        });
        expect(nextRecordedPaydayDate(paydayFacts(world))).toEqual(
          native.nextRecordedPaydayDate(world),
        );
      }
      for (let day = 0; day < 35; day++)
        expect(nextPaydayDate(addDays(world.currentDate, day))).toEqual(
          native.nextPaydayDate(addDays(world.currentDate, day)),
        );
    });
});
