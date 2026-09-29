import { describe, expect, it } from "vitest";
import tuitionRevenue from "../../../data/research/money/state-tuition-revenue.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from ".";
import { firstOfNextMonth } from "./fiscal";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import {
  TUITION_FREEZE_QUESTION,
  TUITION_GROWTH_PER_YEAR,
  frozenSchoolYears,
  tuitionFreezeFactor,
  tuitionShareOfCharges,
} from "./tuition-freeze";

/*
 * A state tuition freeze holds the tuition a state's public colleges collect
 * where the year before left it, so the state budget's charges and fees come
 * in lower each school year the freeze is in force, and a repeal lets tuition
 * rise again. The world here is partial, as in tax-laws.test.ts; the state is
 * drawn at random from the 50 whose tuition is measured, from a named seed.
 */

const FREEZE = "proposition_tuition_freeze" as EntityId;

interface Law {
  readonly answer: "yes" | "no";
  readonly effectiveAt: string;
}

function worldWith(stateKey: string, laws: readonly Law[]): World {
  const jurisdictionId = stateJurisdictionForKey(stateKey)!.id;
  return {
    id: "world_test" as EntityId,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: {
        [FREEZE]: { id: FREEZE, stableKey: TUITION_FREEZE_QUESTION },
      },
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law, at) => ({
        id: `measure_${at}` as EntityId,
        jurisdictionId,
        propositionIds: [FREEZE],
        propositionAnswers: [{ propositionId: FREEZE, answer: law.answer }],
      })),
      legislativeEnactments: laws.map((law, at) => ({
        id: `enactment_${at}` as EntityId,
        sequence: 1000 + at,
        measureId: `measure_${at}` as EntityId,
        resolvedAt: makeIsoDate(law.effectiveAt),
        outcome: "enacted",
        effectiveAt: makeIsoDate(law.effectiveAt),
      })),
    },
  } as unknown as World;
}

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

function settled(world: World, stateKey: string, last: string) {
  const store: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  const opened = {
    ...world,
    publicBudgets: withOpenedBudgets(world, store, world.currentDate),
  };
  let current = publicBudgetFor(opened, stateJurisdictionForKey(stateKey)!.id)!;
  let month = makeIsoDate("2026-01-01");
  while (month <= last) {
    current = settleGovernmentMonth(world, current, month, NO_FLOWS).government;
    month = firstOfNextMonth(month);
  }
  return current;
}

const revenueIn = (
  government: PublicBudgetGovernment,
  source: (typeof BUDGET_SOURCES)[number],
  month: string,
) =>
  government.months.find((row) => row.month === month)!.revenue[
    BUDGET_SOURCES.indexOf(source)
  ]!;

const STATE_KEYS = Object.keys(tuitionRevenue.places);

// Frozen from the school year that begins July 1, 2026 (law in effect March
// 1, 2026); repealed from January 1, 2028, so the 2026 and 2027 school years
// were frozen and the 2028 school year is not.
const FROZEN_THEN_REPEALED: readonly Law[] = [
  { answer: "yes", effectiveAt: "2026-03-01" },
  { answer: "no", effectiveAt: "2028-01-01" },
];

