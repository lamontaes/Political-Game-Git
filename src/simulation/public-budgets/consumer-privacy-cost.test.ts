import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import { isLawEffectStamp } from "../law-effect-stamp";
import { stateJurisdictionForKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { createWorld } from "../world";
import { AGE_VERIFICATION_COST_QUESTION } from "./age-verification-cost";
import {
  appendConsumerPrivacyCostToMonth,
  CONSUMER_PRIVACY_COST_QUESTION,
} from "./consumer-privacy-cost";
import { withOpenedBudgets } from "./index";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import { SPENDING_QUESTION_EFFECTS } from "./rules";
import { BUDGET_PROGRAMS, PUBLIC_BUDGETS_VERSION } from "./store";

const flows: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};
const states = ["US-MD", "US-ID", "US-IN", "US-CA", "US-WA"];

describe("consumer privacy attribution preserves the settled budget", () => {
  it.each(states)(
    "%s saves the existing component without another debit",
    (key) => {
      const state = stateJurisdictionForKey(key)!;
      const catalog = createProductionPolicyCatalog();
      const privacy = Object.values(catalog.propositions).find(
        (entry) => entry.stableKey === CONSUMER_PRIVACY_COST_QUESTION,
      )!;
      const age = Object.values(catalog.propositions).find(
        (entry) => entry.stableKey === AGE_VERIFICATION_COST_QUESTION,
      )!;
      const base = createWorld({
        seed: "team8-consumer-privacy-stamp:" + key,
        currentDate: makeIsoDate("2026-01-05"),
        jurisdictions: [state],
        people: [],
        policyCatalog: catalog,
      });
      const opening = lawInForceAtStart(
        base,
        state.id,
        privacy.id,
        base.currentDate,
      );
      expect(["yes", "no"]).toContain(opening);
      const answer = opening === "yes" ? "no" : "yes";
      const month = makeIsoDate("2026-05-01");
      const makeMeasure = (
        propositionId: EntityId,
        policyAnswer: "yes" | "no",
        index: number,
      ): LegislativeMeasureRecord => ({
        id: `measure_privacy_fixture_${key}_${index}` as EntityId,
        stableKey: `privacy-fixture:${key}:${index}`,
        sequence: base.history.nextSequence + index * 2,
        jurisdictionId: state.id,
        rulePackId: "authored-stamp-fixture",
        designation: `HB fixture ${index}`,
        shortTitle: "Authored attribution fixture",
        summary: "Controlled legal change; no natural passage claim.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: month,
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: [propositionId],
        propositionAnswers: [{ propositionId, answer: policyAnswer }],
      });
      const ageMeasure = makeMeasure(age.id, "yes", 0);
      const privacyMeasure = makeMeasure(privacy.id, answer, 1);
      const enact = (
        measure: LegislativeMeasureRecord,
      ): LegislativeEnactmentRecord => ({
        id: `enactment_${measure.id}` as EntityId,
        stableKey: measure.stableKey + ":enacted",
        sequence: measure.sequence + 1,
        measureId: measure.id,
        resolvedAt: month,
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: month,
        outcomeEventId: `event_${measure.id}` as EntityId,
      });
      const world: World = {
        ...base,
        currentDate: makeIsoDate("2026-06-01"),
        history: {
          ...base.history,
          nextSequence: base.history.nextSequence + 4,
          legislativeMeasures: [ageMeasure, privacyMeasure],
          legislativeEnactments: [enact(ageMeasure), enact(privacyMeasure)],
        },
      };
      const ageOnly: World = {
        ...world,
        history: {
          ...world.history,
          legislativeMeasures: [ageMeasure],
          legislativeEnactments: [enact(ageMeasure)],
        },
      };
      const government = withOpenedBudgets(
        base,
        {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        },
        base.currentDate,
      ).governments.find((entry) => entry.key === key)!;
      const baseline = settleGovernmentMonth(
        ageOnly,
        government,
        month,
        flows,
      ).government.months.at(-1)!;
      const savedGovernment = settleGovernmentMonth(
        world,
        government,
        month,
        flows,
      ).government;
      const saved = savedGovernment.months.at(-1)!;
      const cost = saved.lawCostAttributions!.find((entry) =>
        entry.lawEffectStamps.some(
          (stamp) => stamp.questionKey === CONSUMER_PRIVACY_COST_QUESTION,
        ),
      )!;
      const effect = SPENDING_QUESTION_EFFECTS.find(
        (entry) => entry.questionKey === CONSUMER_PRIVACY_COST_QUESTION,
      )!;
      const rate = answer === "yes" ? effect.toYes! : effect.toNo!;
      expect(cost.amountUsd).toBeCloseTo(
        (rate * government.population) / 12,
        6,
      );
      expect(cost.basis).toContain("ESTIMATED FROM AVERAGE");
      const administration = BUDGET_PROGRAMS.indexOf("administration");
      const delta =
        saved.spending[administration]! - baseline.spending[administration]!;
      // The budget rounds the aggregate once, rather than each component.
      expect(Math.abs(delta - cost.amountUsd)).toBeLessThanOrEqual(1);
      expect(saved.balance - baseline.balance).toBe(-delta);
      expect(saved.revenue).toEqual(baseline.revenue);
      expect(saved.spending.filter((_, at) => at !== administration)).toEqual(
        baseline.spending.filter((_, at) => at !== administration),
      );
      expect(isLawEffectStamp(cost.lawEffectStamps[0])).toBe(true);
      expect(cost.lawEffectStamps[0]).toMatchObject({
        governingLawKey: privacyMeasure.id,
        jurisdictionId: state.id,
        appliedAt: month,
        questionKey: CONSUMER_PRIVACY_COST_QUESTION,
        effectKind: "government-consumer-privacy-enforcement-cost",
      });
      expect(cost.lawEffectStamps[0]!.sourceRecordIds).toContain(
        privacyMeasure.id,
      );
      expect(saved.lawCostAttributions).toEqual(
        expect.arrayContaining([...baseline.lawCostAttributions!]),
      );
      const stamped = saved as typeof saved & {
        lawEffectStamps?: readonly unknown[];
      };
      expect(stamped.lawEffectStamps).toEqual(
        expect.arrayContaining([
          ...((baseline as typeof stamped).lawEffectStamps ?? []),
          cost.lawEffectStamps[0],
        ]),
      );
      expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
      expect(appendConsumerPrivacyCostToMonth(world, government, saved)).toBe(
        saved,
      );
      expect(
        settleGovernmentMonth(world, savedGovernment, month, flows).government,
      ).toBe(savedGovernment);
      expect(
        appendConsumerPrivacyCostToMonth(
          world,
          { ...government, level: "county" },
          baseline,
        ),
      ).toBe(baseline);
      expect(
        appendConsumerPrivacyCostToMonth(
          { ...world, policyCatalog: { ...catalog, propositions: {} } },
          government,
          baseline,
        ),
      ).toBe(baseline);
      expect(
        appendConsumerPrivacyCostToMonth(
          world,
          {
            ...government,
            lawJurisdictionId: "jurisdiction_unknown" as EntityId,
          },
          baseline,
        ),
      ).toBe(baseline);
    },
  );
});
