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
 * GAME PROFILE where no exact seat timing is reviewed. What it applies:
 * - Forty-six states elect their legislatures in even-numbered years, on the
 *   general election day (the Tuesday after the first Monday in November).
 * - New Jersey and Virginia elect theirs in odd-numbered years, and Louisiana
 *   and Mississippi every four years in odd-numbered years (2023, 2027).
 *
 * Marked as not modeled, with the blanket rule applied where an exact seat
 * cycle is absent: staggered terms and which district cohort is up. The
 * reviewed Kansas and Nebraska regular cycles below are explicit exceptions.
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

/**
 * Exact regular-election cohorts reviewed against official primary instruments.
 * These are runtime profiles with cited facts, not an import or admission of
 * the research-only civic-calendar corpus. Special elections are separate.
 */
export interface StateLegislativeSeatCycle {
  readonly stateUsps: string;
  readonly officeKey: string;
  readonly cohort: "all" | "even-ordinal" | "odd-ordinal";
  readonly election: ElectionTimingRule;
  readonly sourceStatus: "official-primary-reviewed-not-source-admitted";
  readonly sourceUrls: readonly string[];
  readonly sourceLocator: string;
}

const FOUR_YEAR_2024: ElectionTimingRule = {
  cycleYears: 4,
  referenceYear: 2024,
  day: "first-tuesday-after-first-monday-in-november",
};
const FOUR_YEAR_2026: ElectionTimingRule = {
  cycleYears: 4,
  referenceYear: 2026,
  day: "first-tuesday-after-first-monday-in-november",
};

export const REVIEWED_REGULAR_SEAT_CYCLES: readonly StateLegislativeSeatCycle[] =
  [
    {
      stateUsps: "KS",
      officeKey: "us-ks-legislature-profile-v1:house",
      cohort: "all",
      election: EVEN_YEARS,
      sourceStatus: "official-primary-reviewed-not-source-admitted",
      sourceUrls: [
        "https://www.kslegislature.gov/b2025_26/laws/025_000_0000_chapter/025_001_0000_article/025_001_0001_section/025_001_0001_k/",
      ],
      sourceLocator: "K.S.A. 25-101(a)(9)",
    },
    {
      stateUsps: "KS",
      officeKey: "us-ks-legislature-profile-v1:senate",
      cohort: "all",
      election: FOUR_YEAR_2024,
      sourceStatus: "official-primary-reviewed-not-source-admitted",
      sourceUrls: [
        "https://www.kslegislature.gov/b2025_26/laws/025_000_0000_chapter/025_001_0000_article/025_001_0001_section/025_001_0001_k/",
        "https://sos.ks.gov/elections/24elec/2024-General-Election-Official-Vote-Totals.pdf",
        "https://sos.ks.gov/media/press-releases/2026/06-01-26-candidate-filing-deadline-closes.html",
      ],
      sourceLocator:
        "K.S.A. 25-101(a)(8); 2024 Senate district returns and 2026 SOS filing list establish the cycle anchor",
    },
    {
      stateUsps: "NE",
      officeKey: "us-ne-legislature-v1:legislature",
      cohort: "even-ordinal",
      election: FOUR_YEAR_2026,
      sourceStatus: "official-primary-reviewed-not-source-admitted",
      sourceUrls: [
        "https://nebraskalegislature.gov/laws/statutes.php?statute=32-508",
      ],
      sourceLocator: "Neb. Rev. Stat. §32-508, even-numbered districts",
    },
    {
      stateUsps: "NE",
      officeKey: "us-ne-legislature-v1:legislature",
      cohort: "odd-ordinal",
      election: FOUR_YEAR_2024,
      sourceStatus: "official-primary-reviewed-not-source-admitted",
      sourceUrls: [
        "https://nebraskalegislature.gov/laws/statutes.php?statute=32-508",
      ],
      sourceLocator: "Neb. Rev. Stat. §32-508, odd-numbered districts",
    },
  ];

function cohortIncludes(
  cohort: StateLegislativeSeatCycle["cohort"],
  ordinal: number,
): boolean {
  return (
    cohort === "all" ||
    (cohort === "even-ordinal" && ordinal % 2 === 0) ||
    (cohort === "odd-ordinal" && ordinal % 2 === 1)
  );
}

/** The operative regular cycle for one exact seat, or the disclosed fallback. */
export function stateLegislativeSeatElectionRule(
  stateUsps: string,
  officeKey: string,
  ordinal: number | null,
): ElectionTimingRule {
  const reviewed = REVIEWED_REGULAR_SEAT_CYCLES.filter(
    (row) =>
      row.stateUsps === stateUsps.toUpperCase() && row.officeKey === officeKey,
  );
  if (reviewed.length === 0) return stateLegislativeElectionRule(stateUsps);
  if (ordinal === null || !Number.isInteger(ordinal) || ordinal < 1) {
    const wholeChamber = reviewed.find((row) => row.cohort === "all");
    if (wholeChamber) return wholeChamber.election;
    throw new Error(
      "Choose a recorded district to date this legislative race.",
    );
  }
  const cohort = reviewed.find((row) => cohortIncludes(row.cohort, ordinal));
  if (!cohort) throw new Error("No regular election cycle covers this seat.");
  return cohort.election;
}

/** Special-election causes never turn an otherwise undued regular seat on. */
export function isStateLegislativeSeatDue(
  stateUsps: string,
  officeKey: string,
  ordinal: number,
  year: number,
): boolean {
  return isElectionYear(
    stateLegislativeSeatElectionRule(stateUsps, officeKey, ordinal),
    year,
  );
}

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
  seat: {
    readonly officeKey: string;
    readonly ordinal: number | null;
  } | null = null,
): StateLegislativeElection {
  const rule = seat
    ? stateLegislativeSeatElectionRule(stateUsps, seat.officeKey, seat.ordinal)
    : stateLegislativeElectionRule(stateUsps);
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
