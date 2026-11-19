import COUNTED_ROWS from "./data/counted/parameters.json" with { type: "json" };
import { assistanceIncomeByHousehold } from "./law-reach/group-b-money";
import { veteransIncomeByHousehold } from "./law-reach/group-b-veterans";
import { sinceOpeningIndex } from "./tax-index";
import type { CoreAPI, CoreState } from "./types";

const COUNTED = COUNTED_ROWS as unknown as Readonly<
  Record<string, { value: number }>
>;
const CENTS_PER_DOLLAR = 100;
const FIFTH_LIMITS = [1, 2, 3, 4].map(
  (i) =>
    COUNTED[`countedIncomeFifthLimit${i}Dollars`]!.value * CENTS_PER_DOLLAR,
);

/**
 * The national household-income fifth a yearly income (in minor units) falls
 * in, 0 to 4. The limits are written in the source year's dollars; `wageIndex`
 * is how far this world's own average pay has moved since it opened
 * (`sinceOpeningIndex`, read once per pass), 1 on day one.
 * stopgapId: SG-WORLD-tax-index-january
 */
export function incomeBandOf(
  incomeMinorYear: number,
  wageIndex: number,
): number {
  let band = 0;
  FIFTH_LIMITS.forEach((limit, at) => {
    if (incomeMinorYear > limit * wageIndex) band = at + 1;
  });
  return band;
}

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;

/**
 * Each full household's yearly income, from its members' jobs, its income
 * awards, and its recorded public benefits. A counted household's unplaced
 * workers' pay is a job by then (fill-in starts it as a job outside town).
 */
export function fullHouseholdIncomes(core: CoreState): Map<string, number> {
  const income = new Map<string, number>();
  for (const job of core.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const home = core.people.get(job.personId)?.householdId;
    if (home)
      income.set(
        home,
        (income.get(home) ?? 0) + job.wageDailyMinor * DAYS_PER_YEAR,
      );
  }
  for (const contract of core.finance.contracts.values()) {
    const award = contract.recipientIncome;
    if (!award || contract.endedAt) continue;
    income.set(
      award.householdId,
      (income.get(award.householdId) ?? 0) +
        (contract.amountMinor * MONTHS_PER_YEAR) / contract.periodMonths,
    );
  }
  for (const benefits of [
    assistanceIncomeByHousehold(core),
    veteransIncomeByHousehold(core),
  ])
    for (const [householdId, amount] of benefits)
      if (core.households.has(householdId))
        income.set(householdId, (income.get(householdId) ?? 0) + amount);
  return income;
}

/** This world's average pay since it opened, read once a day for every reader of the fifths. */
const wageIndexReads = new WeakMap<object, { date: string; index: number }>();
export function wageIndexToday(api: CoreAPI): number {
  const core = api.state;
  let read = wageIndexReads.get(core);
  if (!read || read.date !== core.date)
    wageIndexReads.set(
      core,
      (read = { date: core.date, index: sinceOpeningIndex(api, "wages") }),
    );
  return read.index;
}

/** The national fifth a yearly income falls in today, in this world's own dollars: the one rule every engine reads. */
export function incomeBandOn(api: CoreAPI, incomeMinorYear: number): number {
  return incomeBandOf(incomeMinorYear, wageIndexToday(api));
}
