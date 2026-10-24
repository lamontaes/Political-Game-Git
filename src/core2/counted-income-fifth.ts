import COUNTED_ROWS from "./data/counted/parameters.json" with { type: "json" };
import type { CoreState } from "./types";

const COUNTED = COUNTED_ROWS as unknown as Readonly<
  Record<string, { value: number }>
>;
const CENTS_PER_DOLLAR = 100;
const FIFTH_LIMITS = [1, 2, 3, 4].map(
  (i) =>
    COUNTED[`countedIncomeFifthLimit${i}Dollars`]!.value * CENTS_PER_DOLLAR,
);

/** The national household-income fifth a yearly income (in minor units) falls in, 0 to 4. */
export function incomeBandOf(incomeMinorYear: number): number {
  let band = 0;
  FIFTH_LIMITS.forEach((limit, at) => {
    if (incomeMinorYear > limit) band = at + 1;
  });
  return band;
}

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;

/**
 * Each full household's yearly income, from its members' jobs and its
 * recorded income awards: the sources a counted household's income is read
 * from (residents' householdIncome), so a household filled in keeps the
 * income it had. A counted household's unplaced workers' pay is a job by then
 * (fill-in starts it as a job outside the town).
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
  return income;
}
