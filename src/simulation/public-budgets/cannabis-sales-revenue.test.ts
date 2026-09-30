import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { cannabisSalesRevenueChange } from "./cannabis-sales-revenue";
import { CANNABIS_TAX_PER_RESIDENT } from "./cannabis-sales-tax";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import { firstOfNextMonth } from "./fiscal";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  type BudgetMonthRow,
  type PublicBudgetGovernment,
} from "./store";
import { withOpenedBudgets } from ".";
import type { LawEffectStampedRecord } from "../law-effect-stamp";
const CANNABIS = "proposition_cannabis" as EntityId;
const QUESTIONS = { "business-commerce.legalize-cannabis-sales": CANNABIS };
interface Law {
  readonly question: EntityId;
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
      propositions: Object.fromEntries(
        Object.entries(QUESTIONS).map(([key, id]) => [
          id,
          { id, stableKey: `us-policy-positions:${key}` },
        ]),
      ),
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law, at) => ({
        id: `measure_${at}` as EntityId,
        jurisdictionId,
        propositionIds: [law.question],
        propositionAnswers: [
          { propositionId: law.question, answer: law.answer },
        ],
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

const seed = "team6-cannabis-revenue-20260930";
const probe = worldWith("US-IL", []);
function placeWith(answer: "yes" | "no") {
  const eligible = lifePlaceStateIdentities().filter((place) => {
    const state = stateJurisdictionForKey(place.jurisdictionKey)!;
    return (
      lawInForceAtStart(probe, state.id, CANNABIS, probe.currentDate) === answer
    );
  });
  const place =
    eligible[new SeededRng(seed + answer).integer(0, eligible.length)]!;
  return place.jurisdictionKey;
}
function budget(stateKey: string) {
  return {
    level: "state" as const,
    lawJurisdictionId: stateJurisdictionForKey(stateKey)!.id,
    population: 1000,
  };
}
describe("cannabis revenue reads amounts independently of the opening tax base", () => {
  it("waits for the inherited retail lag, then reads the adoption amount without a tax-base denominator", () => {
    const place = placeWith("no");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
    ]);
    const government = budget(place);
    const before = cannabisSalesRevenueChange(
      world,
      government,
      makeIsoDate("2027-01-31"),
    );
    expect(before, `${place}, seed ${seed}`).toEqual({
      reason: "waiting-for-retail",
      annualRevenueDelta: 0,
      sourceMeasureId: null,
    });
    expect(
      cannabisSalesRevenueChange(world, government, makeIsoDate("2027-02-28")),
    ).toEqual({
      reason: "sales-legalized",
      annualRevenueDelta: CANNABIS_TAX_PER_RESIDENT * 1000,
      sourceMeasureId: "measure_0",
    });
  });
  it("ends modeled revenue on the operative repeal date, retaining the earlier reading", () => {
    const place = placeWith("yes");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "no", effectiveAt: "2026-04-01" },
    ]);
    expect(
      cannabisSalesRevenueChange(
        world,
        budget(place),
        makeIsoDate("2026-03-31"),
      ).reason,
    ).toBe("same-answer");
    expect(
      cannabisSalesRevenueChange(
        world,
        budget(place),
        makeIsoDate("2026-04-01"),
      ),
    ).toEqual({
      reason: "sales-ended",
      annualRevenueDelta: -CANNABIS_TAX_PER_RESIDENT * 1000,
      sourceMeasureId: "measure_0",
    });
  });
  it("does not create an adoption delta for an unknown starting jurisdiction", () => {
    const world = worldWith(placeWith("no"), []);
    expect(
      cannabisSalesRevenueChange(
        world,
        {
          level: "state",
          population: 1000,
          lawJurisdictionId: "jurisdiction_unresearched" as EntityId,
        },
        makeIsoDate("2027-03-01"),
      ),
    ).toEqual({
      reason: "starting-law-not-established",
      annualRevenueDelta: 0,
      sourceMeasureId: null,
    });
  });
  it("does not grant a county or city state sales authority", () => {
    const place = placeWith("no");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
    ]);
    for (const level of ["county", "city"] as const)
      expect(
        cannabisSalesRevenueChange(
          world,
          { ...budget(place), level },
          makeIsoDate("2027-03-01"),
        ),
      ).toEqual({
        reason: "not-state-budget",
        annualRevenueDelta: 0,
        sourceMeasureId: null,
      });
  });
});

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};
function zeroBaseBudget(
  world: World,
  stateKey: string,
): PublicBudgetGovernment {
  const store = withOpenedBudgets(
    world,
    {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
    },
    world.currentDate,
  );
  const government = publicBudgetFor(
    { ...world, publicBudgets: store },
    stateJurisdictionForKey(stateKey)!.id,
  )!;
  const at = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
  return {
    ...government,
    years: government.years.map((year) => ({
      ...year,
      expectedRevenue: year.expectedRevenue.map((value, index) =>
        index === at ? 0 : value,
      ),
    })),
  };
}
function settleThrough(
  world: World,
  government: PublicBudgetGovernment,
  last: string,
) {
  let current = government;
  let month = makeIsoDate("2026-01-01");
  while (month <= last) {
    current = settleGovernmentMonth(world, current, month, NO_FLOWS).government;
    month = firstOfNextMonth(month);
  }
  return current;
}
describe("cannabis revenue reaches a zero-base saved budget consequence", () => {
  it("adds once after retail opens, survives fiscal rollover and JSON persistence, and stamps the operative law", () => {
    const place = placeWith("no");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
    ]);
    const initial = zeroBaseBudget(world, place);
    const saved = settleThrough(world, initial, "2028-03-01");
    const reopened = JSON.parse(
      JSON.stringify(saved),
    ) as PublicBudgetGovernment;
    const at = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
    const amount = Math.round(
      (CANNABIS_TAX_PER_RESIDENT * initial.population) / 12,
    );
    const before = reopened.months.find(
      (row) => row.month === "2027-01-01",
    )! as BudgetMonthRow & LawEffectStampedRecord;
    expect(before.revenue[at], `${place}, seed ${seed}`).toBe(0);
    expect(before.lawEffectStamps).toBeUndefined();
    for (const month of ["2027-02-01", "2027-12-01", "2028-03-01"]) {
      const row = reopened.months.find(
        (row) => row.month === month,
      )! as BudgetMonthRow & LawEffectStampedRecord;
      expect(row.revenue[at], `${place}, ${month}, seed ${seed}`).toBe(amount);
      expect(row.lawEffectStamps).toEqual([
        expect.objectContaining({
          governingLawKey: "measure_0",
          jurisdictionId: initial.lawJurisdictionId,
          appliedAt: month,
          operativeAt: "2026-03-01",
          effectKind: "cannabis-selective-tax-revenue",
        }),
      ]);
    }
    expect(
      settleGovernmentMonth(
        world,
        reopened,
        makeIsoDate("2028-03-01"),
        NO_FLOWS,
      ).government,
    ).toBe(reopened);
  });
  it("removes the added revenue on operative repeal, including after the adopted forecast contains it", () => {
    const place = placeWith("no");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
      { question: CANNABIS, answer: "no", effectiveAt: "2028-03-01" },
    ]);
    const initial = zeroBaseBudget(world, place);
    const saved = settleThrough(world, initial, "2028-04-01");
    const at = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
    expect(
      saved.months.find((row) => row.month === "2028-02-01")!.revenue[at],
    ).toBeGreaterThan(0);
    const repeal = saved.months.find(
      (row) => row.month === "2028-03-01",
    )! as BudgetMonthRow & LawEffectStampedRecord;
    expect(repeal.revenue[at], `${place}, seed ${seed}`).toBe(0);
    expect(repeal.lawEffectStamps).toEqual([
      expect.objectContaining({
        governingLawKey: "measure_1",
        appliedAt: "2028-03-01",
      }),
    ]);
    expect(
      saved.months.find((row) => row.month === "2028-04-01")!.revenue[at],
    ).toBe(0);
  });
});
