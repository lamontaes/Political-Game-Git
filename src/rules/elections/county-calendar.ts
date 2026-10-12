import { makeIsoDate, type IsoDate } from "./calendar";
import type { GovernmentUnitIdentity } from "../../simulation/government-units";
import type calendarProfiles from "../../../data/research/government/county-election-calendar-profiles.json";
export interface CountyCalendarFacts {
  readonly profiles: readonly (typeof calendarProfiles.profiles)[number][];
  readonly states: readonly StateRow[];
}
export interface CountyElectionDates {
  readonly electionDate: IsoDate;
  readonly estimated: boolean;
  readonly primaryDate: IsoDate | null;
  readonly qualifyingOpens: IsoDate | null;
  readonly qualifyingCloses: IsoDate | null;
  readonly termStarts: IsoDate;
  readonly termYears: number;
  readonly sourceUrls: readonly string[];
}

export type CountyElectionCalendarRead =
  | {
      readonly status: "read";
      readonly dates: CountyElectionDates;
    }
  | {
      readonly status: "unknown";
      readonly reason: string;
    };

function weekday(
  year: number,
  month: number,
  dayOfWeek: number,
  ordinal: number,
): IsoDate {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((dayOfWeek - first + 7) % 7) + 7 * (ordinal - 1);
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
}

export interface StateRow {
  readonly stateUsps: string;
  readonly countyGovernment: string;
  readonly body?: {
    readonly termYears: number;
    readonly cycleYears: number;
    readonly electionYearResidues: readonly number[];
    readonly election: {
      readonly month: number;
      readonly weekday: number;
      readonly ordinal?: number;
      readonly afterFirstMonday?: boolean;
    };
    readonly termStart: {
      readonly month?: number;
      readonly day?: number;
      readonly weekday?: number;
      readonly ordinal?: number;
      readonly daysAfterElection?: number;
    };
  };
  readonly note?: string;
  readonly sourceUrls: readonly string[];
}

function addDays(date: IsoDate, days: number): IsoDate {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return makeIsoDate(moved.toISOString().slice(0, 10));
}

function stateRowRead(
  row: StateRow,
  onDate: IsoDate,
): CountyElectionCalendarRead {
  const body = row.body;
  if (row.countyGovernment !== "full" || !body)
    return {
      status: "unknown",
      reason: row.note ?? "This state holds no county body election.",
    };
  const electionIn = (year: number): IsoDate =>
    body.election.afterFirstMonday
      ? addDays(weekday(year, body.election.month, 1, 1), 1)
      : weekday(
          year,
          body.election.month,
          body.election.weekday,
          body.election.ordinal ?? 1,
        );
  let year = Number(onDate.slice(0, 4));
  while (
    !body.electionYearResidues.includes(year % body.cycleYears) ||
    electionIn(year) <= onDate
  )
    year += 1;
  const electionDate = electionIn(year);
  const start = body.termStart;
  let termStarts: IsoDate;
  if (start.daysAfterElection !== undefined)
    termStarts = addDays(electionDate, start.daysAfterElection);
  else {
    const month = start.month ?? 1;
    const startYear = month < body.election.month ? year + 1 : year;
    termStarts =
      start.weekday !== undefined
        ? weekday(startYear, month, start.weekday, start.ordinal ?? 1)
        : makeIsoDate(
            `${startYear}-${String(month).padStart(2, "0")}-${String(start.day ?? 1).padStart(2, "0")}`,
          );
  }
  return {
    status: "read",
    dates: {
      electionDate,
      estimated: true,
      primaryDate: null,
      qualifyingOpens: null,
      qualifyingCloses: null,
      termStarts,
      termYears: body.termYears,
      sourceUrls: [...row.sourceUrls],
    },
  };
}

export function nextCountyElection(
  facts: CountyCalendarFacts,
  unit: GovernmentUnitIdentity,
  onDate: IsoDate,
): CountyElectionCalendarRead {
  if (unit.unitType !== "county" || !unit.functionalActive)
    return { status: "unknown", reason: "No active county government." };
  const profile = facts.profiles.find(
    (entry) =>
      entry.stateUsps === unit.stateUsps &&
      entry.countyGeoid === unit.countyGeoid,
  );
  if (
    profile &&
    (!Number.isSafeInteger(profile.termYears) || profile.termYears <= 0)
  )
    return { status: "unknown", reason: "County term length is invalid." };
  if (
    profile?.kind === "published-dates" &&
    profile.primaryDate &&
    profile.electionDate &&
    profile.termStarts
  ) {
    if (onDate >= makeIsoDate(profile.primaryDate))
      return { status: "unknown", reason: profile.unreadLaterReason! };
    return {
      status: "read",
      dates: {
        electionDate: makeIsoDate(profile.electionDate),
        estimated: false,
        primaryDate: makeIsoDate(profile.primaryDate),
        qualifyingOpens: profile.qualifyingOpens
          ? makeIsoDate(profile.qualifyingOpens)
          : null,
        qualifyingCloses: profile.qualifyingCloses
          ? makeIsoDate(profile.qualifyingCloses)
          : null,
        termStarts: makeIsoDate(profile.termStarts),
        termYears: profile.termYears,
        sourceUrls: [...profile.sourceUrls],
      },
    };
  }
  if (
    profile?.kind === "recurring-weekday" &&
    profile.cycleAnchorYear !== undefined &&
    profile.electionMonth !== undefined &&
    profile.electionWeekday !== undefined &&
    profile.electionWeekdayOrdinal !== undefined &&
    profile.termStartMonth !== undefined &&
    profile.termStartDay !== undefined
  ) {
    let year = Number(onDate.slice(0, 4));
    while (
      (year - profile.cycleAnchorYear) % profile.termYears !== 0 ||
      weekday(
        year,
        profile.electionMonth,
        profile.electionWeekday,
        profile.electionWeekdayOrdinal,
      ) <= onDate
    )
      year += 1;
    return {
      status: "read",
      dates: {
        electionDate: weekday(
          year,
          profile.electionMonth,
          profile.electionWeekday,
          profile.electionWeekdayOrdinal,
        ),
        estimated: false,
        primaryDate: null,
        qualifyingOpens: null,
        qualifyingCloses: null,
        termStarts: makeIsoDate(
          `${year}-${String(profile.termStartMonth).padStart(2, "0")}-${String(profile.termStartDay).padStart(2, "0")}`,
        ),
        termYears: profile.termYears,
        sourceUrls: [...profile.sourceUrls],
      },
    };
  }
  const stateRow = facts.states.find(
    (entry) => entry.stateUsps === unit.stateUsps,
  );
  if (stateRow) return stateRowRead(stateRow, onDate);
  return {
    status: "unknown",
    reason:
      "County-specific election phase and applicable calendar are unread.",
  };
}