describe("a state tuition freeze", () => {
  it("measures the tuition share of charges for all 50 states from Census and SHEEO, and none for D.C. or a territory", () => {
    expect(STATE_KEYS).toHaveLength(50);
    expect(TUITION_GROWTH_PER_YEAR).toBe(0.031);
    for (const key of STATE_KEYS) {
      const share = tuitionShareOfCharges(key)!;
      expect(share, key).toBeGreaterThan(0.1);
      expect(share, key).toBeLessThan(0.9);
    }
    for (const key of ["US-DC", "US-PR", "US-GU", "US-VI", "US-AS", "US-MP"])
      expect(tuitionShareOfCharges(key), key).toBeNull();
  });

  it("holds each school year that begins with it in force, in every state, and a repeal stops it holding more", () => {
    let checked = 0;
    for (const stateKey of STATE_KEYS) {
      const world = worldWith(stateKey, FROZEN_THEN_REPEALED);
      const state = stateJurisdictionForKey(stateKey)!.id;
      const years = (date: string) =>
        frozenSchoolYears(world, state, makeIsoDate(date));
      expect(years("2026-06-30"), stateKey).toBe(0);
      expect(years("2026-07-01"), stateKey).toBe(1);
      expect(years("2027-07-01"), stateKey).toBe(2);
      expect(years("2029-12-31"), stateKey).toBe(2);
      // Without a law, no school year is held.
      expect(
        frozenSchoolYears(
          worldWith(stateKey, []),
          state,
          makeIsoDate("2029-12-31"),
        ),
        stateKey,
      ).toBe(0);
      checked += 1;
    }
    expect(checked).toBe(50);
  });

  it("a freeze lowers the state's charges and fees by the tuition it forgoes each school year, other money is untouched, and a repeal stops the gap growing", () => {
    const seed = "b20-tuition-freeze";
    const stateKey =
      STATE_KEYS[new SeededRng(seed).nextUint32() % STATE_KEYS.length]!;
    const note = `${stateKey}, seed ${seed}`;
    const share = tuitionShareOfCharges(stateKey)!;
    const lawful = settled(
      worldWith(stateKey, FROZEN_THEN_REPEALED),
      stateKey,
      "2029-09-01",
    );
    const asBegun = settled(worldWith(stateKey, []), stateKey, "2029-09-01");
    const charges = (month: string) =>
      revenueIn(lawful, "chargesAndFees", month) /
      revenueIn(asBegun, "chargesAndFees", month);
    const held = (years: number) =>
      1 - share * (1 - (1 + TUITION_GROWTH_PER_YEAR) ** -years);
    // Enacted in March, but tuition is set for the school year in July.
    expect(charges("2026-06-01"), note).toBeCloseTo(1, 6);
    expect(charges("2026-07-01"), note).toBeCloseTo(held(1), 3);
    expect(charges("2027-07-01"), note).toBeCloseTo(held(2), 3);
    // Repealed: tuition rises again from where the freeze held it.
    expect(charges("2028-07-01"), note).toBeCloseTo(held(2), 3);
    expect(charges("2029-07-01"), note).toBeCloseTo(held(2), 3);
    expect(held(2)).toBeLessThan(held(1));
    for (const source of BUDGET_SOURCES) {
      if (source === "chargesAndFees") continue;
      expect(revenueIn(lawful, source, "2027-08-01"), `${note} ${source}`).toBe(
        revenueIn(asBegun, source, "2027-08-01"),
      );
    }
    // The next budget adopted is set on the lower revenue.
    const adopted = (government: PublicBudgetGovernment) =>
      government.years.find((year) => year.startsOn > "2027-06-30")!;
    const chargesAt = BUDGET_SOURCES.indexOf("chargesAndFees");
    expect(adopted(lawful).expectedRevenue[chargesAt]!, note).toBeLessThan(
      adopted(asBegun).expectedRevenue[chargesAt]!,
    );
    expect(BUDGET_PROGRAMS).toContain("higherEducation");
  });

  it("changes nothing for a county, a city, D.C. or a state whose law says no", () => {
    const stateKey = STATE_KEYS[0]!;
    const world = worldWith(stateKey, [
      { answer: "no", effectiveAt: "2026-03-01" },
    ]);
    const government = settled(world, stateKey, "2026-01-01");
    expect(
      tuitionFreezeFactor(world, government, makeIsoDate("2027-08-01")),
    ).toBe(1);
    const frozen = worldWith(stateKey, FROZEN_THEN_REPEALED);
    expect(
      tuitionFreezeFactor(
        frozen,
        { ...government, level: "county" },
        makeIsoDate("2027-08-01"),
      ),
    ).toBe(1);
    expect(
      tuitionFreezeFactor(
        frozen,
        { ...government, stateKey: "US-DC" },
        makeIsoDate("2027-08-01"),
      ),
    ).toBe(1);
  });
});
