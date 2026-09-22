import type { IsoDate } from "../types";
import { fieldClosingDate } from "./state-executive-turnover-calendar";
import {
  generalElectionDay,
  isElectionYear,
  type ElectionTimingRule,
} from "./state-executive-term-rules";

/**
 * When a state legislative seat is next on the ballot.
 *
 * Before this, every legislative filing was decided 28 days after it was made,
 * so a race filed in August was over in September. A state legislature is
 * elected at the state's regular general election, and this is that calendar.
 *
 * GAME PROFILE, not sourced per state. What it applies:
 * - Forty-six states elect their legislatures in even-numbered years, on the
 *   general election day (the Tuesday after the first Monday in November).
 * - New Jersey and Virginia elect theirs in odd-numbered years, and Louisiana
 *   and Mississippi every four years in odd-numbered years (2023, 2027).
 *
 * Marked as not modelled, with the blanket rule applied:
 * - Staggered senate terms. Most state senates elect about half their seats at
 *   each election, and which seats are up is set by district. Blanket rule:
 *   every seat in a chamber is on the ballot at the state's next regular
 *   legislative election.
 * - Louisiana holds its elections on Saturdays with an October primary.
 *   Blanket rule: its general election is dated like everyone else's.
 * - Primaries, filing deadlines and petitions. Blanket rule: the field closes
 *   the same 60 days before the election as the governorship's does, and a
 *   filing after that stands in the following regular election.
 * Filed with ChatGPT as `state-legislative-election-calendars`.
 */
export const STATE_LEGISLATIVE_CALENDAR_PROFILE =
  "ocd-state-legislative-calendar-game-profile/v1";

const EVEN_YEARS: ElectionTimingRule = {
  cycleYears: 2,
  referenceYear: 2026,
  day: "first-tuesday-after-first-monday-in-november",
};

const ODD_YEAR_STATES: Readonly<Record<string, ElectionTimingRule>> = {
  NJ: {
    cycleYears: 2,
    referenceYear: 2025,
    day: "first-tuesday-after-first-monday-in-november",
  },
  VA: {
    cycleYears: 2,
    referenceYear: 2025,
    day: "first-tuesday-after-first-monday-in-november",
  },
  LA: {
    cycleYears: 4,
    referenceYear: 2027,
    day: "first-tuesday-after-first-monday-in-november",
  },
  MS: {
    cycleYears: 4,
    referenceYear: 2027,
    day: "first-tuesday-after-first-monday-in-november",
  },
};

export function stateLegislativeElectionRule(
  stateUsps: string,
): ElectionTimingRule {
  return ODD_YEAR_STATES[stateUsps.toUpperCase()] ?? EVEN_YEARS;
}

export interface StateLegislativeElection {
  readonly electionDate: IsoDate;
  /** The day the field closes: a filing must come before it. */
  readonly fieldClosesOn: IsoDate;
  readonly basis: typeof STATE_LEGISLATIVE_CALENDAR_PROFILE;
}

/**
 * The regular legislative election a filing made on `onDate` stands in: the
 * next one whose field is still open.
 */
export function nextStateLegislativeElection(
  stateUsps: string,
  onDate: IsoDate,
): StateLegislativeElection {
  const rule = stateLegislativeElectionRule(stateUsps);
  for (let year = Number(onDate.slice(0, 4)); ; year += 1) {
    if (!isElectionYear(rule, year)) continue;
    const electionDate = generalElectionDay(rule, year);
    const closes = fieldClosingDate(electionDate);
    if (onDate < closes)
      return {
        electionDate,
        fieldClosesOn: closes,
        basis: STATE_LEGISLATIVE_CALENDAR_PROFILE,
      };
  }
}
