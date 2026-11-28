import {
  assistanceIncomeByHousehold,
  veteransIncomeByHousehold,
} from "./modules/laws";
import { awardYearMinor, jobYearMinor } from "./household-income";
import type { CoreState } from "./types";
export {
  incomeBandOf,
  incomeBandOn,
  wageIndexToday,
} from "./counted-income-reads";

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
    if (home) income.set(home, (income.get(home) ?? 0) + jobYearMinor(job));
  }
  for (const contract of core.finance.contracts.values()) {
    const award = contract.recipientIncome;
    if (!award || contract.endedAt) continue;
    income.set(
      award.householdId,
      (income.get(award.householdId) ?? 0) + awardYearMinor(contract),
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
