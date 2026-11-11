/**
 * The country tier's month, as pure math (country-model.ts): every state opened from the world's
 * own figures under the starting law, then stepped by the month. The world (its seed) and the
 * state a law is changed in are drawn each run and printed, so a failure can be replayed with
 * COUNTRY_SEED and COUNTRY_STATE.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { countryLaw, startingLawReader } from "./country-law";
import {
  countryMoney,
  countryPeople,
  countryProblems,
  countryRules,
  countryTotals,
  countryUnemployment,
  openCountry,
  spreadFlows,
  stepCountry,
  type CountryMonth,
  type CountryState,
  type CountryTier,
} from "./country-model";
import { countryOpening } from "./country-opening";
import { gameStartDate } from "./game-start";
import type { LawInForceAnswer } from "./laws-in-force";
import type { TaxIndex } from "./tax-index";
import { historyMonths } from "./macro-model";
import { macroCoreData } from "./modules/macro";
import { openingRegionMonths, stateFigures } from "./regional-model";

const seed = process.env.COUNTRY_SEED ?? randomBytes(6).toString("hex");
const rows = macroCoreData().parameters;
const p = (key: string) => {
  const row = rows[key];
  if (!row) throw new Error(`Untagged numeric parameter: ${key}`);
  return row.value;
};
const rules = countryRules(p);
const start = gameStartDate();
const national = historyMonths(start, seed, p).at(-1)!;
const regionMonths = openingRegionMonths(national, start, seed, p);
const opening = countryOpening(
  (fips) => {
    const own = stateFigures(regionMonths, fips);
    return {
      unemploymentPct: own.unemploymentPct,
      hourlyPay: own.hourlyEarnings,
      priceLevelPct: own.priceLevelPct,
    };
  },
  {
    unemploymentPct: national.unemploymentPct,
    policyRatePct: national.policyRatePct,
    expectedInflationPct: national.inflationPct,
  },
  p,
);
const drawn = Number.parseInt(seed.slice(0, 6), 16) % opening.states.length;
const picked =
  opening.states.find((row) => row.usps === process.env.COUNTRY_STATE) ??
  opening.states[drawn]!;
const where = `seed ${seed}, state ${picked.usps}`;

type Change = (
  stateKey: string,
  series: string,
  answer: LawInForceAnswer,
) => LawInForceAnswer;
const read = startingLawReader(start);
const lawOf = (change?: Change, index?: TaxIndex) =>
  countryLaw(
    change
      ? (stateKey, series) => change(stateKey, series, read(stateKey, series))
      : read,
    p,
    start,
    index,
  );
/** A level's income tax set to zero, in one state or in all. */
const noIncomeTax =
  (level: "state" | "federal", only?: string): Change =>
  (stateKey, series, answer) =>
    series === "income-tax" && (!only || stateKey === only)
      ? {
          ...answer,
          levels: answer.levels.map((row) =>
            row.level === level && row.row
              ? { ...row, row: { ...row.row, value: 0 } }
              : row,
          ),
        }
      : answer;

const RATE = national.policyRatePct / 100;
interface Run {
  tier: CountryTier;
  months: CountryMonth[];
}
/** A run at the opening's rate, so two runs differ only by what the test changed. */
function run(
  months: number,
  options: {
    change?: Change;
    jobsLost?: (state: CountryState, month: number) => number;
    rate?: (month: number) => number;
    each?: (tier: CountryTier, row: CountryMonth, before: CountryTier) => void;
    /** The law's indexed amounts move each January with the tier's own prices and pay. */
    indexed?: boolean;
  } = {},
): Run {
  const tier = openCountry(opening, lawOf(), rules);
  const out: CountryMonth[] = [];
  // Prices and average pay each January, by year: what the law indexes reads.
  const januaries = new Map<number, { prices: number; wages: number }>();
  const pay = () => {
    const totals = countryTotals(tier, rules);
    return totals.hourlyPay;
  };
  for (let month = 1; month <= months; month++) {
    const before = options.each ? structuredClone(tier) : tier;
    const at = new Date(`${start}T00:00:00Z`);
    at.setUTCMonth(at.getUTCMonth() + month - 1);
    const year = at.getUTCFullYear();
    if (!januaries.has(year))
      januaries.set(year, { prices: tier.priceIndex, wages: pay() });
    const index: TaxIndex | undefined = options.indexed
      ? (by, dollarYear) => {
          const now = januaries.get(year);
          const then = januaries.get(dollarYear);
          if (!(year > dollarYear) || !now || !then) return 1;
          return by === "prices"
            ? now.prices / then.prices
            : now.wages / then.wages;
        }
      : undefined;
    const row = stepCountry(
      tier,
      {
        law: lawOf(options.change, index),
        policyRate: options.rate?.(month) ?? RATE,
        jobsLost: options.jobsLost
          ? (state) => options.jobsLost!(state, month)
          : undefined,
      },
      rules,
    );
    out.push(row);
    options.each?.(tier, row, before);
  }
  return { tier, months: out };
}
const stateOf = (tier: CountryTier, usps: string) =>
  tier.states.find((row) => row.usps === usps)!;

