import calendarProfiles from "../../../data/research/government/county-election-calendar-profiles.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import type { GovernmentUnitIdentity } from "../government-units";
import type { IsoDate } from "../types";

/** Calendar facts only. Neither a filing admission nor a district assignment. */
export interface CountyElectionDates {
  readonly electionDate: IsoDate;
  readonly primaryDate: IsoDate | null;
  readonly qualifyingOpens: IsoDate | null;
  readonly qualifyingCloses: IsoDate | null;
  readonly termStarts: IsoDate;
  readonly termYears: number;
  readonly sourceUrls: readonly string[];
}
export type CountyElectionCalendarRead =
  | { readonly status: "read"; readonly dates: CountyElectionDates }
  | { readonly status: "unknown"; readonly reason: string };

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

/**
 * Existing county identities select the calendar. Unknown jurisdictions and
 * years do not inherit municipal timing. Coverage expands as county-specific
 * phase/charter readings are bound; this is not all-state admission.
 */
export function nextCountyElection(
  unit: GovernmentUnitIdentity,
  onDate: IsoDate,
): CountyElectionCalendarRead {
  if (unit.unitType !== "county" || !unit.functionalActive)
    return { status: "unknown", reason: "No active county government." };
  const profile = calendarProfiles.profiles.find(
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
  return {
    status: "unknown",
    reason:
      "County-specific election phase and applicable calendar are unread.",
  };
}
