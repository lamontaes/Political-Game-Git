import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import { lawInForce } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { createWorld } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
const AGE_VERIFICATION_COST_QUESTION =
  "us-policy-positions:technology-privacy.age-verification-for-social-media";
const CONSUMER_PRIVACY_COST_QUESTION =
  "us-policy-positions:technology-privacy.consumer-data-privacy-law";
import { withOpenedBudgets } from "./index";
import {
  lawSpendingForMonth,
  settleGovernmentMonth,
  type MonthFlows,
} from "./month";
import { SPENDING_QUESTION_EFFECTS } from "./rules";
import { BUDGET_PROGRAMS, PUBLIC_BUDGETS_VERSION } from "./store";

const flows: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};
const states = ["US-MD", "US-ID", "US-IN", "US-CA", "US-WA"];

describe("consumer privacy without an appropriation or actual hires produces no invoice", () => {
  it.each(states)(
    "%s preserves money and saved records for enactment or repeal",
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
      expect(lawInForce(world, state.id, privacy.id, month)?.measureId).toBe(
        privacyMeasure.id,
      );
      expect(
        SPENDING_QUESTION_EFFECTS.some(
          (entry) => entry.questionKey === CONSUMER_PRIVACY_COST_QUESTION,
        ),
      ).toBe(false);
      expect(saved.lawCostAttributions).toBeUndefined();
      const administration = BUDGET_PROGRAMS.indexOf("administration");
      expect(saved.spending[administration]).toBe(
        baseline.spending[administration],
      );
      expect(saved.balance).toBe(baseline.balance);
      expect(saved.revenue).toEqual(baseline.revenue);
      expect(saved.spending).toEqual(baseline.spending);
      expect(saved.lawEffectStamps).toEqual(baseline.lawEffectStamps);
      expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
      const stored = {
        ...world,
        publicBudgets: {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [savedGovernment],
          adjustments: [],
          unknown: [],
        },
      };
      const bytes = serializeWorld(stored);
      const loaded = deserializeWorld(bytes);
      expect(serializeWorld(loaded)).toBe(bytes);
      expect(loaded.publicBudgets!.governments[0]).toEqual(savedGovernment);
      expect(
        settleGovernmentMonth(world, savedGovernment, month, flows).government,
      ).toBe(savedGovernment);
      expect(
        lawSpendingForMonth(world, { ...government, level: "county" }, month),
      ).toEqual(BUDGET_PROGRAMS.map(() => 0));
      expect(
        lawSpendingForMonth(
          { ...world, policyCatalog: { ...catalog, propositions: {} } },
          government,
          month,
        ),
      ).toEqual(BUDGET_PROGRAMS.map(() => 0));
      expect(
        lawSpendingForMonth(
          world,
          {
            ...government,
            lawJurisdictionId: "jurisdiction_unknown" as EntityId,
          },
          month,
        ),
      ).toEqual(BUDGET_PROGRAMS.map(() => 0));
    },
  );
});
