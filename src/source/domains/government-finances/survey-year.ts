/**
 * The Census survey-year fiscal window.
 *
 * A government's fiscal year is not the calendar year, and the Census Bureau's
 * survey year is not either of them. The Annual Survey of State and Local
 * Government Finances states the rule plainly: a survey year comprises each
 * individual government's fiscal year that ended **between July 1 of the
 * previous calendar year and June 30 of the survey year**. Survey year 2022
 * therefore covers fiscal years ending from 2021-07-01 through 2022-06-30.
 *
 * That window straddles a calendar boundary, and this is not an edge case. It
 * is where most governments live:
 *
 *   - Alabama and Michigan close on September 30, Texas on August 31 — all in
 *     the calendar year *before* the survey year that reports them;
 *   - a very large share of municipalities, counties and school districts close
 *     on December 31, likewise the previous calendar year;
 *   - the roughly forty-six states that close on June 30 land on the window's
 *     last day.
 *
 * An earlier revision of this domain required the fiscal-year-ending date to
 * fall inside the same calendar year as the survey year. That is not the
 * Bureau's contract, and it rejected the entire first half of every legitimate
 * window — every September-30 and December-31 government in the country. Worse
 * than being strict, it was strict in a direction that invites a lie: the
 * cheapest way past it would have been to edit `fiscal_year_ending` until it
 * matched `fiscal_year`, converting an honest date into a false one, which is
 * the exact failure this domain exists to prevent.
 *
 * So the window is modelled here, once, as the source defines it. The survey
 * year and the fiscal-year-ending date remain two separate facts on every
 * record: the year says which survey the amount was published in, the date says
 * when the government's own books closed, and neither is derived from the
 * other.
 */

import { isCalendarDate } from "../../core/index";

/** The inclusive first and last fiscal-year-ending dates of a survey year. */
export interface SurveyYearWindow {
  /** July 1 of the calendar year before the survey year. */
  readonly firstDay: string;
  /** June 30 of the survey year. */
  readonly lastDay: string;
}

/**
 * The fiscal-year-ending window a survey year accepts.
 *
 * Both bounds are inclusive ISO dates, so a caller can compare them with plain
 * string ordering: ISO-8601 dates sort lexicographically iff they sort
 * chronologically.
 */
export function surveyYearWindow(surveyYear: number): SurveyYearWindow {
  return {
    firstDay: `${surveyYear - 1}-07-01`,
    lastDay: `${surveyYear}-06-30`,
  };
}

/**
 * Whether a fiscal-year-ending date belongs to a survey year.
 *
 * True for a real calendar date from July 1 of the previous year through
 * June 30 of the survey year, inclusive of both ends; false for anything
 * outside the window and for anything that is not a real date.
 */
export function isWithinSurveyYearWindow(
  surveyYear: number,
  fiscalYearEnding: string,
): boolean {
  if (!isCalendarDate(fiscalYearEnding)) return false;
  const { firstDay, lastDay } = surveyYearWindow(surveyYear);
  return fiscalYearEnding >= firstDay && fiscalYearEnding <= lastDay;
}
