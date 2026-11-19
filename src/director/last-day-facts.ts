/**
 * What a last day at a school or a job may say, from the record that caused
 * it: a school finished (`school.finished`) names the school, and a job left
 * (the jobs engine's job row, ended) names the employer and the job. Each
 * fact is cited to its record. Empty for any other type or record.
 */
import { SCHOOL_FINISHED } from "../core2/past";
import type { CoreState } from "../core2/types";
import { withArticle } from "../english/journal-words";
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
  const job = core.jobs.get(causeId);
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  if (!job || !employer) return {};
  return {
    employer: {
      text: organizationName(employer),
      sourceRecordIds: [job.id, employer.id],
    },
    position: { text: withArticle(job.title), sourceRecordIds: [job.id] },
    "work-day": { text: "yes", sourceRecordIds: [job.id] },
  };
}
