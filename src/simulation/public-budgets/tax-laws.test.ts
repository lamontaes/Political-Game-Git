import { describe, expect, it } from "vitest";
import stateIncomeTax2026 from "../../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from ".";
import { firstOfNextMonth } from "./fiscal";
import {
  adoptedIncomeTaxPerYear,
  beganWithoutWageIncomeTax,
} from "./income-tax-adoption";
import { settleGovernmentMonth, type MonthFlows } from "./month";
import { CANNABIS_TAX_EFFECT } from "./rules";
import { TAX_QUESTION_EFFECTS } from "./rules";

/*
 * Tax laws reach state budgets in both directions: a law adopting a wage
 * income tax where a state began with none collects one, and a law exempting
 * groceries from the sales tax, or taxing them again, moves the sales tax.
 * The world here is partial, as in public-budgets.test.ts. Each test draws
 * its state at random from the states the law can act in, from a named seed.
 */

const INCOME_TAX = "proposition_income_tax" as EntityId;
const GROCERIES = "proposition_groceries" as EntityId;
const CANNABIS = "proposition_cannabis" as EntityId;
const QUESTIONS: Readonly<Record<string, EntityId>> = {
  "fiscal.adopt-income-tax": INCOME_TAX,
  "fiscal.exempt-groceries-from-sales-tax": GROCERIES,
  "business-commerce.legalize-cannabis-sales": CANNABIS,
};

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

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

/** The state's budget, opened and settled month by month through `last`. */
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

function drawn(seed: string, keys: readonly string[]): string {
  return keys[new SeededRng(seed).nextUint32() % keys.length]!;
}

const STATE_KEYS = Object.keys(stateIncomeTax2026.places);