describe(`the country tier's month: ${where}`, () => {
  it("opens every state on the world's own figures, and the nation on their sum", () => {
    const tier = openCountry(opening, lawOf(), rules);
    expect(tier.states.length, where).toBe(56);
    expect(countryProblems(tier), where).toEqual([]);
    // The states' sum is the national figure the world opened with.
    expect(countryTotals(tier, rules).unemploymentPct, where).toBeCloseTo(
      national.unemploymentPct,
      6,
    );
    // Two states do not open alike, and each ledger's budget is balanced on day one.
    const rates = new Set(
      tier.states.map((state) => countryUnemployment(state).toFixed(4)),
    );
    expect(rates.size, where).toBeGreaterThan(40);
    // The first month keeps the share out of work where the world opened it: nothing jumps on day one.
    const first = stepCountry(tier, { law: lawOf(), policyRate: RATE }, rules);
    expect(
      Math.abs(first.unemploymentPct - national.unemploymentPct),
      `${where}: month 1 is ${first.unemploymentPct}`,
    ).toBeLessThan(0.1);
  });

  it("keeps every dollar and every person accounted for, each month for twenty years", () => {
    const start0 = openCountry(opening, lawOf(), rules);
    const money = countryMoney(start0);
    let worstMoney = 0,
      worstPeople = 0,
      problems: string[] = [];
    let people = sum(start0.states.map(countryPeople));
    const { months } = run(240, {
      each(tier, row) {
        worstMoney = Math.max(
          worstMoney,
          Math.abs(countryMoney(tier) - money) / row.sales,
        );
        // People change only by births, deaths and arrivals from abroad: a move between states takes nobody out of the country.
        worstPeople = Math.max(
          worstPeople,
          Math.abs(
            row.population - (people + row.births - row.deaths + row.arrived),
          ) / row.population,
        );
        people = row.population;
        if (!problems.length) problems = countryProblems(tier);
      },
    });
    process.stderr.write(
      `${where}: 240 months, unemployment ${months[0]!.unemploymentPct.toFixed(2)} to ${months.at(-1)!.unemploymentPct.toFixed(2)}%, money off by ${worstMoney.toExponential(1)} of a month's sales at most, people by ${worstPeople.toExponential(1)}\n`,
    );
    // Never more people at work than people, never a negative count, never a job no worker holds.
    expect(problems, where).toEqual([]);
    expect(worstMoney, where).toBeLessThan(1e-9);
    expect(worstPeople, where).toBeLessThan(1e-9);
    for (const row of months) {
      expect(Number.isFinite(row.unemploymentPct), where).toBe(true);
      expect(row.jobs, where).toBeLessThanOrEqual(row.population);
    }
  }, 120_000);

  it("over twenty years with no law changed, the federal ledger's yearly surplus against what the country sells stays well under the fixed law's where the law indexes its amounts", () => {
    // Each year's change in the federal ledger, as a share of the year's sales.
    const balances = (indexed: boolean) => {
      const years: number[] = [];
      let cash = 0,
        sales = 0,
        started = 0;
      run(240, {
        indexed,
        each(tier, row, before) {
          if (!started) {
            started = 1;
            cash = before.federalCash;
          }
          sales += row.sales;
          if (row.month % 12 === 0) {
            years.push((tier.federalCash - cash) / sales);
            cash = tier.federalCash;
            sales = 0;
          }
        },
      });
      return years;
    };
    const indexed = balances(true);
    const fixed = balances(false);
    const mean = (rows: number[]) =>
      rows.reduce((sum, value) => sum + value, 0) / rows.length;
    const early = (rows: number[]) => mean(rows.slice(2, 5));
    const late = (rows: number[]) => mean(rows.slice(-3));
    const said = (rows: number[]) =>
      rows.map((value) => (value * 100).toFixed(2)).join(" ");
    process.stderr.write(
      `${where}: federal balance by year, percent of sales; indexed: ${said(indexed)}; fixed: ${said(fixed)}\n`,
    );
    // The fixed law's surplus climbs as pay outruns its brackets; the
    // indexed law's ends well under it. What is left of the climb is real pay
    // outgrowing prices (the law indexes to prices, as the statutes do) and
    // flows other than the tax on pay (pool item
    // nation-federal-balance-climbs-with-no-tax-drift).
    expect(late(fixed) - early(fixed), where).toBeGreaterThan(0);
    expect(late(indexed), where).toBeLessThan(late(fixed) * 0.8);
  }, 600_000);

  it("two worlds left alone are the same world", () => {
    const a = run(24),
      b = run(24);
    expect(a.months, where).toEqual(b.months);
  });

  it("a state that ends its income tax pays its workers more, takes in less and budgets less; a state with none is unchanged", () => {
    const base = run(36);
    const twin = run(36, { change: noIncomeTax("state", picked.key) });
    const taxed =
      lawOf().withheld(stateOf(base.tier, picked.usps), 60_000).state > 0;
    const own = (r: Run) => stateOf(r.tier, picked.usps);
    process.stderr.write(
      `${where}: income tax ${taxed ? "ended" : "never had"}; budget $${Math.round(own(base).ledger.budgetYear / 1e6)}m -> $${Math.round(own(twin).ledger.budgetYear / 1e6)}m; people ${Math.round(countryPeople(own(base)))} -> ${Math.round(countryPeople(own(twin)))}; unemployment ${(100 * countryUnemployment(own(base))).toFixed(2)} -> ${(100 * countryUnemployment(own(twin))).toFixed(2)}; national ${base.months.at(-1)!.unemploymentPct.toFixed(3)} -> ${twin.months.at(-1)!.unemploymentPct.toFixed(3)}\n`,
    );
    if (!taxed) {
      expect(twin.months, where).toEqual(base.months);
      return;
    }
    // The law reached the state's own ledger, and through its people the rest of the country.
    expect(own(twin).ledger.budgetYear, where).toBeLessThan(
      own(base).ledger.budgetYear,
    );
    expect(countryPeople(own(twin)), where).not.toBe(countryPeople(own(base)));
    expect(countryUnemployment(own(twin)), where).not.toBe(
      countryUnemployment(own(base)),
    );
    expect(twin.months.at(-1)!.unemploymentPct, where).not.toBe(
      base.months.at(-1)!.unemploymentPct,
    );
    // Another state's own tax was not changed: it moved only through trade and movers.
    const other = base.tier.states.find((row) => row.usps !== picked.usps)!;
    expect(
      lawOf(noIncomeTax("state", picked.key)).withheld(other, 60_000),
      where,
    ).toEqual(lawOf().withheld(other, 60_000));
  }, 120_000);

  it("ending the nation's income tax leaves people more to spend: more jobs in the first year, and the nation's ledger pays for it", () => {
    const base = run(12);
    const twin = run(12, { change: noIncomeTax("federal") });
    process.stderr.write(
      `${where}: nation's income tax ended; unemployment after a year ${base.months.at(-1)!.unemploymentPct.toFixed(2)} -> ${twin.months.at(-1)!.unemploymentPct.toFixed(2)}%, federal cash $${Math.round(base.tier.federalCash / 1e9)}bn -> $${Math.round(twin.tier.federalCash / 1e9)}bn\n`,
    );
    expect(twin.months.at(-1)!.unemploymentPct, where).toBeLessThan(
      base.months.at(-1)!.unemploymentPct,
    );
    expect(twin.months.at(-1)!.jobs, where).toBeGreaterThan(
      base.months.at(-1)!.jobs,
    );
    expect(twin.tier.federalCash, where).toBeLessThan(base.tier.federalCash);
  }, 120_000);

  it("a disaster that ends jobs in one state raises its share out of work, and nothing schedules the recovery", () => {
    const lost = 0.05,
      month = 6;
    const base = run(18);
    const twin = run(18, {
      jobsLost: (state, at) =>
        state.usps === picked.usps && at === month ? lost : 0,
    });
    const at = (r: Run) => countryUnemployment(stateOf(r.tier, picked.usps));
    process.stderr.write(
      `${where}: ${lost * 100}% of jobs ended in month ${month}; a year on, out of work ${(100 * at(base)).toFixed(2)} -> ${(100 * at(twin)).toFixed(2)}%\n`,
    );
    expect(at(twin), where).toBeGreaterThan(at(base));
    // Before the disaster the two worlds were the same.
    expect(twin.months.slice(0, month - 1), where).toEqual(
      base.months.slice(0, month - 1),
    );
  }, 120_000);

  it("a higher central bank rate costs jobs within the year", () => {
    const base = run(12);
    const twin = run(12, { rate: () => RATE + 0.03 });
    process.stderr.write(
      `${where}: rate 3 points higher; unemployment after a year ${base.months.at(-1)!.unemploymentPct.toFixed(2)} -> ${twin.months.at(-1)!.unemploymentPct.toFixed(2)}%\n`,
    );
    expect(twin.months.at(-1)!.unemploymentPct, where).toBeGreaterThan(
      base.months.at(-1)!.unemploymentPct,
    );
  }, 120_000);

  it("a sector's firms are spread around its pace: some end jobs while others open them", () => {
    const still = spreadFlows(0, rules.firmSpread);
    expect(still.ended).toBeGreaterThan(0);
    expect(still.ended).toBeCloseTo(still.opened, 12);
    const growing = spreadFlows(0.01, rules.firmSpread);
    // The net of the two is the sector's pace.
    expect(growing.opened - growing.ended).toBeCloseTo(0.01, 6);
    expect(growing.ended).toBeGreaterThan(0);
  });
});

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
