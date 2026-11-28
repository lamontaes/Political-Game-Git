import jobsParameters from "./data/jobs/parameters.json" with { type: "json" };
import { parameter } from "./parameters";

/**
 * A household's income is its parts, and every reader takes the parts it
 * means (owner's people audit, row P1): an open job's pay (wages), an income
 * award paid to the household (retirement, survivors), and the parts other
 * engines own and name beside these (public assistance, veterans' payments,
 * Supplemental Security Income, retirement claims, a counted household's
 * unplaced workers). The readers differ on purpose, and each says which
 * parts it adds: the income fifths, the poverty line, moves' monthly pay,
 * the housing opening's ranking, a lender's view built on earned wages.
 *
 * What they share is one definition of each part and one days-per-year.
 * Each reader keeps its own order of adding, so a part's yearly figure never
 * moves with the reader that asks.
 */

/** Days a year's pay is counted over, for every reader of a household's income (`jobsDaysPerYear`). */
export const DAYS_PER_YEAR: number = jobsParameters.jobsDaysPerYear.value;

const MONTHS_PER_YEAR = parameter("monthsPerYear");

/** What an open job pays in a year, in minor units; none for a job that has ended. */
export function jobYearMinor(job: {
  readonly wageDailyMinor: number;
  readonly endsAt?: string | undefined;
}): number {
  return job.endsAt === undefined ? job.wageDailyMinor * DAYS_PER_YEAR : 0;
}

/** What an income award pays in a year, in minor units; none for a contract that pays no income or has ended. */
export function awardYearMinor(contract: {
  readonly amountMinor: number;
  readonly periodMonths: number;
  readonly recipientIncome?: object | undefined;
  readonly endedAt?: string | undefined;
}): number {
  return contract.recipientIncome && !contract.endedAt
    ? (contract.amountMinor * MONTHS_PER_YEAR) /
        Math.max(1, contract.periodMonths)
    : 0;
}
