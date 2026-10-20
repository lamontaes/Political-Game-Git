/**
 * Public payroll for posts GOV fills mid-game (staff, appointed department
 * heads and cabinet members): the person takes a job whose employer is the
 * government's treasury, so their pay is drawn from it on paydays like any
 * job's. The schedule and pay calendar follow a full-time job already in the
 * town (a public employer's where there is one), as the jobs engine hires.
 */
import { inCustody } from "./modules/justice";
import { addDays, makeIsoDate } from "./kernel/dates";
import { governmentPayrollTerms } from "./opening-payroll-calendar";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
import { WORK_PATTERNS, type Weekday } from "./work-patterns";
import type {
  CoreAPI,
  CoreState,
  PersonId,
  Source,
  WorkCommitmentInput,
  WorkScheduleSlot,
} from "./types";

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
  // The schedule and pay calendar of the first job there that has both; with
  // none (a territory's counted workers hold no recorded schedule) the post
  // follows a full-time public-office week on the government's pay calendar.
  let basis: Basis | undefined;
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
    basis = {
      templateId: template.id,
      hoursDaily: template.hoursDaily,
      commitment,
      calendar,
    };
    break;
  }
  basis ??= publicOfficeBasis(api, input.employerId);
  {
    const { commitment, calendar } = basis;
    const template = { id: basis.templateId, hoursDaily: basis.hoursDaily };
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
      estimatedFrom: template.id
        ? `The post's pay; schedule and paydays follow ${template.id}.`
        : "The post's pay; a full-time public-office week and the government's biweekly pay calendar.",
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
        ...(template.id ? { scheduleTemplateJobId: template.id } : {}),
        paySource: source,
        scheduleSource: source,
      },
      {
        ...calendar,
        id: calendarIdNew,
        organizationId: input.employerId,
        workCommitmentIds: [commitmentId],
        basisRecordIds: [
          input.employerId,
          ...(template.id ? [template.id] : []),
        ],
        effectiveFrom: [startsAt, calendar.effectiveFrom].sort().at(-1)!,
        source,
      },
    );
    return jobId;
  }
}

interface Basis {
  readonly templateId?: string;
  readonly hoursDaily: number;
  readonly commitment: WorkCommitmentInput;
  readonly calendar: WorkPayrollCalendarInput;
}

/**
 * A full-time public-office week (the pattern's weekdays and shift) and the
 * government's biweekly pay calendar, for a post with no job to follow.
 */
function publicOfficeBasis(api: CoreAPI, employerId: string): Basis {
  const pattern = WORK_PATTERNS["public-office"];
  const shift = pattern.shifts[0]!;
  const startsAt = addDays(makeIsoDate(api.state.date), 1);
  const weekday = (offset: number) =>
    new Date(`${addDays(startsAt, offset)}T12:00:00Z`).getUTCDay();
  const days = api.parameter("daysPerWeek");
  const slots: WorkScheduleSlot[] = [];
  for (let offset = 0; offset < days; offset += 1)
    if (pattern.weekdays?.includes(weekday(offset) as Weekday))
      slots.push({
        offsetDays: offset,
        startMinute: shift.startMinute,
        minutes: shift.minutes,
      });
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation:
      "A full-time public-office week from WORK_PATTERNS and the government's base biweekly pay calendar from the opening payroll data.",
    estimatedFrom:
      "Used for a public post when no recorded job in the place carries a schedule and pay calendar to follow.",
  };
  const weeklyMinutes = slots.reduce((n, slot) => n + slot.minutes, 0);
  return {
    hoursDaily: shift.minutes / api.parameter("minutesPerHour"),
    commitment: {
      id: "",
      jobId: "",
      personId: "" as PersonId,
      organizationId: employerId,
      startsAt,
      anchorDate: startsAt,
      periodDays: days,
      slots,
      expectedWeeklyMinutes: weeklyMinutes,
      hourlyMinor: 0,
      scheduleSource: source,
      paySource: source,
    },
    calendar: {
      id: "",
      organizationId: employerId,
      workCommitmentIds: [],
      basisRecordIds: [],
      ...governmentPayrollTerms(api.state.date),
      effectiveFrom: startsAt,
      source,
    },
  };
}
