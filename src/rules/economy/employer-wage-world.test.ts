import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { countyGeoidsForPlace } from "../../simulation/government-units";
import * as source from "../../simulation/living-world/town-pay.generated";
import { TOWN_JOB_SOC } from "../../simulation/living-world/town-job-soc";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import { workRoleAt, workStatusAt } from "../../simulation/life-queries";
import { createWorkCompensation, money } from "../../simulation/resources";
import { resourceFlowTermsAt } from "../../simulation/resource-queries";
import { localBusinessWageMinor as native } from "../../simulation/recorded-employer";
import {
  localBusinessWageMinor,
  type EmployerWageFacts,
} from "./employer-wage";
import { recordedPayReceiptKey, type RecordedPayFacts } from "./recorded-pay";
import type { WageSourceFacts } from "./wage-source";
import type {
  World,
  EntityId,
  OccupationClassification,
} from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Explicit employer saved hourly-demand/compensation controls, not ordinary hire or source observation.",
};
function facts(world: World): EmployerWageFacts {
  const places = new Map(
    world.jurisdictionOrder.map((id) => [id, lifePlaceByJurisdictionId(id)]),
  );
  const wage: WageSourceFacts = {
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
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const pay: RecordedPayFacts = {
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
  return { wage, pay };
}
describe("complete employer wage public parent from raw saved hours/pay and wage sources", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const fixture = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:employer-wage:" + usps,
      });
      let world = fixture.world;
      const occupations: readonly OccupationClassification[] = [
        "occupation:cashier",
        "service:food-server",
        "profession:policy-analysis",
        "custom:no-source",
      ];
      const compare = (workId?: EntityId) => {
        const f = facts(world);
        for (const occupation of occupations)
          for (const id of [
            fixture.jurisdictionId,
            fixture.stateJurisdictionId,
            null,
          ]) {
            const kind = {
              workerOccupation: occupation,
              workerRelationshipId: workId,
            };
            expect(localBusinessWageMinor(f, kind, id)).toEqual(
              native(kind, id, world),
            );
            expect(localBusinessWageMinor({ wage: f.wage }, kind, id)).toEqual(
              native(kind, id),
            );
          }
      };
      compare();
      for (const weekly of [20, 40]) {
        world = createOrganization(world, {
          stableKey: "rules2:employer:" + weekly,
          formedAt: world.currentDate,
          initialProfile: {
            name: "Saved employer",
            classification: "sector:private",
            locationJurisdictionId: fixture.jurisdictionId,
          },
          provenance,
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        world = createWorkRelationship(world, {
          stableKey: "rules2:employer:work:" + weekly,
          personId: world.personOrder[0]!,
          organizationId,
          startedAt: world.currentDate,
          kind: "employment:staff",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Saved cashier",
            occupationClassification: "occupation:cashier",
            locationJurisdictionId: fixture.jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: weekly, maximumHours: weekly },
              attention: "high",
              concurrency: "mostly-exclusive",
              scheduleRigidity: "mixed",
              interruptibility: "limited",
              locationJurisdictionId: fixture.jurisdictionId,
            },
          },
        });
        const workRelationshipId = world.history.workRelationships.at(-1)!.id;
        compare(workRelationshipId);
        world = createWorkCompensation(world, {
          stableKey: "rules2:employer:pay:" + weekly,
          workRelationshipId,
          startsAt: world.currentDate,
          amount: money(weekly * 5000, "USD"),
          cadenceKind: "schedule:monthly",
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        compare(workRelationshipId);
        compare();
      }
    });
});
