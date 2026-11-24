/**
 * The first reader of the shared-time mechanism (`shared-time.ts`): people who
 * work the same hours at one employer spend that time together,
 * so their closeness keeps growing while they do (pool item
 * people-shared-time-grows-ties). Once a week, for every pair of full people
 * who know each other and hold open jobs at one employer, the minutes their
 * own work schedules overlap are credited as hours together through the one
 * relationship writer. A person's time with any one coworker falls as the
 * workplace grows: the contact share of the overlap is split among the
 * people a workplace that size lets one know (`knownAmong`, passed in as `knownIn`). Nobody new is
 * met here (hire, group and visit meet people, `encounters.ts`); a tie to
 * someone who has left the employer is no longer credited and fades by its
 * half-life as before. Nothing rolls a die.
 */
import { daysBetweenText } from "./kernel/dates";
import { creditSharedTime } from "./shared-time";
import type { CoreAPI, IsoDate, PersonId, WorkCommitmentInput } from "./types";

export const WORK_TIME_CAUSE = "worked the same hours at one employer";

/** Minutes two commitments' schedules overlap on one date (zero outside either's span). */
function overlapOn(
  a: WorkCommitmentInput,
  b: WorkCommitmentInput,
  date: IsoDate,
): number {
  let minutes = 0;
  const slots = (c: WorkCommitmentInput) => {
    if (date < c.startsAt || (c.endsAt !== undefined && date >= c.endsAt))
      return [];
    const offset =
      ((daysBetweenText(c.anchorDate, date) % c.periodDays) + c.periodDays) %
      c.periodDays;
    return c.slots.filter((s) => s.offsetDays === offset);
  };
  const left = slots(a);
  if (!left.length) return 0;
  for (const x of left)
    for (const y of slots(b)) {
      const from = Math.max(x.startMinute, y.startMinute);
      const to = Math.min(x.startMinute + x.minutes, y.startMinute + y.minutes);
      if (to > from) minutes += to - from;
    }
  return minutes;
}

/**
 * Credit the week ending the day before `today` (a Monday): each known pair at
 * one employer gets their schedules' overlap, times the contact share, over
 * the people the workplace lets one know.
 */
export function creditWorkTime(
  api: CoreAPI,
  today: IsoDate,
  knownIn: (organizationId: string) => number,
): void {
  const core = api.state;
  const p = (key: string) => api.parameter(key);
  const share = p("workContactShare");
  const days: IsoDate[] = [];
  for (let back = 7; back >= 1; back -= 1)
    days.push(
      new Date(Date.parse(`${today}T00:00:00Z`) - back * 86_400_000)
        .toISOString()
        .slice(0, 10) as IsoDate,
    );
  const known = new Map<string, number>();
  const commitmentOf = (personId: PersonId, jobId: string) => {
    for (const id of core.work.commitmentsByPerson.get(personId) ?? []) {
      const row = core.work.commitments.get(id);
      if (row && row.jobId === jobId) return row;
    }
    return undefined;
  };
  for (const a of core.people.values()) {
    if (!a.alive || !a.jobId) continue;
    const jobA = core.jobs.get(a.jobId);
    if (!jobA || jobA.endsAt !== undefined) continue;
    for (const id of a.knownIds) {
      const b = core.people.get(id);
      if (!b?.alive || !b.jobId || (id < a.id && b.knownIds.has(a.id)))
        continue;
      const jobB = core.jobs.get(b.jobId);
      if (
        !jobB ||
        jobB.endsAt !== undefined ||
        jobB.organizationId !== jobA.organizationId
      )
        continue;
      const left = commitmentOf(a.id, jobA.id);
      const right = commitmentOf(b.id, jobB.id);
      if (!left || !right) continue;
      let minutes = 0;
      for (const day of days) minutes += overlapOn(left, right, day);
      let room = known.get(jobA.organizationId);
      if (room === undefined) {
        room = knownIn(jobA.organizationId);
        known.set(jobA.organizationId, room);
      }
      creditSharedTime(api, {
        a: a.id,
        b: b.id,
        minutes,
        contactShare: share,
        room,
        kind: "coworker",
        cause: WORK_TIME_CAUSE,
        sourceId: jobA.organizationId,
      });
    }
  }
}
