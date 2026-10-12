import { addDays, makeIsoDate, type IsoDate } from "./calendar";
import type { MunicipalElectionTiming } from "../../simulation/municipal-election-rules";
import type { ResolvedMunicipalElectionTiming } from "../../simulation/municipal-ballot-rules";
export type TownElectionBasis = Exclude<
  "state-law-unverified" | "local-choice-estimated" | "national-estimated",
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

export function novemberGeneralElectionDay(year: number): IsoDate {
  for (let day = 2; day <= 8; day += 1) {
    const date = new Date(Date.UTC(year, 10, day));
    if (date.getUTCDay() === 2)
      return makeIsoDate(date.toISOString().slice(0, 10));
  }
  throw new Error(`No November election day found in ${year}.`);
}

export function nextTownElection(
  found: ResolvedMunicipalElectionTiming | null,
  onDate: IsoDate,
  filingLeadDays: number,
): TownElection | null {
  if (!found) return null;
  const parity = NOVEMBER_PARITY[found.timing];
  if (parity === undefined) return null;
  const earliest = addDays(onDate, filingLeadDays);
  for (let year = Number(onDate.slice(0, 4)); ; year += 1) {
    if (year % 2 !== parity) continue;
    const day = novemberGeneralElectionDay(year);
    if (day >= earliest)
      return { electionDate: day, timing: found.timing, basis: found.basis };
  }
}
