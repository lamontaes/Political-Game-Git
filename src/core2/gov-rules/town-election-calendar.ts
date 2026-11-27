/**
 * The November general election day, and how long before the first vote a
 * candidate must file where no place's own deadline is read. Ported from the
 * old engine's `nationwide-world/town-election-calendar.ts` and
 * `nominations/filing-gap.ts`.
 */
import nominationRules from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import { addDays, nthWeekdayOfMonth } from "../kernel/dates";
import type { IsoDate } from "./types";

/**
 * ESTIMATED FROM AVERAGE, pending research question
 * `town-election-calendar-from-state-municipal-law`: a filing must come at
 * least this many days before the first vote. The median number of days
 * between the candidate filing deadline and the primary over the places with a
 * usable 2026 row in `data/research/elections/party-nomination-rules-2026.json`
 * (the FEC's 2026 Congressional Primary Dates and Candidate Filing Deadlines
 * for Ballot Access: 85 days, range 63 to 149). The same for every town in all
 * 56 places until its own filing deadline is read: used only where the
 * state's rule in `src/core2/data/elections/filing-deadlines.json` is
 * unread. It is an ESTIMATED place row, never a read law.
 */
export const FILING_LEAD_DAYS: number = (() => {
  const places = nominationRules.places as Record<
    string,
    { readonly filing?: { readonly daysBeforePrimary?: number | null } }
  >;
  const gaps = Object.values(places)
    .map((row) => row.filing?.daysBeforePrimary)
    .filter((gap): gap is number => typeof gap === "number")
    .sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  return gaps.length % 2
    ? gaps[middle]!
    : Math.round((gaps[middle - 1]! + gaps[middle]!) / 2);
})();

/** Where {@link FILING_LEAD_DAYS} comes from, for the record. */
export const FILING_LEAD_SOURCE =
  "ESTIMATED FROM AVERAGE: median candidate filing lead before the primary, " +
  "FEC 2026 Congressional Primary Dates and Candidate Filing Deadlines for Ballot Access " +
  "(data/research/elections/party-nomination-rules-2026.json). Not a claim about this place's law.";

/** The Tuesday after the first Monday in November of a year. */
export function novemberGeneralElectionDay(year: number): IsoDate {
  // November 2 through 8: the day after the first Monday.
  return addDays(nthWeekdayOfMonth(year, 11, 1, 1), 1);
}
