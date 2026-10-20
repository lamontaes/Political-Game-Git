/**
 * Public payroll for posts GOV fills mid-game (staff, appointed department
 * heads and cabinet members): the person takes a job whose employer is the
 * government's treasury, so their pay is drawn from it on paydays like any
 * job's. The schedule and pay calendar follow a full-time job already in the
 * town (a public employer's where there is one), as the jobs engine hires.
 */
import { inCustody } from "./modules/justice";
import { addDays, makeIsoDate } from "./kernel/dates";
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
    /** The most the post may pay a day (what its budget line carries); the hourly rate is cut to fit. */
    readonly maxDailyMinor?: number;
    /** Where to find a job whose schedule and payday the new one follows, when the employer's own place holds none (a state office with no staff schedule of its own follows the town's). */
    readonly scheduleFromPlaceId?: string;
    readonly citation: string;
  },
): string | null {
  const c = api.state as CoreState;
  const person = c.people.get(input.personId);
  if (
    !person?.alive ||
    inCustody(api, input.personId) ||
    !c.organizations.has(input.employerId)
  )
    return null;
  // A person who holds a post again after leaving it starts a new job under a
  // new id; a job still open for the post is theirs as it stands.
  const base = `job:public:${input.post}:${input.personId}`;
  let jobId = base;
  for (let stint = 2; c.jobs.has(jobId); stint++) {
    if (c.jobs.get(jobId)!.endsAt === undefined) return jobId;
    jobId = `${base}:${stint}`;
  }
  // The longest-hours job where the employer sits to follow, a public
  // employer's first (the person may live elsewhere). Its own place's jobs
  // come first.
  const templatesAt = (where: string) =>
    [...c.jobs.values()]
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
  const own = templatesAt(c.organizations.get(input.employerId)!.placeId);
  // The other place's jobs are reached only when none of the employer's own has a schedule and payday.
  const templates = input.scheduleFromPlaceId
    ? [...own, ...templatesAt(input.scheduleFromPlaceId)]
    : own;
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
    // A post's pay is stated for a full-time week, whatever week the
    // schedule it follows runs.
    const postHoursDaily =
      api.parameter("openingFullTimeWeeklyHours") /
      api.parameter("daysPerWeek");
    const postedHourlyMinor =
      input.maxDailyMinor === undefined
        ? input.hourlyMinor
        : Math.min(
            input.hourlyMinor,
            Math.floor(input.maxDailyMinor / postHoursDaily),
          );
    // A post its line cannot pay at all is held unpaid.
    if (postedHourlyMinor <= 0) return null;
    // Payroll pays the hourly rate for the minutes the schedule runs. The
    // template's schedule can run longer or shorter than the post's week, so
    // the rate is set over the scheduled minutes: the post's pay is what its
    // line posts.
    const statedWeekMinutes =
      postHoursDaily *
      api.parameter("daysPerWeek") *
      api.parameter("minutesPerHour");
    const hourlyMinor =
      commitment.expectedWeeklyMinutes > 0
        ? Math.round(
            (postedHourlyMinor * statedWeekMinutes) /
              commitment.expectedWeeklyMinutes,
          )
        : postedHourlyMinor;
    if (hourlyMinor <= 0) return null;
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
        hourlyMinor,
        hoursDaily: template.hoursDaily,
        wageDailyMinor: Math.round(postedHourlyMinor * postHoursDaily),
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
        hourlyMinor,
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
