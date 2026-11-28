/**
 * The country tier's month, as pure math (country-model.ts): every state opened from the world's
 * own figures under the starting law, then stepped by the month. The world (its seed) and the
 * state a law is changed in are drawn each run and printed, so a failure can be replayed with
 * COUNTRY_SEED and COUNTRY_STATE.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  countryLaw,
  federalSpendingReader,
  startingLawReader,
} from "./country-law";
import { publishedStateStake } from "./budget-stakes";
import spendingResearch from "../../data/research/federal/federal-spending-by-state-fy2024.json" with { type: "json" };
import federalBudget from "../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import {
  COUNTRY_AGE_BANDS,
  COUNTRY_SECTORS,
  countryMoney,
  countryPeople,
  countryProblems,
  countryRules,
  countryTotals,
  countryUnemployment,
  openCountry,
  resolveCountryPart,
  spreadFlows,
  stepCountry,
  type CountryMonth,
  type CountryPart,
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
/** The federal budget in force: the FY 2025 outlays, in dollars, with any line changed by a share. */
const federalOf = (raised: Readonly<Record<string, number>> = {}) =>
  federalSpendingReader(
    {
      id: Object.keys(raised).length
        ? "budget:test:raised"
        : "budget:test:base",
      spendingMinor: Object.fromEntries(
        Object.entries(federalBudget.outlays).map(([line, dollars]) => [
          line,
          dollars * (1 + (raised[line] ?? 0)),
        ]),
      ),
    },
    (stateKey, line) => publishedStateStake(stateKey, `budget-line:${line}`),
    1,
    spendingResearch.population,
  );
