/**
 * What the last day at a school may say, from the record that caused it: a
 * school finished (`school.finished`) names the school, cited to its record.
 * Empty for any other type or record. A job's last day is no scene: jobs
 * happen in the background (owner, Nov 24).
 */
import { SCHOOL_FINISHED } from "../core2/past";
import type { CoreState } from "../core2/types";
import type { NewsFact } from "./life-news";
import { organizationName } from "./words";

/** The situation type that reads these facts. */
export const LAST_DAY_TYPE = "last-day";

export function lastDayFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
): Record<string, NewsFact> {
  if (typeKey !== LAST_DAY_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind === SCHOOL_FINISHED) {
    const schoolId = String(record.facts?.schoolId ?? "");
    const school = core.organizations.get(schoolId);
    if (!school) return {};
    return {
      school: {
        text: organizationName(school),
        sourceRecordIds: [causeId, schoolId],
      },
      "school-day": { text: "yes", sourceRecordIds: [causeId] },
    };
  }
  return {};
}
