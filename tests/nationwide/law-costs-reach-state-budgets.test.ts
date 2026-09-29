import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  lawInForce,
  lawInForceAtStart,
} from "../../src/simulation/governing/law-in-force";
import { stableHash } from "../../src/simulation/ids";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  BUDGET_PROGRAMS,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "../../src/simulation/public-budgets";
import { firstOfNextMonth } from "../../src/simulation/public-budgets/fiscal";
import {
  lawSpendingForMonth,
  settleGovernmentMonth,
  type MonthFlows,
} from "../../src/simulation/public-budgets/month";
import { SPENDING_QUESTION_EFFECTS } from "../../src/simulation/public-budgets/rules";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * A law a state has to enforce costs it money: a consumer data privacy law
 * and age checks for social media each put enforcement staff on the state's
 * budget from the day they take effect, sized from enacted bills' fiscal
 * notes per resident, and a repeal takes the cost off. The state is drawn
 * from all 56 places; the law passed is the opposite of the one it began
 * with, dated by the state's own effective-date rule.
 */

const SEED = "law-costs-reach-state-budgets";
const POLICY = createProductionPolicyCatalog();
const PLACES = lifePlaceStateIdentities();
const PLACE =
  PLACES[Number.parseInt(stableHash(SEED).slice(0, 8), 16) % PLACES.length]!;
const STATE = stateJurisdictionForKey(PLACE.jurisdictionKey)!.id;

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

const questionId = (stableKey: string) =>
  POLICY.propositionOrder.find(
    (id) => POLICY.propositions[id]!.stableKey === stableKey,
  )!;

function act(
  questionKey: string,
  n: number,
  answer: "yes" | "no",
  resolvedAt: IsoDate,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const question = questionId(questionKey);
  const measure: LegislativeMeasureRecord = {
    id: `measure_cost_${n}` as EntityId,
    stableKey: `test:cost:${n}`,
    sequence: n,
    jurisdictionId: STATE,
    rulePackId: "test",
    designation: `HB ${n}`,
    shortTitle: "A test act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: resolvedAt,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_cost_${n}` as EntityId,
    stableKey: `test:cost:${n}:enactment`,
    sequence: 1000 + n,
    measureId: measure.id,
    resolvedAt,
    outcome: "enacted",
    actDesignation: null,
    // No date in the act: the state's own effective-date rule dates it.
    effectiveAt: null,
    outcomeEventId: `event_cost_${n}` as EntityId,
  };
  return { measure, enactment };
}

function worldWith(laws: readonly ReturnType<typeof act>[]): World {
  const world = {
    id: "world_test" as EntityId,
    seed: SEED,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: POLICY,
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
  const store: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  return {
    ...world,
    publicBudgets: withOpenedBudgets(world, store, world.currentDate),
  };
}

function settle(world: World, lastMonth: string): PublicBudgetGovernment {
  let government = publicBudgetFor(world, STATE)!;
  let month = makeIsoDate("2026-01-01");
  while (month <= lastMonth) {
    government = settleGovernmentMonth(
      world,
      government,
      month,
      NO_FLOWS,
    ).government;
    month = firstOfNextMonth(month);
  }
  return government;
}

describe("a law the state has to enforce costs its budget", () => {
  for (const effect of SPENDING_QUESTION_EFFECTS) {
    it(`${effect.questionKey.split(".").at(-1)} in ${PLACE.name} (seed ${SEED}): the cost starts the day the law takes effect and ends the day a repeal does`, () => {
      const started =
        lawInForceAtStart(
          worldWith([]),
          STATE,
          questionId(effect.questionKey),
          makeIsoDate("2026-01-01"),
        ) === "yes"
          ? "yes"
          : "no";
      const flipped = started === "yes" ? "no" : "yes";
      const laws = [
        act(effect.questionKey, 1, flipped, makeIsoDate("2026-03-01")),
        act(effect.questionKey, 2, started, makeIsoDate("2028-03-01")),
      ];
      const world = worldWith(laws);
      const passed = lawInForce(
        world,
        STATE,
        questionId(effect.questionKey),
        makeIsoDate("2027-06-01"),
      )!;
      const repealed = lawInForce(
        world,
        STATE,
        questionId(effect.questionKey),
        makeIsoDate("2029-06-01"),
      )!;
      expect(passed.answer).toBe(flipped);
      expect(repealed.answer).toBe(started);

      const withLaw = settle(world, "2029-12-01");
      const without = settle(worldWith([]), "2029-12-01");
      const government = publicBudgetFor(world, STATE)!;
      const perResident = flipped === "yes" ? effect.toYes! : effect.toNo!;
      const monthly = (perResident * government.population) / 12;
      // The line the law's cost lands on: enforcement staff on
      // administration, a juvenile court age on corrections.
      const line = BUDGET_PROGRAMS.indexOf(effect.program);
      const cost = (date: IsoDate) =>
        lawSpendingForMonth(world, government, date)[line]!;

      // Nothing the day before it takes effect; the whole cost from the
      // first month it is in force, on the law's own budget line.
      expect(cost(addDays(passed.operativeAt, -1))).toBe(0);
      const firstMonth = firstOfNextMonth(passed.operativeAt);
      expect(cost(firstMonth)).toBeCloseTo(monthly, 6);
      const row = (government: PublicBudgetGovernment, on: IsoDate) =>
        government.months.find((entry) => entry.month === on)!;
      // A law that ends a cost takes it off the line, never below zero.
      const before = row(without, firstMonth).spending[line]!;
      const moved = Math.max(0, before + Math.round(monthly)) - before;
      expect(row(withLaw, firstMonth).spending[line]! - before).toBe(moved);
      // The money leaves the state's balance, or stays in it after a repeal.
      const balanceMoved =
        row(withLaw, firstMonth).balance - row(without, firstMonth).balance;
      expect(Math.sign(balanceMoved) + Math.sign(moved)).toBe(0);

      // Once the repeal takes effect the cost is gone.
      expect(cost(firstOfNextMonth(repealed.operativeAt))).toBe(0);
    });
  }
});
