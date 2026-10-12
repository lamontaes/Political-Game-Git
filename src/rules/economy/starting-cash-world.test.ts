import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { addDays, ageOnDate } from "../../simulation/dates";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import { activeWorkRelationshipsAt } from "../../simulation/life-queries";
import {
  createWorkCompensation,
  createResourcePosition,
  money,
  recordResourceFlowTerms,
} from "../../simulation/resources";
import { resourceFlowTermsAt } from "../../simulation/resource-queries";
import {
  estimatedPersonalBalance as nativeEstimate,
  ensureStartingPersonalMoney,
} from "../../simulation/starting-money";
import {
  estimatedPersonalBalance,
  preparePersonalMoney,
  type StartingMoneyFacts,
} from "./starting-cash";
import scf from "../../../data/research/money/scf-transaction-accounts-2022.json";
import type { World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Explicit saved adult-pay control; not ordinary wealth or spontaneous employment.",
};
function facts(world: World): StartingMoneyFacts {
  return {
    onDate: world.currentDate,
    birthDates: new Map(
      world.personOrder.map((id) => [id, world.people[id]!.birthDate]),
    ),
    positions: world.history.resourcePositions,
    flows: world.history.resourceFlows,
    outcomes: world.history.resourceTransferOutcomes,
    work: world.history.workRelationships,
    activeWorkIds: new Map(
      world.personOrder.map((id) => [
        id,
        activeWorkRelationshipsAt(world, id).map((w) => w.relationship.id),
      ]),
    ),
    terms: new Map(
      world.history.resourceFlows.map((flow) => [
        flow.id,
        resourceFlowTermsAt(world, flow.id),
      ]),
    ),
    groups: scf.groups,
  };
}
describe("economy starting-pay/private annual-pay math through its native public owners", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:starting:" + usps,
      });
      const personId = base.world.personOrder.find(
        (id) =>
          ageOnDate(base.world.people[id]!.birthDate, base.world.currentDate) >=
          22,
      )!;
      expect(personId).toBeDefined();
      const check = (world: World) => {
        const actual = ensureStartingPersonalMoney(world, personId);
        const own = preparePersonalMoney(facts(world), personId);
        expect({
          status: own.status,
          annualPayMinorUnits: own.annualPayMinorUnits,
          payFlowId: own.payFlowId,
        }).toEqual({
          status: actual.status,
          annualPayMinorUnits: actual.annualPayMinorUnits,
          payFlowId: actual.payFlowId,
        });
        expect(estimatedPersonalBalance(facts(world), personId)).toEqual(
          nativeEstimate(world, personId),
        );
        if (own.request)
          expect(
            createResourcePosition(world, own.request).history
              .resourcePositions,
          ).toEqual(actual.world.history.resourcePositions);
      };
      check(base.world);
      for (const days of [1, 365, 366, 1460]) {
        const startedAt = addDays(base.world.currentDate, -days);
        let world = createOrganization(base.world, {
          stableKey: "rules2:starting:employer:" + days,
          formedAt: startedAt,
          provenance,
          initialProfile: {
            name: "Saved starting-pay employer",
            classification: "sector:private",
            locationJurisdictionId: base.jurisdictionId,
          },
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        world = createWorkRelationship(world, {
          stableKey: "rules2:starting:work:" + days,
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
            title: "Saved starting-pay role",
            occupationClassification: "profession:policy-analysis",
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
        world = createWorkCompensation(world, {
          stableKey: "rules2:starting:salary:" + days,
          workRelationshipId: world.history.workRelationships.at(-1)!.id,
          startsAt: startedAt,
          amount: money(250000, "USD"),
          cadenceKind: "schedule:monthly",
          restrictionKind: null,
          jurisdictionId: base.jurisdictionId,
          provenance,
        });
        const flow = world.history.resourceFlows.at(-1)!;
        for (const cadenceKind of [
          "schedule:monthly",
          "schedule:weekly",
          "schedule:biweekly",
          "schedule:annual",
        ] as const) {
          world = recordResourceFlowTerms(world, {
            stableKey: `rules2:starting:terms:${days}:${cadenceKind}`,
            resourceFlowId: flow.id,
            supersedesTermsId: resourceFlowTermsAt(world, flow.id)!.id,
            reason: "Controlled saved cadence.",
            effectiveAt: world.currentDate,
            amount: money(250000, "USD"),
            cadenceKind,
            status: "active",
            provenance,
          });
          check(world);
        }
        const existing = createResourcePosition(world, {
          stableKey: "rules2:starting:existing:" + days,
          owner: { kind: "person", personId },
          openedAt: world.currentDate,
          openingBalance: money(12345, "USD"),
          provenance,
        });
        check(existing);
      }
    });
});
