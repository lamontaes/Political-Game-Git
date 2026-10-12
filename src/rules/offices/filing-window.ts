/** P11 KEEP: field-entry.ts:30; shared legacy opening bound, not researched law. */
import { isoDateFromParts } from "./calendar";
import { OFFICES_PARAMETERS } from "./parameters";
export function filingWindowOpens(year: number): string {
  return isoDateFromParts(
    year - 1,
    OFFICES_PARAMETERS.filingOpeningMonth.value,
    OFFICES_PARAMETERS.filingOpeningDay.value,
  );
}
