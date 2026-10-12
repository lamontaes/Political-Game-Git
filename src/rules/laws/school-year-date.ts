import { makeIsoDate, yearOf, type IsoDate } from "./calendar";
import { LAWS_PARAMETERS } from "./parameters";
const SCHOOL_YEAR_STARTS = LAWS_PARAMETERS.teacherSchoolYearStart.value;
// stopgapId: "laws.common-teacher-school-year"
export function schoolYearStartOnOrAfter(date: IsoDate): IsoDate {
  const sameYear = makeIsoDate(`${yearOf(date)}-${SCHOOL_YEAR_STARTS}`);
  return sameYear >= date
    ? sameYear
    : makeIsoDate(`${yearOf(date) + 1}-${SCHOOL_YEAR_STARTS}`);
}