const BASE_FEDERAL = federalOf();
const lawOf = (change?: Change, index?: TaxIndex, federal = BASE_FEDERAL) =>
  countryLaw(
    change
      ? (stateKey, series) => change(stateKey, series, read(stateKey, series))
      : read,
    p,
    start,
    index,
    federal,
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
    /** The federal budget in force from the first month on. */
    federal?: ReturnType<typeof federalOf>;
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
        law: lawOf(options.change, index, options.federal),
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

  it("a part that counted more workers than people in a band resolves to jobs equal to its workers", () => {
    const tier = openCountry(opening, lawOf(), rules);
    const state = tier.states[0]!;
    // Every band counts a tenth more workers than it has people, and as many jobs as workers.
    const people = COUNTRY_AGE_BANDS.map(() => 1000);
    const workers = people.map((n) => n * 1.1);
    const total = sum(workers);
    const part = resolveCountryPart(state, {
      people,
      workers,
      seekers: people.map(() => 0),
      children: 0,
      cash: 0,
      jobs: { [COUNTRY_SECTORS[0]!]: total },
      unsortedJobs: 0,
    });
    const jobs = sum(COUNTRY_SECTORS.map((sector) => part.jobs[sector]));
    expect(sum(part.workers), where).toBeCloseTo(sum(people), 6);
    expect(jobs, `${where}: jobs equal workers`).toBeCloseTo(
      sum(part.workers),
      6,
    );
    // A part whose counts already fit is left as it was.
    const fits = resolveCountryPart(state, {
      people,
      workers: people.map((n) => n * 0.5),
      seekers: people.map(() => 0),
      children: 0,
      cash: 0,
      jobs: { [COUNTRY_SECTORS[0]!]: sum(people) * 0.5 },
      unsortedJobs: 0,
    });
    expect(
      sum(COUNTRY_SECTORS.map((sector) => fits.jobs[sector])),
      where,
    ).toBeCloseTo(sum(people) * 0.5, 6);
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

  it("a federal budget line raised a tenth reaches every state's cells by the state's stake, and the nation's output and jobs follow", () => {
    const base = run(12);
    const twin = run(12, { federal: federalOf({ socialSecurity: 0.1 }) });
    const own = (r: Run) => stateOf(r.tier, picked.usps);
    const paid = (r: Run) => own(r).whatMoved.at(-1)!.federal;
    const line = (r: Run) =>
      paid(r).lines.find((row) => row.line === "socialSecurity")!.dollars;
    process.stderr.write(
      `${where}: Social Security in ${picked.usps} $${Math.round(line(base) / 1e6)}m -> $${Math.round(line(twin) / 1e6)}m a month; benefits $${Math.round(paid(base).transfers / 1e6)}m -> $${Math.round(paid(twin).transfers / 1e6)}m; national output ${base.months.at(-1)!.realOutput.toFixed(0)} -> ${twin.months.at(-1)!.realOutput.toFixed(0)}, unemployment ${base.months.at(-1)!.unemploymentPct.toFixed(3)} -> ${twin.months.at(-1)!.unemploymentPct.toFixed(3)}` +
        "\n",
    );
    // The line read is the budget row's, and the state's benefits follow it.
    expect(paid(twin).budgetId, where).toBe("budget:test:raised");
    expect(line(twin), where).toBeGreaterThan(line(base));
    // Every state's households were paid more, as each state's stake in the line has it.
    for (const state of twin.tier.states)
      expect(
        state.whatMoved.at(-1)!.federal.transfers,
        `${where}: ${state.usps}`,
      ).toBeGreaterThan(
        stateOf(base.tier, state.usps).whatMoved.at(-1)!.federal.transfers,
      );
    // The nation's row, the states' sum, follows.
    expect(twin.months.at(-1)!.realOutput, where).not.toBe(
      base.months.at(-1)!.realOutput,
    );
    expect(twin.months.at(-1)!.unemploymentPct, where).not.toBe(
      base.months.at(-1)!.unemploymentPct,
    );
  }, 120_000);

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

describe(`a part whose workers are sorted by a survey of private employers: ${where}`, () => {
  it("counts the state's own government share of them in government, and every one of them once", () => {
    const tier = openCountry(opening, lawOf(), rules);
    const state = stateOf(tier, picked.usps);
    const total = sum(state.sectors.map((row) => row.jobs));
    const government = state.sectors.find(
      (row) => row.sector === "government",
    )!.jobs;
    const zero = COUNTRY_AGE_BANDS.map(() => 0);
    const surveyed = Object.fromEntries(
      state.sectors
        .filter((row) => row.sector !== "government")
        .map((row) => [row.sector, 0.01 * row.jobs]),
    );
    const jobs = sum(Object.values(surveyed));
    const part = resolveCountryPart(state, {
      people: COUNTRY_AGE_BANDS.map(() => jobs),
      workers: COUNTRY_AGE_BANDS.map(() => jobs / COUNTRY_AGE_BANDS.length),
      seekers: zero,
      children: 0,
      jobs: {},
      unsortedJobs: 0,
      privateSurveyJobs: surveyed,
      cash: 0,
    });
    expect(sum(Object.values(part.jobs)), where).toBeCloseTo(jobs, 6);
    expect(part.jobs.government / jobs, where).toBeCloseTo(
      government / total,
      9,
    );
    expect(part.jobs.government, where).toBeGreaterThan(0);
  });
});

describe(`a played part that is more than its state: ${where}`, () => {
  // A played town can count more people and jobs than the tier gives its whole
  // state (Washington, D.C., Nov 11: 378,048 jobs against the state's 324,579).
  // The part takes what the state holds, the rest is left with nothing, and the
  // part's books come back with it. Before, the rest kept floating-point
  // leftovers (4.5e-13 jobs) whose books a whole sector was later scaled from:
  // its prices doubled in two months and its investment reached 7e20.
  it("leaves the rest with nothing, gives the part's books back, and moves no state's prices past a normal month", () => {
    const more = 1.15;
    const partOf = (state: CountryState): CountryPart => {
      const byBand = (pick: (cell: CountryState["cells"][number]) => number) =>
        COUNTRY_AGE_BANDS.map(
          (_, band) =>
            more *
            sum(
              state.cells
                .filter((cell) => cell.band === band)
                .map((cell) => pick(cell)),
            ),
        );
      return {
        people: byBand((cell) => cell.people),
        workers: byBand((cell) => cell.workers),
        seekers: byBand((cell) => cell.seekers),
        children: state.children,
        jobs: Object.fromEntries(
          state.sectors.map((row) => [row.sector, more * row.jobs]),
        ) as CountryPart["jobs"],
        cash: 0,
      };
    };
    const alone = openCountry(opening, lawOf(), rules);
    const played = openCountry(opening, lawOf(), rules);
    const part = partOf(stateOf(played, picked.usps));
    // The month's normal rise: the largest any state's prices make in a month left alone.
    let normal = 0;
    for (let month = 1; month <= 3; month++) {
      const before = alone.states.map((state) => state.prices);
      stepCountry(alone, { law: lawOf(), policyRate: RATE }, rules);
      alone.states.forEach((state, at) => {
        normal = Math.max(normal, state.prices / before[at]! - 1);
      });
      stepCountry(
        played,
        {
          law: lawOf(),
          policyRate: RATE,
          parts: (state) =>
            state.usps === picked.usps ? { out: part, in: part } : undefined,
        },
        rules,
      );
      expect(countryProblems(played), `${where}, month ${month}`).toEqual([]);
      played.states.forEach((state, at) => {
        const own = alone.states[at]!;
        const said = `${where}, month ${month}, ${state.usps}: prices ${state.prices} against ${own.prices} left alone, a normal month ${normal}`;
        expect(Number.isFinite(state.prices), said).toBe(true);
        expect(
          Math.abs(state.prices / own.prices - 1),
          said,
        ).toBeLessThanOrEqual(normal);
      });
    }
    // The state's sectors hold the part's jobs and the books that go with them.
    const state = stateOf(played, picked.usps);
    for (const sector of COUNTRY_SECTORS) {
      const row = state.sectors.find((cell) => cell.sector === sector)!;
      const own = stateOf(alone, picked.usps).sectors.find(
        (cell) => cell.sector === sector,
      )!;
      expect(row.jobs, `${where}, ${sector}`).toBeGreaterThanOrEqual(
        part.jobs[sector],
      );
      if (own.jobs > 0)
        expect(
          row.expectedSales / row.jobs / (own.expectedSales / own.jobs),
          `${where}, ${sector}: expected sales per job against the state left alone`,
        ).toBeCloseTo(1, 1);
    }
  });
});

describe(`a played part where nobody is on record looking: ${where}`, () => {
  // The played town and its county are counted from their own records, and those can hold a
  // different share looking than the state (Waimanalo, Hawaii, Nov 17: 503,863 at work and
  // nobody looking, in a state at 3.3%). The rest of the state then holds every seeker. The
  // month-1 fit used the whole state's share against the rest's people, hired three in four
  // seekers a month from then on, and the state's rate fell 3.32, 0.23, 0.06, 0.02 toward zero.
  const share = 0.3 + (0.5 * Number.parseInt(seed.slice(6, 10), 16)) / 0xffff;
  const said = `${where}, a part of ${(100 * share).toFixed(1)}% of the state`;
  const partOf = (state: CountryState): CountryPart => {
    const byBand = (pick: (cell: CountryState["cells"][number]) => number) =>
      COUNTRY_AGE_BANDS.map(
        (_, band) =>
          share *
          sum(
            state.cells
              .filter((cell) => cell.band === band)
              .map((cell) => pick(cell)),
          ),
      );
    return {
      people: byBand((cell) => cell.people),
      workers: byBand((cell) => cell.workers),
      seekers: COUNTRY_AGE_BANDS.map(() => 0),
      children: share * state.children,
      jobs: Object.fromEntries(
        state.sectors.map((row) => [row.sector, share * row.jobs]),
      ) as CountryPart["jobs"],
      cash: 0,
    };
  };
  const months = 120;
  /** Ten years with the part out of the drawn state each month, and the state's rate after each month. */
  const played = (jobsLost?: (month: number) => number) => {
    const tier = openCountry(opening, lawOf(), rules);
    const state = stateOf(tier, picked.usps);
    const part = partOf(state);
    const working = sum(part.workers);
    /** The rest's own share looking: the state's seekers (the part holds none) over the rest's workers and them. */
    const rest = () => {
      const seekers = sum(state.cells.map((cell) => cell.seekers));
      const workers = sum(state.cells.map((cell) => cell.workers)) - working;
      return seekers / (seekers + workers);
    };
    const rates = [countryUnemployment(state)];
    const rests = [rest()];
    for (let month = 1; month <= months; month++) {
      stepCountry(
        tier,
        {
          law: lawOf(),
          policyRate: RATE,
          jobsLost: (row) =>
            row.usps === picked.usps ? (jobsLost?.(month) ?? 0) : 0,
          parts: (row) =>
            row.usps === picked.usps ? { out: part, in: part } : undefined,
        },
        rules,
      );
      rates.push(countryUnemployment(state));
      rests.push(rest());
    }
    return { tier, rates, rests };
  };

  it("fits the first month to the people it steps: as many of the rest find work as came to look", () => {
    const { rests } = played();
    // The fit's own meaning, for the people it is fitted on: the share looking is where it started.
    expect(rests[1]! / rests[0]!, said).toBeCloseTo(1, 6);
  });

  it("opens the rest with no sector short of staff or over, whatever sectors the part's jobs are in", () => {
    // A part's jobs are not in its state's proportions (Waimanalo, Hawaii, Nov 17: the rest
    // was left with 24,389 jobs in education and health against 70,314 its people wanted
    // staffed, and 133,719 in government against 60,443). The drawn sector goes almost whole
    // to the part and the others by the part's share.
    const drawnSector =
      COUNTRY_SECTORS[
        Number.parseInt(seed.slice(2, 6), 16) % COUNTRY_SECTORS.length
      ]!;
    const tier = openCountry(opening, lawOf(), rules);
    const state = stateOf(tier, picked.usps);
    const part = partOf(state);
    const row = state.sectors.find((cell) => cell.sector === drawnSector)!;
    const moved = 0.9 * row.jobs - part.jobs[drawnSector];
    // The same jobs in all, so the part's workers still hold one each.
    const others = sum(
      COUNTRY_SECTORS.filter((sector) => sector !== drawnSector).map(
        (sector) => part.jobs[sector],
      ),
    );
    for (const sector of COUNTRY_SECTORS)
      part.jobs[sector] =
        sector === drawnSector
          ? 0.9 * row.jobs
          : part.jobs[sector] * (1 - moved / others);
    const rest = state.sectors.map(
      (cell) => cell.jobs - part.jobs[cell.sector],
    );
    stepCountry(
      tier,
      {
        law: lawOf(),
        policyRate: RATE,
        parts: (at) =>
          at.usps === picked.usps ? { out: part, in: part } : undefined,
      },
      rules,
    );
    // With what each sector is asked for level with what it sells, no sector is shorter of
    // staff than another: every private sector ends the same share of its jobs (its spread of
    // firms in a month when all are asked for the same), and the public sector ends none.
    const cut = state.whatMoved.at(-1)!.jobsCut;
    // A sector the state has no jobs in (the District of Columbia has no mining) has no firms
    // to balance and is no part of the case.
    const staffed = state.sectors.flatMap((cell, at) =>
      rest[at]! > 0 ? [{ cell, at, share: cut[at]! / rest[at]! }] : [],
    );
    const firms = staffed.filter((row) => row.cell.sector !== "government");
    expect(firms.length, said).toBeGreaterThan(1);
    const first = firms[0]!.share;
    expect(first, said).toBeGreaterThan(0);
    for (const { cell, at, share } of staffed) {
      const where = `${said}, ${cell.sector} (${drawnSector} went to the part): ${cut[at]} of ${rest[at]} jobs ended in the first month`;
      expect(share, where).toBeCloseTo(
        cell.sector === "government" ? 0 : first,
        9,
      );
    }
  });

  it("over ten years a layoff in the state moves its rate, and nothing brings it back on a schedule", () => {
    const base = played();
    process.stderr.write(
      `${said}: out of work, each January, ${base.rates
        .filter((_, month) => month % 12 === 0)
        .map((rate) => (100 * rate).toFixed(2))
        .join(", ")}\n`,
    );
    // Its own jobs move it: a layoff in year five leaves more out of work a year later.
    const lost = 0.05,
      month = 60;
    const twin = played((at) => (at === month ? lost : 0));
    expect(twin.rates.slice(0, month), said).toEqual(
      base.rates.slice(0, month),
    );
    expect(twin.rates[month]!, said).toBeGreaterThan(base.rates[month]!);
    expect(twin.rates[month + 12]!, said).toBeGreaterThan(
      base.rates[month + 12]!,
    );
  }, 240_000);
});

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
