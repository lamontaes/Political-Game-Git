import { addDays, makeIsoDate } from "../dates";
import type { IsoDate } from "../types";
import { resolveMunicipalElectionTiming } from "../municipal-ballot-rules";
import type { MunicipalBallotRuleBasis } from "../municipal-ballot-rules";
import type { MunicipalElectionTiming } from "../municipal-election-rules";
import { MEDIAN_FILING_GAP_DAYS } from "../nominations/filing-gap";

/**
 * When a town's own governing body is next elected.
 *
 * Only where the state's municipal election law puts town elections on the
 * November general election day is a date given, because only there does the
 * law fix the day: the Tuesday after the first Monday in November, in the even
 * or odd years the state names. Every other timing in the state packs (spring,
 * town meeting day, a June or August consolidated date) names a season or an
 * event whose exact day the game has not read, so no date is made up for it.
 *
 * Which timing a town has is read through `resolveMunicipalElectionTiming`,
 * the one authorized reader of the state packs, and carries its label: the
 * packs are unaudited, so a state's rule is `state-law-unverified`, and where
 * the law leaves the choice to each town with no default, the town takes the
 * allowed option the most state packs name (`local-choice-estimated`).
 *
 * ESTIMATED FROM AVERAGE, pending research question
 * `town-election-calendar-from-state-municipal-law`: a filing must come at
 * least `FILING_LEAD_DAYS` before the first vote. No town's own filing
 * deadline is read, so every town in all 56 places uses the national median
 * candidate filing lead (`MEDIAN_FILING_GAP_DAYS`, 85 days in the FEC's 2026
 * filing-deadline table; see `MEDIAN_FILING_GAP_SOURCE`). It replaces a
 * blanket 28 days that no source backed. The same number is the whole race
 * where no date is known.
 */
export const FILING_LEAD_DAYS: number = MEDIAN_FILING_GAP_DAYS;
export { MEDIAN_FILING_GAP_SOURCE as FILING_LEAD_SOURCE } from "../nominations/filing-gap";

export type TownElectionBasis = Exclude<
  MunicipalBallotRuleBasis,
  "national-estimated"
>;

export interface TownElection {
  readonly electionDate: IsoDate;
  readonly timing: MunicipalElectionTiming;
  readonly basis: TownElectionBasis;
}

const NOVEMBER_PARITY: Partial<Record<MunicipalElectionTiming, 0 | 1>> = {
  "even-year-november-consolidated": 0,
  "odd-year-november-consolidated": 1,
};

/** The Tuesday after the first Monday in November of a year. */
export function novemberGeneralElectionDay(year: number): IsoDate {
  // November 2 through 8: the first Tuesday that follows a Monday in November.
  for (let day = 2; day <= 8; day += 1) {
    const date = new Date(Date.UTC(year, 10, day));
    if (date.getUTCDay() === 2)
      return makeIsoDate(date.toISOString().slice(0, 10));
  }
  throw new Error(`No November election day found in ${year}.`);
}

/**
 * The town's next election at least `FILING_LEAD_DAYS` after `onDate`, or
 * null where the law read so far does not fix its day.
 */
export function nextTownElection(
  stateUsps: string,
  placeGeoid: string,
  onDate: IsoDate,
): TownElection | null {
  const found = resolveMunicipalElectionTiming(stateUsps, placeGeoid);
  if (!found) return null;
  const parity = NOVEMBER_PARITY[found.timing];
  if (parity === undefined) return null;
  const earliest = addDays(onDate, FILING_LEAD_DAYS);
  for (let year = Number(onDate.slice(0, 4)); ; year += 1) {
    if (year % 2 !== parity) continue;
    const day = novemberGeneralElectionDay(year);
    if (day >= earliest)
      return { electionDate: day, timing: found.timing, basis: found.basis };
  }
}
