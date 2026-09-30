import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createWorld } from "../world";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
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
  zeroSelective = true,
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
        index === at && zeroSelective ? 0 : value,
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
    console.info(
      JSON.stringify({
        proof: "cannabis-zero-base-budget",
        place,
        seed,
        population: initial.population,
        monthlyRevenue: amount,
        through: "2028-03-01",
      }),
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

const sourcedAnswers = (
  startingLaw.questions as Record<
    string,
    {
      answers: Record<string, { answer: "yes" | "no"; estimated?: string }>;
    }
  >
)["us-policy-positions:business-commerce.legalize-cannabis-sales"]!.answers;
const legalStates = lifePlaceStateIdentities()
  .filter((place) => {
    const row = sourcedAnswers[place.jurisdictionKey];
    return row?.answer === "yes" && !row.estimated;
  })
  .map((place) => place.jurisdictionKey);
const costSeed = "team4-cannabis-revenue-loss-20260930";
const costRng = new SeededRng(costSeed);
const costStates = Array.from(
  { length: 3 },
  () => legalStates.splice(costRng.integer(0, legalStates.length), 1)[0]!,
);
function completeCostWorld(state: string, endSales: boolean) {
  const partial = worldWith(
    state,
    endSales
      ? [{ question: CANNABIS, answer: "no", effectiveAt: "2026-04-01" }]
      : [],
  );
  const complete = createWorld({
    seed: costSeed,
    currentDate: partial.currentDate,
    jurisdictions: [stateJurisdictionForKey(state)!],
    people: [],
    lineage: "production",
  });
  return {
    ...complete,
    policyCatalog: partial.policyCatalog,
    history: { ...complete.history, ...partial.history },
  };
}
describe("a cannabis sales ban writes its state revenue-loss cost", () => {
  it.each(costStates)(
    "stamps the actual %s budget loss without changing its tax arithmetic",
    (state) => {
      const world = completeCostWorld(state, true);
      const continuing = completeCostWorld(state, false);
      const initial = zeroBaseBudget(world, state, false);
      const ordinary = zeroBaseBudget(continuing, state, false);
      const withBan = settleThrough(world, initial, "2026-05-01");
      const withoutBan = settleThrough(continuing, ordinary, "2026-05-01");
      const at = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
      const row = withBan.months.find(
        (row) => row.month === "2026-04-01",
      )! as BudgetMonthRow &
        LawEffectStampedRecord & { cannabisRevenueLoss?: number };
      const baseline = withoutBan.months.find(
        (row) => row.month === "2026-04-01",
      )!;
      const loss = baseline.revenue[at]! - row.revenue[at]!;
      expect(loss, `${state}, seed ${costSeed}`).toBeGreaterThan(0);
      expect(row.cannabisRevenueLoss).toBe(loss);
      expect(row.balance).toBeLessThan(baseline.balance);
      expect(row.lawEffectStamps).toEqual([
        expect.objectContaining({
          governingLawKey: "measure_0",
          effectKind: "state-revenue-loss",
          jurisdictionId: initial.lawJurisdictionId,
          appliedAt: "2026-04-01",
        }),
      ]);
      const before = withBan.months.find(
        (row) => row.month === "2026-03-01",
      )! as BudgetMonthRow &
        LawEffectStampedRecord & { cannabisRevenueLoss?: number };
      expect(before.cannabisRevenueLoss).toBeUndefined();
      expect(before.lawEffectStamps).toBeUndefined();
      const persisted = JSON.parse(JSON.stringify(withBan)) as typeof withBan;
      const saved = persisted.months.find(
        (row) => row.month === "2026-04-01",
      )! as typeof row;
      expect(saved.cannabisRevenueLoss).toBe(loss);
      expect(saved.lawEffectStamps).toEqual(row.lawEffectStamps);
      console.info(
        JSON.stringify({
          state,
          seed: costSeed,
          lostStateRevenue: loss,
          month: row.month,
        }),
      );
    },
  );
});
