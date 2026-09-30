import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createWorld } from "../world";
import {
  isLawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { withOpenedBudgets } from "./index";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import { BUDGET_PROGRAMS, PUBLIC_BUDGETS_VERSION } from "./store";
import { SPENDING_QUESTION_EFFECTS } from "./rules";
import {
  ageVerificationCostForMonth,
  AGE_VERIFICATION_COST_QUESTION,
} from "./age-verification-cost";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";

const FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};
const states = ["US-MD", "US-ID", "US-IN", "US-CA", "US-WA"];

describe("age-verification cost reaches the state's settled budget", () => {
  it.each(states)(
    "%s retains its actual modeled expense and governing stamp",
    (stateKey) => {
      const state = stateJurisdictionForKey(stateKey)!;
      const catalog = createProductionPolicyCatalog();
      const question = Object.values(catalog.propositions).find(
        (x) => x.stableKey === AGE_VERIFICATION_COST_QUESTION,
      )!;
      const base = createWorld({
        seed: "team8-age-cost:" + stateKey,
        currentDate: makeIsoDate("2026-01-05"),
        jurisdictions: [state],
        people: [],
        policyCatalog: catalog,
      });
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
      ).governments.find((x) => x.key === stateKey)!;
      expect(government).toBeDefined();
      const date = makeIsoDate("2026-05-01");
      const measure: LegislativeMeasureRecord = {
        id: ("measure_age_cost_" + stateKey) as EntityId,
        stableKey: "age-cost:" + stateKey,
        sequence: base.history.nextSequence,
        jurisdictionId: state.id,
        rulePackId: "authored-cost-fixture",
        designation: "HB cost",
        shortTitle: "Authored age-verification cost fixture",
        summary: "An authored legal change for a budget attribution test.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: date,
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: [question.id],
        propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
      };
      const enactment: LegislativeEnactmentRecord = {
        id: ("enactment_age_cost_" + stateKey) as EntityId,
        stableKey: "age-cost:" + stateKey + ":enacted",
        sequence: base.history.nextSequence + 1,
        measureId: measure.id,
        resolvedAt: date,
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: date,
        outcomeEventId: ("event_age_cost_" + stateKey) as EntityId,
      };
      const world: World = {
        ...base,
        currentDate: makeIsoDate("2026-06-01"),
        history: {
          ...base.history,
          nextSequence: base.history.nextSequence + 2,
          legislativeMeasures: [measure],
          legislativeEnactments: [enactment],
        },
      };
      const before = settleGovernmentMonth(
        { ...base, currentDate: world.currentDate },
        government,
        date,
        FLOWS,
      ).government.months.at(-1)!;
      const after = settleGovernmentMonth(
        world,
        government,
        date,
        FLOWS,
      ).government.months.at(-1)!;
      const attribution = after.lawCostAttributions![0]!;
      const rate = SPENDING_QUESTION_EFFECTS.find(
        (x) => x.questionKey === AGE_VERIFICATION_COST_QUESTION,
      )!.toYes!;
      expect(attribution.amountUsd).toBeCloseTo(
        (rate * government.population) / 12,
        6,
      );
      const program = BUDGET_PROGRAMS.indexOf("administration");
      expect(after.spending[program]! - before.spending[program]!).toBe(
        Math.round(attribution.amountUsd),
      );
      expect(after.balance - before.balance).toBe(
        -Math.round(attribution.amountUsd),
      );
      expect(attribution.program).toBe("administration");
      expect(attribution.basis).toContain("ESTIMATED FROM AVERAGE");
      expect(attribution.basis).toContain("not a platform invoice");
      expect(isLawEffectStamp(attribution.lawEffectStamps[0])).toBe(true);
      expect(attribution.lawEffectStamps[0]).toMatchObject({
        governingLawKey: measure.id,
        jurisdictionId: state.id,
        appliedAt: date,
        effectKind: "government-age-verification-enforcement-cost",
      });
      expect(
        ageVerificationCostForMonth(
          base,
          government,
          makeIsoDate("2026-04-01"),
        ),
      ).toBeNull();
      expect(
        ageVerificationCostForMonth(
          world,
          { ...government, level: "county" },
          date,
        ),
      ).toBeNull();
      expect(
        ageVerificationCostForMonth(
          { ...world, policyCatalog: { ...catalog, propositions: {} } },
          government,
          date,
        ),
      ).toBeNull();
      const reopened = JSON.parse(JSON.stringify(after));
      expect(reopened.lawCostAttributions).toEqual(after.lawCostAttributions);
      if (stateKey === "US-CA" || stateKey === "US-WA") {
        const cannabis = Object.values(catalog.propositions).find(
          (row) =>
            row.stableKey ===
            "us-policy-positions:business-commerce.legalize-cannabis-sales",
        )!;
        const ban: LegislativeMeasureRecord = {
          ...measure,
          id: ("measure_cannabis_ban_" + stateKey) as EntityId,
          stableKey: "cannabis-ban:" + stateKey,
          sequence: world.history.nextSequence,
          shortTitle: "Authored cannabis repeal preservation fixture",
          propositionIds: [cannabis.id],
          propositionAnswers: [{ propositionId: cannabis.id, answer: "no" }],
        };
        const enactedBan: LegislativeEnactmentRecord = {
          ...enactment,
          id: ("enactment_cannabis_ban_" + stateKey) as EntityId,
          stableKey: ban.stableKey + ":enacted",
          sequence: world.history.nextSequence + 1,
          measureId: ban.id,
          outcomeEventId: ("event_cannabis_ban_" + stateKey) as EntityId,
        };
        const together: World = {
          ...world,
          history: {
            ...world.history,
            nextSequence: world.history.nextSequence + 2,
            legislativeMeasures: [measure, ban],
            legislativeEnactments: [enactment, enactedBan],
          },
        };
        const banOnly: World = {
          ...together,
          history: {
            ...together.history,
            legislativeMeasures: [ban],
            legislativeEnactments: [enactedBan],
          },
        };
        const combined = settleGovernmentMonth(
          together,
          government,
          date,
          FLOWS,
        ).government;
        const saved = combined.months.at(-1)! as typeof after &
          LawEffectStampedRecord & { readonly cannabisRevenueLoss?: number };
        const onlyBan = settleGovernmentMonth(
          banOnly,
          government,
          date,
          FLOWS,
        ).government.months.at(-1)!;
        expect(saved.cannabisRevenueLoss).toBeGreaterThan(0);
        expect(saved.lawEffectStamps).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              governingLawKey: ban.id,
              effectKind: "state-revenue-loss",
            }),
            expect.objectContaining({
              governingLawKey: measure.id,
              effectKind: "government-age-verification-enforcement-cost",
            }),
          ]),
        );
        expect(saved.lawEffectStamps).toHaveLength(2);
        expect(saved.balance - onlyBan.balance).toBe(
          -Math.round(attribution.amountUsd),
        );
        expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
        expect(
          settleGovernmentMonth(together, combined, date, FLOWS).government,
        ).toBe(combined);
      }
      console.log(
        "COST_FIXTURE",
        stateKey,
        "population",
        government.population,
        "monthlyUSD",
        attribution.amountUsd,
        "measure",
        measure.id,
      );
    },
  );
});
