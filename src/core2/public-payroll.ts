/**
 * Public payroll for posts GOV fills mid-game (staff, appointed department
 * heads and cabinet members): the person takes a job whose employer is the
 * government's treasury, so their pay is drawn from it on paydays like any
 * job's. The schedule and pay calendar follow a full-time job already in the
 * town (a public employer's where there is one), as the jobs engine hires.
 */
import { inCustody } from "./modules/justice";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState, Source, WorkCommitmentInput } from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";

interface Followed {
  template: { id: string; hoursDaily: number; synthetic?: boolean };
  commitment: WorkCommitmentInput;
  calendar: WorkPayrollCalendarInput;
}

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
  // employer's first (the person may live elsewhere).
  const where =
    input.scheduleFromPlaceId ?? c.organizations.get(input.employerId)!.placeId;
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
  const followed = function* (): Generator<Followed> {
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
      if (commitment && calendar) yield { template, commitment, calendar };
    }
    // Nothing in reach has a schedule and payday (an island area's town opens
    // with only zero-hour office seats): the post takes a standard full-time
    // week and a government biweekly payday.
    yield standardWeek(api, input.employerId, person.id, jobId);
  };
  for (const { template, commitment, calendar } of followed()) {
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
      estimatedFrom: template.synthetic
        ? "The post's pay; a standard full-time week and a government biweekly payday, as no job in reach has a schedule to follow (SG-GOV-public-post-standard-week)."
        : `The post's pay; schedule and paydays follow ${template.id}.`,
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
        ...(template.synthetic ? {} : { scheduleTemplateJobId: template.id }),
        paySource: source,
        scheduleSource: source,
      },
      {
        ...calendar,
        id: calendarIdNew,
        organizationId: input.employerId,
        workCommitmentIds: [commitmentId],
        basisRecordIds: template.synthetic
          ? [input.employerId]
          : [input.employerId, template.id],
        effectiveFrom: [startsAt, calendar.effectiveFrom].sort().at(-1)!,
        source,
      },
    );
    return jobId;
  }
  return null;
}

/**
 * A standard full-time week and a biweekly government payday for a post with
 * no job in reach to follow: weekdays from the morning start, the full-time
 * hours spread over them, periods two weeks long and paid the usual number of
 * days after each period ends.
 */
function standardWeek(
  api: CoreAPI,
  employerId: string,
  personId: string,
  jobId: string,
): Followed {
  stopgap("SG-GOV-public-post-standard-week");
  const p = (key: string) => api.parameter(key);
  const startsAt = addDays(makeIsoDate(api.state.date), p("one"));
  const weeklyMinutes = p("openingFullTimeWeeklyHours") * p("minutesPerHour");
  const workdays = p("fridayIndex");
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation:
      "A standard full-time week (BLS CPS 2021 average hours) and a biweekly government payday (the opening's government proxy).",
    estimatedFrom:
      "Used only where no job in reach has a schedule to follow; SG-GOV-public-post-standard-week.",
  };
  const periodDays = p("two") * p("daysPerWeek");
  return {
    template: {
      id: "standard-public-week",
      hoursDaily: p("openingFullTimeWeeklyHours") / workdays,
      synthetic: true,
    },
    commitment: {
      id: `work-commitment:${jobId}`,
      jobId,
      personId,
      organizationId: employerId,
      startsAt,
      anchorDate: startsAt,
      periodDays: p("daysPerWeek"),
      slots: Array.from({ length: workdays }, (_, offsetDays) => ({
        offsetDays,
        startMinute: p("workMorningStartMinute"),
        minutes: weeklyMinutes / workdays,
      })),
      expectedWeeklyMinutes: weeklyMinutes,
      hourlyMinor: p("zero"),
      scheduleSource: source,
      paySource: source,
    },
    calendar: {
      id: `payroll-calendar:${jobId}`,
      organizationId: employerId,
      workCommitmentIds: [`work-commitment:${jobId}`],
      basisRecordIds: [employerId],
      rule: "fixed-days-after-inclusive-period-end" as const,
      periodDays,
      firstPeriodStartsAt: startsAt,
      firstPaydayAt: addDays(
        makeIsoDate(startsAt),
        periodDays - p("one") + p("openingPayrollPeriodEndLagDays"),
      ),
      nonbusinessDayRule: "no-adjustment" as const,
      effectiveFrom: startsAt,
      arrearsRule: "carry-to-next-recorded-payday" as const,
      source,
    },
  };
}