describe("tax laws reach state budgets", () => {
  it("every state that began with no wage income tax has a level an adopted tax collects, and no other state does", () => {
    const without = STATE_KEYS.filter(beganWithoutWageIncomeTax);
    expect(without).toHaveLength(9);
    for (const key of STATE_KEYS) {
      const level = adoptedIncomeTaxPerYear(key, 1_000_000);
      if (without.includes(key)) expect(level, key).toBeGreaterThan(0);
      else expect(level, key).toBeNull();
    }
  });

  it("a state with no wage income tax that adopts one collects it from the next tax year, and a repeal ends it again", () => {
    const seed = "b9-adopt-income-tax";
    const stateKey = drawn(seed, STATE_KEYS.filter(beganWithoutWageIncomeTax));
    // Adopted May 12, 2026; repealed June 1, 2028.
    const world = worldWith(stateKey, [
      { question: INCOME_TAX, answer: "yes", effectiveAt: "2026-05-12" },
      { question: INCOME_TAX, answer: "no", effectiveAt: "2028-06-01" },
    ]);
    const without = worldWith(stateKey, []);
    const lawful = settled(world, stateKey, "2029-06-01");
    const asBegun = settled(without, stateKey, "2029-06-01");
    const tax = (government: PublicBudgetGovernment, month: string) =>
      revenueIn(government, "individualIncomeTax", month);
    const adopted = adoptedIncomeTaxPerYear(stateKey, lawful.population)!;
    const note = `${stateKey}, seed ${seed}`;
    // Nothing changes in the tax year the law takes effect in.
    expect(tax(lawful, "2026-12-01"), note).toBe(tax(asBegun, "2026-12-01"));
    // From January 2027 the state collects the adopted tax each month on top
    // of what it began with (this test world records no economy).
    expect(
      tax(lawful, "2027-01-01") - tax(asBegun, "2027-01-01"),
      note,
    ).toBeCloseTo(adopted / 12, -2);
    // Fiscal years adopted after the law expect it; the repeal governs the
    // tax year from January 2029, and the state collects what it began with.
    expect(
      tax(lawful, "2028-12-01") - tax(asBegun, "2028-12-01"),
      note,
    ).toBeCloseTo(adopted / 12, -2);
    expect(tax(lawful, "2029-01-01"), note).toBe(tax(asBegun, "2029-01-01"));
    // Other sources are untouched.
    expect(revenueIn(lawful, "generalSalesTax", "2027-06-01"), note).toBe(
      revenueIn(asBegun, "generalSalesTax", "2027-06-01"),
    );
  });

  it("a law exempting groceries lowers a state's sales tax by the grocery share from the month it takes effect, and taxing them again restores it", () => {
    const seed = "b9-grocery-exemption";
    const effect = TAX_QUESTION_EFFECTS.find((row) =>
      row.questionKey.endsWith("exempt-groceries-from-sales-tax"),
    )!;
    expect(1 + effect.toYes!).toBeCloseTo(1 - 370.3 / 3573.5, 6);
    expect((1 + effect.toYes!) * (1 + effect.toNo!)).toBeCloseTo(1, 10);
    const probe = worldWith("US-IL", []);
    const taxing = STATE_KEYS.filter((key) => {
      const state = stateJurisdictionForKey(key);
      return (
        state &&
        lawInForceAtStart(probe, state.id, GROCERIES, probe.currentDate) ===
          "no"
      );
    });
    expect(taxing.length).toBeGreaterThan(0);
    const stateKey = drawn(seed, taxing);
    const note = `${stateKey}, seed ${seed}`;
    // Exempt from March 1, 2026; taxed again from September 1, 2027.
    const world = worldWith(stateKey, [
      { question: GROCERIES, answer: "yes", effectiveAt: "2026-03-01" },
      { question: GROCERIES, answer: "no", effectiveAt: "2027-09-01" },
    ]);
    const lawful = settled(world, stateKey, "2027-12-01");
    const asBegun = settled(worldWith(stateKey, []), stateKey, "2027-12-01");
    const sales = (government: PublicBudgetGovernment, month: string) =>
      revenueIn(government, "generalSalesTax", month);
    expect(sales(lawful, "2026-02-01"), note).toBe(
      sales(asBegun, "2026-02-01"),
    );
    expect(
      sales(lawful, "2026-03-01") / sales(asBegun, "2026-03-01"),
      note,
    ).toBeCloseTo(1 + effect.toYes!, 3);
    // The fiscal year adopted under the exemption expects it once.
    expect(
      sales(lawful, "2027-03-01") / sales(asBegun, "2027-03-01"),
      note,
    ).toBeCloseTo(1 + effect.toYes!, 3);
    expect(
      sales(lawful, "2027-10-01") / sales(asBegun, "2027-10-01"),
      note,
    ).toBeCloseTo(1, 3);
  });

  it("a state that began exempting groceries collects the grocery share once a law taxes them", () => {
    const seed = "b9-grocery-tax";
    const effect = TAX_QUESTION_EFFECTS.find((row) =>
      row.questionKey.endsWith("exempt-groceries-from-sales-tax"),
    )!;
    const probe = worldWith("US-IL", []);
    const exempting = STATE_KEYS.filter((key) => {
      const state = stateJurisdictionForKey(key);
      return (
        state &&
        lawInForceAtStart(probe, state.id, GROCERIES, probe.currentDate) ===
          "yes"
      );
    });
    expect(exempting.length).toBeGreaterThan(0);
    const stateKey = drawn(seed, exempting);
    const note = `${stateKey}, seed ${seed}`;
    const world = worldWith(stateKey, [
      { question: GROCERIES, answer: "no", effectiveAt: "2026-04-01" },
    ]);
    const lawful = settled(world, stateKey, "2026-06-01");
    const asBegun = settled(worldWith(stateKey, []), stateKey, "2026-06-01");
    expect(
      revenueIn(lawful, "generalSalesTax", "2026-04-01") /
        revenueIn(asBegun, "generalSalesTax", "2026-04-01"),
      note,
    ).toBeCloseTo(1 + effect.toNo!, 3);
  });
  it("a state that makes cannabis sales legal collects the cannabis tax from its first store opening, and a state that ends them loses it", () => {
    expect(CANNABIS_TAX_EFFECT.perResidentRevenue.annualAmount).toBe(40.7);
    expect(CANNABIS_TAX_EFFECT.perResidentRevenue.firstSaleLagMonths).toBe(11);
    const probe = worldWith("US-IL", []);
    const beganAs = (answer: "yes" | "no") =>
      STATE_KEYS.filter((key) => {
        const state = stateJurisdictionForKey(key);
        return (
          state &&
          lawInForceAtStart(probe, state.id, CANNABIS, probe.currentDate) ===
            answer
        );
      });
    const selective = (government: PublicBudgetGovernment, month: string) =>
      revenueIn(government, "selectiveSalesTaxes", month);
    const opening = (government: PublicBudgetGovernment) =>
      government.years[0]!.expectedRevenue[
        BUDGET_SOURCES.indexOf("selectiveSalesTaxes")
      ]!;

    // Legal from March 1, 2026: the first store opens in February 2027.
    const legalSeed = "b9-cannabis-legal";
    const legalizing = drawn(legalSeed, beganAs("no"));
    const legalNote = `${legalizing}, seed ${legalSeed}`;
    const legal = settled(
      worldWith(legalizing, [
        { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
      ]),
      legalizing,
      "2027-03-01",
    );
    const without = settled(
      worldWith(legalizing, []),
      legalizing,
      "2027-03-01",
    );
    expect(selective(legal, "2027-01-01"), legalNote).toBe(
      selective(without, "2027-01-01"),
    );
    const added =
      CANNABIS_TAX_EFFECT.perResidentRevenue.annualAmount * legal.population;
    expect(
      selective(legal, "2027-02-01") / selective(without, "2027-02-01"),
      legalNote,
    ).toBeCloseTo((opening(legal) + added) / opening(legal), 3);

    // Sales end April 1, 2026 in a state that began with them.
    const banSeed = "b9-cannabis-ban";
    const banning = drawn(banSeed, beganAs("yes"));
    const banNote = `${banning}, seed ${banSeed}`;
    const banned = settled(
      worldWith(banning, [
        { question: CANNABIS, answer: "no", effectiveAt: "2026-04-01" },
      ]),
      banning,
      "2026-05-01",
    );
    const asBegun = settled(worldWith(banning, []), banning, "2026-05-01");
    expect(selective(banned, "2026-03-01"), banNote).toBe(
      selective(asBegun, "2026-03-01"),
    );
    const lost =
      CANNABIS_TAX_EFFECT.perResidentRevenue.annualAmount * banned.population;
    expect(
      selective(banned, "2026-04-01") / selective(asBegun, "2026-04-01"),
      banNote,
    ).toBeCloseTo((opening(banned) - lost) / opening(banned), 3);
  });
});
