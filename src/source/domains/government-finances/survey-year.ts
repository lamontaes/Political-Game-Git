/**
 * Local-government fiscal survey window, preserved for existing fixtures.
 *
 * The locked 2024 local methodology places MMDD endings in July 1 of the
 * previous calendar year through June 30 of the survey year. State-government
 * technical documentation instead places state endings within the survey year.
 * The previous commentary incorrectly applied this local rule to Alabama,
 * Michigan and Texas state finances. Production distinguishes those products;
 * this helper remains the local rule and does not change fixture semantics.
 */

import { isCalendarDate } from "../../core/index";

/** The inclusive first and last fiscal-year-ending dates of a local survey year. */
export interface SurveyYearWindow {
  /** July 1 of the calendar year before the survey year. */
  readonly firstDay: string;
  /** June 30 of the survey year. */
  readonly lastDay: string;
}

/**
 * The fiscal-year-ending window a local survey year accepts.
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
 * Whether a fiscal-year-ending date belongs to a local survey year.
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
