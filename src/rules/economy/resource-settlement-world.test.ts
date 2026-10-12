import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import { createOrganization } from "../../simulation/life";
import * as native from "../../simulation/resources";
import { payPayerAt } from "../../simulation/pay-coverage-predicates";
import * as own from "./resource-settlement";
import { completed, factsFor } from "./test-support/resource-earned-source";
import type { World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Canonical flow/terms/debt/cash and settlement-period controls, not ordinary NPC settlement history",
};
function facts(world: World): own.ResourceSettlementFacts {
  const payers = new Map();
  for (const event of world.history.events)
    for (const work of world.history.workRelationships) {
      const cutoff = {
        asOfDate: event.occurredAt,
        historySequenceExclusive: event.sequence + 1,
      };
      payers.set(
        own.settlementSourceKey(work.id, cutoff),
        payPayerAt(world, work.id, cutoff),
      );
    }
  return {
    id: world.id,
    currentDate: world.currentDate,
    onDate: world.currentDate,
    records: world.history,
    payers,
    earned: new Map(
      (world.history.earnedLawPayAssessments ?? []).map((row) => [
        row.id,
        factsFor(world, row),
      ]),
    ),
  };
}
function result<T>(call: () => T) {
  try {
    return { value: call() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
function compare(
  world: World,
  input: Parameters<typeof native.recordResourceTransferOutcome>[1],
) {
  const expected = result(() =>
      native.recordResourceTransferOutcome(world, input),
    ),
    draft = result(() =>
      own.prepareResourceTransferOutcome(facts(world), input),
    );
  if ("error" in expected) {
    expect(draft).toEqual(expected);
    return world;
  }
  expect(draft).toEqual({
    value: expected.value!.history.resourceTransferOutcomes.at(-1),
  });
  const actual = native.recordResourceTransferOutcome(world, input);
  expect(actual.history.resourceTransferOutcomes.at(-1)).toEqual(draft.value);
  expect(actual).toEqual(expected.value);
  return actual;
}
describe("full transfer public owner, inclusive collision/terms/cash/debt/earned-law DTO contracts across all 56 places", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 4,
          date: "2026-01-05",
          seed: "rules2:economy:resource-settlement:" + usps,
        });
        let base = createOrganization(fixture.world, {
          stableKey: "rules2:settlement:payer",
          formedAt: fixture.world.currentDate,
          provenance,
          initialProfile: {
            name: "Canonical payer",
            classification: "enterprise:retail",
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const organizationId = base.history.organizations.at(-1)!.id;
        base = native.createResourceFlow(base, {
          stableKey: "rules2:settlement:flow",
          source: { kind: "organization", organizationId },
          recipient: { kind: "person", personId: fixture.personId },
          startsAt: base.currentDate,
          amount: native.money(100000, "USD"),
          cadenceKind: "schedule:weekly",
          basisKind: "compensation:work",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        const flowId = base.history.resourceFlows.at(-1)!.id;
        const later = makeIsoDate("2026-01-31");
        base = {
          ...base,
          currentDate: later,
          currentMoment: simulationMomentOnLocalDate(base.currentMoment, later),
        };
        const input = (
          key: string,
          starts = "2026-01-05",
          ends = "2026-01-11",
          occurred = "2026-01-12",
        ) => ({
          stableKey: key,
          resourceFlowId: flowId,
          periodStartsAt: starts,
          periodEndsAt: ends,
          occurredAt: occurred,
          status: "completed" as const,
          attemptedAmount: native.money(100000, "USD"),
          transferredAmount: native.money(100000, "USD"),
          reasonKind: null,
          note: provenance.note,
          provenance,
        });
        for (const stock of [undefined, 0, 1000000]) {
          let world = base;
          if (stock !== undefined)
            world = native.createResourcePosition(world, {
              stableKey: "rules2:settlement:stock",
              owner: { kind: "organization", organizationId },
              openedAt: makeIsoDate("2026-01-05"),
              openingBalance: native.money(stock, "USD"),
              provenance,
            });
          for (const [status, amount] of [
            ["completed", 100000],
            ["partial", 50000],
            ["missed", 0],
            ["blocked", 0],
          ] as const)
            compare(world, {
              ...input("status:" + status),
              status,
              transferredAmount: native.money(amount, "USD"),
              reasonKind:
                status === "completed" ? null : "capacity:insufficient-funds",
            });
          world = compare(world, input("first"));
          for (const [starts, ends, occurred] of [
            ["2026-01-11", "2026-01-18", "2026-01-19"],
            ["2026-01-12", "2026-01-18", "2026-01-19"],
            ["2026-01-04", "2026-01-05", "2026-01-12"],
            ["2026-01-30", "2026-01-31", "2026-02-01"],
            ["2026-01-05", "2026-01-04", "2026-01-12"],
          ])
            compare(
              world,
              input("period:" + starts + ends, starts, ends, occurred),
            );
          compare(world, {
            ...input("invalid-amount"),
            transferredAmount: native.money(1, "USD"),
          });
          compare(world, {
            ...input("invalid-currency"),
            transferredAmount: native.money(100000, "EUR"),
          });
        }
        const debtBase = native.createResourceFlow(base, {
          stableKey: "rules2:settlement:debt-flow",
          source: { kind: "person", personId: fixture.personId },
          recipient: { kind: "organization", organizationId },
          startsAt: makeIsoDate("2026-01-05"),
          amount: native.money(100000, "USD"),
          cadenceKind: "schedule:weekly",
          basisKind: "housing:mortgage",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        const debtFlowId = debtBase.history.resourceFlows.at(-1)!.id;
        let debt = native.createResourceObligation(debtBase, {
          stableKey: "rules2:settlement:debt",
          resourceFlowId: debtFlowId,
          establishedAt: makeIsoDate("2026-01-05"),
          basisKind: "debt:loan",
          principal: native.money(150000, "USD"),
          careResponsibilityId: null,
          housingTenureId: null,
          provenance,
        });
        debt = compare(debt, {
          ...input("debt-first"),
          resourceFlowId: debtFlowId,
        });
        const prior = debt.history.resourceFlowTerms.at(-1)!;
        debt = native.recordResourceFlowTerms(debt, {
          stableKey: "rules2:settlement:change",
          resourceFlowId: debtFlowId,
          effectiveAt: makeIsoDate("2026-01-15"),
          status: "active",
          amount: native.money(200000, "USD"),
          cadenceKind: "schedule:weekly",
          reason: "Canonical changed terms",
          provenance,
          supersedesTermsId: prior.id,
        });
        compare(debt, {
          ...input(
            "unprorated-change",
            "2026-01-12",
            "2026-01-18",
            "2026-01-19",
          ),
          resourceFlowId: debtFlowId,
        });
        compare(debt, {
          ...input(
            "principal-overpay",
            "2026-01-15",
            "2026-01-18",
            "2026-01-19",
          ),
          resourceFlowId: debtFlowId,
          attemptedAmount: native.money(200000, "USD"),
          transferredAmount: native.money(200000, "USD"),
        });
        const earned = completed(usps),
          assessment = earned.assessment;
        const earnedInput = {
          stableKey: "rules2:settlement:earned",
          resourceFlowId: assessment.resourceFlowId,
          periodStartsAt: assessment.periodStartsAt,
          periodEndsAt: assessment.periodEndsAt,
          occurredAt: earned.world.currentDate,
          status: "completed" as const,
          attemptedAmount: assessment.assessedGross,
          transferredAmount: assessment.assessedGross,
          reasonKind: null,
          note: "Actual saved completed shift and public earned-pay assessment",
          provenance: {
            kind: "simulated-event" as const,
            eventId: assessment.completionEventId,
          },
          earnedLawPayAssessmentId: assessment.id,
        };
        const paid = compare(earned.world, earnedInput);
        expect(
          paid.history.resourceTransferOutcomes.at(-1)!.lawEffectStamps?.length,
        ).toBeGreaterThan(0);
        compare(earned.world, {
          ...earnedInput,
          stableKey: "bad-earned",
          attemptedAmount: assessment.contractualGross,
        });
      },
      60000,
    );
});
