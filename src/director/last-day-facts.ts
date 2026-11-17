/**
 * What a last day's words may lean on beyond the cast (Story lead, Nov 17,
 * the last-day rewrite): each fact is read from the one record that holds it
 * and set only where that record holds it (an effect is a read, not a
 * record). The scene packet (`purpose-scene.ts`) calls this once, beside the
 * facts it sets for every scene.
 *
 * A job the player left (the `money:job-left` cause, whose record is the job
 * itself):
 * - `employer`, `job`: the ended job's organization and title, said as the
 *   English engine says them; a title that names a group of people is not
 *   said as one person's job.
 * - `years-there`: the span from the day the job was taken (the jobs engine's
 *   `jobHeldSince`) to the day it ended, as `spanSaid` says it, never a count.
 * - `left-work`: the end is written as the player leaving work (`left-work`).
 * - `why-retire`: the reason key the jobs engine wrote on that change is
 *   `retired`; any other key says nothing, so no line gives a reason the
 *   record does not hold.
 * - `coworker-still-there`: the one who speaks holds a job at that employer
 *   that has not ended.
 *
 * A school year the player finished (the `school-last-day` cause, whose record is
 * the school engine's graduation result):
 * - `school`: the school's name; `passed` or `failed`: the record's result.
 * - `classmate-leaving`: the classmate has a graduation result of their own
 *   from the same day (a senior, who leaves too); `same-school-next`: they attended this
 *   school this year and have none, so they come back to it.
 */
import {
  JOB_LEAVE_REASONS,
  jobHeldSince,
  jobLeaveRecord,
} from "../core2/modules/jobs";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { daysBetweenText } from "../core2/kernel/dates";
import { employerSaid, jobSaid } from "../english/journal-words";
import { sayableJobTitle } from "../english/said-as";
import type { Fact } from "../english/scene-talk-words";
import { spanSaid } from "../english/span-words";
import { graduationResults, schoolResult } from "./school";
import { businessNameSaid, organizationName } from "./words";

/** The situation type that reads these facts. */
export const LAST_DAY_TYPE = "last-day";

/** A title that names a group ("Registered Nurses") is not one person's job. */
const GROUP_TITLE = /[^su]s$/i;

export interface LastDayInput {
  /** The cause record: the job that ended, or the school engine's graduation result. */
  readonly causeId: string;
  /** The classmate or coworker who speaks. */
  readonly askerId: PersonId;
  /** The one leaving: the player. */
  readonly askedId: PersonId;
}

export function lastDayFacts(
  core: Readonly<CoreState>,
  input: LastDayInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const { causeId, askerId, askedId } = input;
  const fact = (text: string, ids: readonly string[]): Fact => ({
    text,
    sourceRecordIds: ids,
  });
  const job = core.jobs.get(causeId as never);
  if (job && job.personId === askedId) {
    const api = coreAPI(core as CoreState);
    const org = core.organizations.get(job.organizationId);
    if (org)
      facts.employer = fact(employerSaid(businessNameSaid(org), org), [
        job.id,
        org.id,
      ]);
    if (
      sayableJobTitle(job.title) &&
      !GROUP_TITLE.test(job.title.trim().split(/\s+/).at(P.negativeOne) ?? "")
    )
      facts.job = fact(jobSaid(job.title), [job.id]);
    const since = jobHeldSince(api, job);
    if (since && job.endsAt) {
      const hire = `work-commitment:${job.id}`;
      facts["years-there"] = fact(
        spanSaid(daysBetweenText(since, job.endsAt)),
        core.work.commitments.has(hire) ? [job.id, hire] : [job.id],
      );
    }
    const left = jobLeaveRecord(api, job);
    if (left?.kind === "left-work")
      facts["left-work"] = fact("yes", [job.id, left.id]);
    if (left?.reasonKey === JOB_LEAVE_REASONS.retired)
      facts["why-retire"] = fact("yes", [left.id, job.id]);
    const theirs = core.people.get(askerId)?.jobId;
    const there = theirs ? core.jobs.get(theirs) : undefined;
    if (there && !there.endsAt && there.organizationId === job.organizationId)
      facts["coworker-still-there"] = fact("yes", [there.id, job.id]);
  }
  const finished = schoolResult(core, causeId);
  if (finished) {
    const school = core.organizations.get(finished.schoolId ?? "");
    if (school)
      facts.school = fact(organizationName(school), [causeId, school.id]);
    facts[finished.passed ? "passed" : "failed"] = fact("yes", [causeId]);
    // A classmate with a graduation result on the day the player's was written
    // finishes too; one without it attended this school this year and comes
    // back to it.
    const day = graduationResults(core, askedId).find(
      (row) => row.id === causeId,
    )?.date;
    const own = graduationResults(core, askerId).find(
      (row) => row.date === day,
    );
    if (own) facts["classmate-leaving"] = fact("yes", [own.id, causeId]);
    else if (school)
      facts["same-school-next"] = fact("yes", [school.id, askerId, causeId]);
  }
  return facts;
}
