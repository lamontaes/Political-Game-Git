import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { enterLifePath } from "./life-paths2";
import {
  createResourceFlow,
  recordResourceFlowTerms,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import { serializeWorld, deserializeWorld } from "./serialization";
import { isLawEffectStamp, lawEffectStamp } from "./law-effect-stamp";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId } from "./types";
const provenance = {
  kind: "authored" as const,
  note: "Bounded compensation stamp regression fixture.",
};
describe("a wage law's terms reach the actual payment", () => {
  for (const placeKey of [
    "3223500",
    "2743000",
    "5363000",
    "3755000",
    "1235000",
  ]) {
    it(`retains the law and terms through paid transfer and reload in ${placeKey}`, () => {
      let w = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
        seed: `wage-stamp-${placeKey}`,
      }).world;
      w = enterLifePath(w, "shop-assistant").world;
      const work = w.history.workRelationships.at(-1)!;
      w = createResourceFlow(w, {
        stableKey: "stamp-pay",
        source: { kind: "organization", organizationId: work.organizationId! },
        recipient: { kind: "person", personId: work.personId },
        startsAt: w.currentDate,
        amount: money(5000, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "custom:stamp-pay",
        basisReference: { kind: "work", workRelationshipId: work.id },
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      const flow = w.history.resourceFlows.at(-1)!;
      const old = w.history.resourceFlowTerms.at(-1)!;
      const stamp = lawEffectStamp(
        {
          measureId: "legislative-measure_fixture" as EntityId,
          answer: "yes",
          origin: "enacted",
          level: "federal-statute",
          operativeAt: w.currentDate,
          operativeBasis: "enacted-date",
        },
        {
          effectKind: "minimum-wage-compensation",
          questionKey:
            "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          appliedAt: w.currentDate,
          sourceRecordIds: [flow.id, old.id],
        },
      )!;
      const clauseId = "rule-change_fixture" as EntityId;
      const enactmentId = "enactment_fixture" as EntityId;
      // Explicit attribution fixture, not proof of a naturally enacted salary.
      const annualStamp = lawEffectStamp(
        {
          measureId: "legislative-measure_office_fixture" as EntityId,
          origin: "enacted",
          operativeAt: w.currentDate,
        },
        {
          effectKind: "pay",
          questionKey: null,
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          appliedAt: w.currentDate,
          sourceRecordIds: [clauseId, enactmentId],
          ruleAuthority: {
            ruleChangeProvisionId: clauseId,
            enactmentId,
            field: "pay.governor.annualDollars",
          },
        },
      )!;
      expect(isLawEffectStamp(annualStamp)).toBe(true);
      w = recordResourceFlowTerms(w, {
        stableKey: "stamp-raise",
        resourceFlowId: flow.id,
        effectiveAt: w.currentDate,
        status: "active",
        amount: money(7500, "USD"),
        cadenceKind: old.cadenceKind,
        reason: "Fixture wage floor",
        provenance,
        supersedesTermsId: old.id,
        lawEffectStamps: [stamp, annualStamp],
      });
      const terms = w.history.resourceFlowTerms.at(-1)!;
      w = recordResourceTransferOutcome(w, {
        stableKey: "stamp-paid",
        resourceFlowId: flow.id,
        periodStartsAt: w.currentDate,
        periodEndsAt: w.currentDate,
        occurredAt: w.currentDate,
        status: "completed",
        attemptedAmount: money(7500, "USD"),
        transferredAmount: money(7500, "USD"),
        reasonKind: null,
        note: "Fixture paycheck",
        provenance,
      });
      const paid = w.history.resourceTransferOutcomes.at(-1)!;
      expect(paid.lawEffectStamps?.[0]).toMatchObject({
        governingLawKey: stamp.governingLawKey,
        effectKind: "pay",
        appliedAt: paid.occurredAt,
      });
      expect(paid.lawEffectStamps).toHaveLength(2);
      expect(paid.lawEffectStamps![1]).toMatchObject({
        effectKind: "pay",
        questionKey: null,
        governingLawKey: annualStamp.governingLawKey,
        ruleAuthority: annualStamp.ruleAuthority,
        appliedAt: paid.occurredAt,
      });
      expect(paid.lawEffectStamps!.every(isLawEffectStamp)).toBe(true);
      expect(paid.lawEffectStamps![1]!.sourceRecordIds).toEqual(
        expect.arrayContaining([
          clauseId,
          enactmentId,
          terms.id,
          flow.id,
          paid.id,
        ]),
      );
      expect(terms.lawEffectStamps).toEqual([stamp, annualStamp]);
      expect(paid.transferredAmount).toEqual(money(7500, "USD"));
      expect(paid.lawEffectStamps![0]!.sourceRecordIds).toEqual(
        expect.arrayContaining([terms.id, flow.id, paid.id]),
      );
      expect(
        deserializeWorld(serializeWorld(w)).history.resourceTransferOutcomes.at(
          -1,
        )!.lawEffectStamps,
      ).toEqual(paid.lawEffectStamps);
    });
  }
});
