import type { IsoDate } from "../types";
import {
  STATE_LEGISLATIVE_CHAMBER_CYCLES,
  type StateLegislativeChamberCycle,
  type StateLegislativeCohortSchedule,
  type StateLegislativeCohortSelection,
} from "../legislative-term-rules";
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
 * The 50-state chamber table supplies exact due cohorts and term phases.
 * An unreviewed cohort remains unknown and cannot turn a regular seat over.
 * The general-election day and sixty-day field close are still explicit game
 * dates where the jurisdiction's actual voting or filing day is not compiled.
 * Louisiana's Saturday election and primaries remain outside this profile.
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

export interface StateLegislativeSeatIdentity {
  readonly districtCode: string | null;
  readonly slotWithinDistrict: number | null;
  /** Saved pre-wave-2 West Virginia opening retained its biennial game ballot. */
  readonly legacyElectionProfile?: true;
}

export interface StateLegislativeSeatCyclePhase {
  readonly row: StateLegislativeChamberCycle;
  readonly schedule: StateLegislativeCohortSchedule;
  readonly termYears: 2 | 4;
}

function districtNumber(
  identity: StateLegislativeSeatIdentity | null,
): number | null {
  const match = identity?.districtCode?.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function selectionIncludes(
  selection: StateLegislativeCohortSelection,
  identity: StateLegislativeSeatIdentity | null,
): boolean {
  if (selection.kind === "all") return true;
  if (selection.kind === "seat-slot")
    return identity?.slotWithinDistrict === selection.slot;
  if (selection.kind === "district-code-list") {
    const districtCode = identity?.districtCode;
    return (
      districtCode != null && selection.districtCodes.includes(districtCode)
    );
  }
  const district = districtNumber(identity);
  if (district === null) return false;
  if (selection.kind === "district-parity")
    return district % 2 === (selection.parity === "even" ? 0 : 1);
  const listed = selection.districts.includes(district);
  return selection.kind === "district-list" ? listed : !listed;
}

function schedulePhase(
  schedule: StateLegislativeCohortSchedule,
  year: number,
): 2 | 4 | null {
  const offset =
    (((year - schedule.referenceYear) % schedule.periodYears) +
      schedule.periodYears) %
    schedule.periodYears;
  return (
    schedule.phases.find((phase) => phase.offsetYears === offset)?.termYears ??
    null
  );
}

/** An unknown cohort yields null, so a regular ballot cannot be invented. */
export function stateLegislativeSeatCyclePhase(
  stateUsps: string,
  officeKey: string,
  identity: StateLegislativeSeatIdentity | null,
  year: number,
): StateLegislativeSeatCyclePhase | null {
  const chamberKey = officeKey.split(":").at(-1);
  const row = STATE_LEGISLATIVE_CHAMBER_CYCLES.find(
    (candidate) =>
      candidate.stateUsps === stateUsps.toUpperCase() &&
      candidate.chamberKey === chamberKey,
  );
  if (!row || row.sourceStatus === "PLACEHOLDER(wave2)") return null;
  const matching = row.cohorts.filter((cohort) =>
    selectionIncludes(cohort.selection, identity),
  );
  if (matching.length !== 1) return null;
  const termYears = schedulePhase(matching[0]!.schedule, year);
  return termYears === null
    ? null
    : { row, schedule: matching[0]!.schedule, termYears };
}

function chamberHasKnownCycle(stateUsps: string, officeKey: string): boolean {
  const chamberKey = officeKey.split(":").at(-1);
  return STATE_LEGISLATIVE_CHAMBER_CYCLES.some(
    (row) =>
      row.stateUsps === stateUsps.toUpperCase() &&
      row.chamberKey === chamberKey,
  );
}

/**
 * Compatibility reader for a single-phase biennial or quadrennial cohort.
 * Ten-year redistricting sequences must use `stateLegislativeSeatCyclePhase`.
 */
export function stateLegislativeSeatElectionRule(
  stateUsps: string,
  officeKey: string,
  ordinal: number | null,
): ElectionTimingRule {
  const chamberKey = officeKey.split(":").at(-1);
  const row = STATE_LEGISLATIVE_CHAMBER_CYCLES.find(
    (candidate) =>
      candidate.stateUsps === stateUsps.toUpperCase() &&
      candidate.chamberKey === chamberKey,
  );
  if (!row) return stateLegislativeElectionRule(stateUsps);
  if (row.sourceStatus === "PLACEHOLDER(wave2)")
    throw new Error(
      "This chamber's regular election cycle is not established.",
    );
  const identity =
    ordinal === null
      ? null
      : { districtCode: String(ordinal), slotWithinDistrict: null };
  const matching = row.cohorts.filter((cohort) =>
    selectionIncludes(cohort.selection, identity),
  );
  if (matching.length !== 1)
    throw new Error(
      "Choose a recorded district and seat to date this legislative race.",
    );
  const schedule = matching[0]!.schedule;
  if (schedule.periodYears === 10 || schedule.phases.length !== 1)
    throw new Error(
      "This seat has a phased cycle; read its election year directly.",
    );
  return {
    cycleYears: schedule.periodYears,
    referenceYear: schedule.referenceYear + schedule.phases[0]!.offsetYears,
    day: "first-tuesday-after-first-monday-in-november",
  };
}

/** Special-election causes never turn an otherwise undued regular seat on. */
export function isStateLegislativeSeatDue(
  stateUsps: string,
  officeKey: string,
  ordinal: number,
  year: number,
  identity: StateLegislativeSeatIdentity | null = null,
): boolean {
  if (
    identity?.legacyElectionProfile &&
    stateUsps === "WV" &&
    officeKey.endsWith(":senate")
  )
    return isElectionYear(stateLegislativeElectionRule(stateUsps), year);
  if (chamberHasKnownCycle(stateUsps, officeKey))
    return (
      stateLegislativeSeatCyclePhase(
        stateUsps,
        officeKey,
        identity ?? { districtCode: String(ordinal), slotWithinDistrict: null },
        year,
      ) !== null
    );
  return isElectionYear(stateLegislativeElectionRule(stateUsps), year);
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
    readonly districtCode?: string | null;
    readonly slotWithinDistrict?: number | null;
    readonly legacyElectionProfile?: true;
  } | null = null,
): StateLegislativeElection {
  const rule = stateLegislativeElectionRule(stateUsps);
  const known =
    seat &&
    !seat.legacyElectionProfile &&
    chamberHasKnownCycle(stateUsps, seat.officeKey);
  const identity = seat
    ? {
        districtCode:
          seat.districtCode ??
          (seat.ordinal === null ? null : String(seat.ordinal)),
        slotWithinDistrict: seat.slotWithinDistrict ?? null,
        ...(seat.legacyElectionProfile
          ? { legacyElectionProfile: true as const }
          : {}),
      }
    : null;
  if (
    known &&
    !STATE_LEGISLATIVE_CHAMBER_CYCLES.some(
      (row) =>
        row.stateUsps === stateUsps.toUpperCase() &&
        row.chamberKey === seat!.officeKey.split(":").at(-1) &&
        row.sourceStatus !== "PLACEHOLDER(wave2)" &&
        row.cohorts.some((cohort) =>
          selectionIncludes(cohort.selection, identity),
        ),
    )
  )
    throw new Error(
      "Choose a recorded district and seat with an established election cycle.",
    );
  const startYear = Number(onDate.slice(0, 4));
  for (let year = startYear; year < startYear + 40; year += 1) {
    if (
      known &&
      !stateLegislativeSeatCyclePhase(
        stateUsps,
        seat!.officeKey,
        identity,
        year,
      )
    )
      continue;
    if (!known && !isElectionYear(rule, year)) continue;
    const electionDate = generalElectionDay(rule, year);
    const closes = fieldClosingDate(electionDate);
    if (onDate < closes)
      return {
        electionDate,
        fieldClosesOn: closes,
        basis: STATE_LEGISLATIVE_CALENDAR_PROFILE,
      };
  }
  throw new Error(
    "No established regular election is scheduled for this legislative seat.",
  );
}
