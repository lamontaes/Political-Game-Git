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
  // DeSoto's actual police jury: the published 2027 calendar includes the
  // prohibited-day adjustments. Do not extrapolate the unadjusted statute.
  if (unit.stateUsps === "LA" && unit.countyGeoid === "22031") {
    if (onDate < makeIsoDate("2027-10-09"))
      return {
        status: "read",
        dates: {
          electionDate: makeIsoDate("2027-11-20"),
          primaryDate: makeIsoDate("2027-10-09"),
          qualifyingOpens: makeIsoDate("2027-08-03"),
          qualifyingCloses: makeIsoDate("2027-08-05"),
          termStarts: weekday(2028, 1, 1, 2),
          termYears: 4,
          sourceUrls: [
            "https://www.sos.la.gov/media/byfpyc5f/elections-calendar-2027.pdf",
            "https://legis.la.gov/Legis/Law.aspx?d=88684",
            "https://www.legis.la.gov/Legis/Law.aspx?d=88690",
          ],
        },
      };
    return {
      status: "unknown",
      reason:
        "Next police-jury primary calendar, including prohibited-day adjustments, is unread.",
    };
  }
  // Loudon's official 2026 commission ballot binds the ordinary state cycle
  // to this county. No other Tennessee charter/phase is inferred from it.
  if (unit.stateUsps === "TN" && unit.countyGeoid === "47105") {
    let year = Number(onDate.slice(0, 4));
    while (year % 4 !== 2 || weekday(year, 8, 4, 1) <= onDate) year += 1;
    return {
      status: "read",
      dates: {
        electionDate: weekday(year, 8, 4, 1),
        primaryDate: null,
        qualifyingOpens: null,
        qualifyingCloses: null,
        termStarts: makeIsoDate(`${year}-09-01`),
        termYears: 4,
        sourceUrls: [
          "https://www.ctas.tennessee.edu/eli/membership-clb",
          "https://www.ctas.tennessee.edu/eli/dates-regular-elections",
          "https://loudoncountyvotes.com/files/August_2026_SampleBallot_General.pdf",
        ],
      },
    };
  }
  return {
    status: "unknown",
    reason:
      "County-specific election phase and applicable calendar are unread.",
  };
}
