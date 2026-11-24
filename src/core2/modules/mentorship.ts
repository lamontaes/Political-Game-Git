/**
 * Mentors (Lives, Nov 8, 2026): when a worker takes a job at an employer where
 * a coworker is at least `mentorAgeGapYears` older, that coworker, the eldest
 * there, takes them under their wing. The hire is read from the jobs
 * themselves (a person's job that no earlier review saw), the pair is written
 * as `work.mentorship-formed` and recorded as time together on their tie, and
 * the director's `advice` scene reads it. Nothing is rolled: who mentors is
 * the eldest coworker; no coworker old enough, no mentor.
 *
 * Runs inside the partnerships monthly review (installs nothing of its own).
 */
import { addDays, ageOnDate, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreState, PersonId, PersonState } from "../types";

export const WORK_MENTORSHIP = "work.mentorship-formed";

export function reviewMentorship(api: CoreAPI): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const today = makeIsoDate(core.date);
  const seen = api.moduleState("partnerships").table("jobsSeen");
  // The first review only learns who has a job; later ones read the new.
  const flags = api.moduleState("partnerships").table("state");
  const first = !flags.get("mentorship:opened");
  if (first)
    flags.put({ id: "mentorship:opened", openedAt: core.date } as never);
  const opened = (
    flags.get("mentorship:opened") as unknown as { openedAt: string }
  ).openedAt;
  // The opening fills its jobs over its first weeks: the first two reviews
  // only learn who works where.
  const learning = first || core.date < addDays(makeIsoDate(opened), 45);
  const byOrg = new Map<string, PersonState[]>();
  const hires: PersonState[] = [];
  for (const person of core.people.values()) {
    if (!person.alive || person.tier === "husk" || !person.jobId) continue;
    const job = core.jobs.get(person.jobId);
    if (!job || job.endsAt) continue;
    const list = byOrg.get(job.organizationId) ?? [];
    list.push(person);
    byOrg.set(job.organizationId, list);
    const held = seen.get(person.id) as unknown as
      { jobId: string } | undefined;
    if (held?.jobId !== person.jobId) {
      seen.put({ id: person.id, jobId: person.jobId } as never);
      // A hire is a job written in play, not one the opening wrote.
      if (!learning && job.source.asOf >= opened) hires.push(person);
    }
  }
  for (const hire of hires.sort((a, b) => a.id.localeCompare(b.id))) {
    const orgId = core.jobs.get(hire.jobId!)!.organizationId;
    const age = ageOnDate(makeIsoDate(hire.birthDate), today);
    let mentor: PersonState | undefined;
    for (const other of (byOrg.get(orgId) ?? []).sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      if (other.id === hire.id) continue;
      const gap = ageOnDate(makeIsoDate(other.birthDate), today) - age;
      if (gap < p("mentorAgeGapYears")) continue;
      if (!mentor || other.birthDate < mentor.birthDate) mentor = other;
    }
    if (!mentor) continue;
    api.relationship(
      hire.id,
      mentor.id,
      "coworker",
      p("mentorFirstHours"),
      undefined,
      {
        cause: "mentorship",
        sourceId: `${WORK_MENTORSHIP}:${hire.id}:${mentor.id}:${core.date}`,
      },
    );
    api.emit({
      id: `${WORK_MENTORSHIP}:${hire.id}:${mentor.id}:${core.date}`,
      date: core.date,
      kind: WORK_MENTORSHIP,
      personIds: [hire.id as PersonId, mentor.id as PersonId],
      placeId: hire.placeId,
      publicRecord: false,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: `${mentor.givenName} ${mentor.familyName} took ${hire.givenName} ${hire.familyName} under their wing at work.`,
        estimatedFrom:
          "A new hire's job and the eldest coworker at the same employer, at least mentorAgeGapYears older.",
      },
      facts: {
        organizationId: orgId,
        mentorId: mentor.id,
        seniority: String(
          Math.min(
            p("one"),
            (ageOnDate(makeIsoDate(mentor.birthDate), today) - age) /
              (p("mentorAgeGapYears") * (p("two") + p("one"))),
          ),
        ),
      },
    });
  }
}
