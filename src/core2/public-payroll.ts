/**
 * Public payroll for posts GOV fills mid-game (staff, appointed department
 * heads and cabinet members): the person takes a job whose employer is the
 * government's treasury, so their pay is drawn from it on paydays like any
 * job's. The schedule and pay calendar follow a full-time job already in the
 * town (a public employer's where there is one), as the jobs engine hires.
 */
import { addDays, makeIsoDate } from "../simulation/dates";
import type { CoreAPI, CoreState, Source } from "./types";

/** Puts a person on a government's payroll today; returns the job id, or null without a schedule to follow. */
export function startPublicJob(
  api: CoreAPI,
  input: {
    readonly personId: string;
    readonly employerId: string;
    readonly post: string;
    readonly title: string;
    readonly hourlyMinor: number;
    readonly citation: string;
  },
): string | null {
  const c = api.state as CoreState;
  const person = c.people.get(input.personId);
  if (!person?.alive || !c.organizations.has(input.employerId)) return null;
  const jobId = `job:public:${input.post}:${input.personId}`;
  if (c.jobs.has(jobId) && c.jobs.get(jobId)!.endsAt === undefined)
    return jobId;
  // The longest-hours job where the employer sits to follow, a public
  // employer's first (the person may live elsewhere).
  const where = c.organizations.get(input.employerId)!.placeId;
  const templates = [...c.jobs.values()]
    .filter(
      (j) =>
        j.endsAt === undefined &&
        c.organizations.get(j.organizationId)?.placeId === where,
    )
    .sort(
      (a, b) =>
        b.hoursDaily - a.hoursDaily ||
        Number(!!c.organizations.get(b.organizationId)?.governmentFacts) -
          Number(!!c.organizations.get(a.organizationId)?.governmentFacts) ||
        a.id.localeCompare(b.id),
    );
  for (const template of templates) {
    const commitment = [
      ...(c.work.commitmentsByPerson.get(template.personId) ?? []),
    ]
      .map((id) => c.work.commitments.get(id)!)
      .find((row) => row.jobId === template.id && row.endsAt === undefined);
    const calendarId =
      commitment && c.work.payrollCalendarByCommitment.get(commitment.id);
    const calendar = calendarId
      ? c.work.payrollCalendars.get(calendarId)
      : undefined;
    if (!commitment || !calendar) continue;
    // The post replaces whatever job they held.
    if (person.jobId && c.jobs.get(person.jobId)?.endsAt === undefined)
      api.endJob(person.jobId, `public-post:${input.post}:${api.state.date}`);
    // The template's own public pay authority isn't this post's.
    const { publicPayAuthorityId: _authority, ...shape } = commitment;
    void _authority;
    const startsAt = addDays(makeIsoDate(api.state.date), 1);
    const source: Source = {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: input.citation,
      estimatedFrom: `The post's pay; schedule and paydays follow ${template.id}.`,
    };
    const commitmentId = `work-commitment:${jobId}`;
    const calendarIdNew = `payroll-calendar:${jobId}`;
    api.startJob(
      {
        id: jobId,
        personId: person.id,
        organizationId: input.employerId,
        title: input.title,
        hourlyMinor: input.hourlyMinor,
        hoursDaily: template.hoursDaily,
        wageDailyMinor: Math.round(input.hourlyMinor * template.hoursDaily),
        source,
      },
      {
        ...shape,
        id: commitmentId,
        jobId,
        personId: person.id,
        organizationId: input.employerId,
        payrollCalendarId: calendarIdNew,
        startsAt,
        endsAt: undefined,
        hourlyMinor: input.hourlyMinor,
        scheduleTemplateJobId: template.id,
        paySource: source,
        scheduleSource: source,
      },
      {
        ...calendar,
        id: calendarIdNew,
        organizationId: input.employerId,
        workCommitmentIds: [commitmentId],
        basisRecordIds: [input.employerId, template.id],
        effectiveFrom: [startsAt, calendar.effectiveFrom].sort().at(-1)!,
        source,
      },
    );
    return jobId;
  }
  return null;
}
