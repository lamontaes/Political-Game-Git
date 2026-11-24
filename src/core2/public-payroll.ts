/**
 * Public payroll for posts GOV fills mid-game (staff, appointed department
 * heads and cabinet members): the person takes a job whose employer is the
 * government's treasury, so their pay is drawn from it on paydays like any
 * job's. Posts follow the public-office week; their pay calendar follows a
 * recorded local job where one exists, otherwise the government's calendar.
 */
import { inCustody } from "./modules/justice";
import { outsideLaborForce } from "./gov-rules/place-population";
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
import { lawInForce } from "./modules/laws";
import { publicPayFloorHourly } from "./public-pay-floor";

/** Hours a day in a public post's full-time week. */
function postHoursPerDay(api: CoreAPI): number {
  return (
    api.parameter("openingFullTimeWeeklyHours") / api.parameter("daysPerWeek")
  );
}

/**
 * The hourly rate a post's budget line can carry over a full-time day: the post's rate, cut to what
 * the line's daily room pays (the figure applicants weigh; a line that carries less than a full week
 * pays the post's own rate for fewer hours, see `startPublicJob`). Zero or less means the line cannot pay the post at all, and
 * `startPublicJob` holds the post unpaid (a hiring decision reads the same figure first).
 */
export function lineHourlyMinor(
  api: CoreAPI,
  hourlyMinor: number,
  maxDailyMinor: number | undefined,
): number {
  return maxDailyMinor === undefined
    ? hourlyMinor
    : Math.min(hourlyMinor, Math.floor(maxDailyMinor / postHoursPerDay(api)));
}

/** Puts a person on a government's payroll today; returns the job id, or null if the person or employer cannot take the post. */
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
    /** Where to find a job whose payday the new post follows when the employer's own place holds none (a state office can follow the town's pay calendar). */
    readonly scheduleFromPlaceId?: string;
    readonly citation: string;
  },
): string | null {
  const c = api.state as CoreState;
  const person = c.people.get(input.personId);
  // Nobody in custody or in a room outside the civilian labor force (an
  // institution or barracks) holds a public post, by the jobs engine's rule.
  if (
    !person?.alive ||
    inCustody(api, input.personId) ||
    outsideLaborForce(c.households.get(person.householdId)?.quarters) ||
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
  // A public post works a full-time public-office week, whatever job it sits
  // beside: a town's other jobs may run a firefighter's day-long rotation or a
  // shop's hours that no one on its payroll can attend. Its paydays follow the
  // first job there that has a pay calendar; with none (a territory's counted
  // workers hold no recorded calendar) it takes the government's own.
  const basis = publicOfficeBasis(api, input.employerId);
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
    basis.payTemplateId = template.id;
    basis.calendar = calendar;
    break;
  }
  {
    const { commitment, calendar } = basis;
    const template = { id: basis.payTemplateId, hoursDaily: basis.hoursDaily };
    // A post's pay is stated for a full-time week, whatever week the
    // schedule it follows runs.
    const postHoursDaily = postHoursPerDay(api);
    // What the post's line can pay over a full-time day, as an hourly figure.
    const linePostedHourlyMinor = lineHourlyMinor(
      api,
      input.hourlyMinor,
      input.maxDailyMinor,
    );
    // A post its line cannot pay at all is held unpaid.
    if (linePostedHourlyMinor <= 0) return null;
    // A line that carries less than a full-time week at the post's going rate
    // (a small town's stipend for an attorney or a clerk) pays for fewer hours
    // at that rate, never a full week at a cut rate: the same pay in total,
    // and the hourly rate is the post's own.
    const partTime = linePostedHourlyMinor < input.hourlyMinor;
    const goingHourlyMinor = partTime
      ? input.hourlyMinor
      : linePostedHourlyMinor;
    // A public post is paid at the public pay floor in force the day it is
    // filled, not a month later at the review.
    const postedHourlyMinor = Math.max(
      goingHourlyMinor,
      publicPayFloorHourly(api, input.employerId, {
        hourlyMinor: goingHourlyMinor,
        wageDailyMinor: Math.round(goingHourlyMinor * postHoursDaily),
      }),
    );
    // Payroll pays the hourly rate for the minutes the schedule runs. The
    // template's schedule can run longer or shorter than the post's week, so
    // the rate is set over the scheduled minutes: the post's pay is what its
    // line posts.
    const statedWeekMinutes =
      postHoursDaily *
      api.parameter("daysPerWeek") *
      api.parameter("minutesPerHour");
    // A part-time post's week is the share of a full-time week its line pays
    // for. A line that buys less than one sitting of the post (a stipend of a
    // few dollars a week) is paid for one sitting of the least length, at the
    // rate that sitting earns the same pay in total, never under the minimum
    // wage in force: a few hours is a rate, never a cents-an-hour full week.
    const stipendWeek = (): { minutes: number; hourlyMinor: number } | null => {
      const bought = Math.round(
        (statedWeekMinutes * linePostedHourlyMinor) / input.hourlyMinor,
      );
      const least = api.parameter("stipendPostMinimumWeeklyMinutes");
      if (bought >= least)
        return { minutes: bought, hourlyMinor: postedHourlyMinor };
      const wage = lawInForce(api, "minimum-wage").value ?? 0;
      const rate = Math.max(
        Math.round((postedHourlyMinor * bought) / least),
        wage,
        1,
      );
      const minutes = Math.round((bought * postedHourlyMinor) / rate);
      return minutes > 0 ? { minutes, hourlyMinor: rate } : null;
    };
    const week = partTime ? stipendWeek() : null;
    // The days it sits: as few of the template's days as hold it (no day
    // longer than the template's longest), the first days of the week first.
    const partTimeSlots = (weekMinutes: number): WorkScheduleSlot[] | null => {
      const days = [...commitment.slots].sort(
        (x, y) => x.offsetDays - y.offsetDays,
      );
      if (weekMinutes <= 0 || !days.length) return null;
      const longest = Math.max(...days.map((slot) => slot.minutes));
      const used = days.slice(
        0,
        Math.min(days.length, Math.max(1, Math.ceil(weekMinutes / longest))),
      );
      return used.map((slot, at) => ({
        ...slot,
        minutes:
          Math.floor(weekMinutes / used.length) +
          (at < weekMinutes % used.length ? 1 : 0),
      }));
    };
    if (partTime && !week) return null;
    const slots = week ? partTimeSlots(week.minutes) : commitment.slots;
    if (!slots) return null;
    const expectedWeeklyMinutes = week
      ? slots.reduce((n, slot) => n + slot.minutes, 0)
      : commitment.expectedWeeklyMinutes;
    const hourlyMinor = week
      ? week.hourlyMinor
      : commitment.expectedWeeklyMinutes > 0
        ? Math.round(
            (postedHourlyMinor * statedWeekMinutes) /
              commitment.expectedWeeklyMinutes,
          )
        : postedHourlyMinor;
    // The hours a day the job works: the template's, or the part-time day's.
    const hoursDaily = week
      ? slots[0]!.minutes / api.parameter("minutesPerHour")
      : template.hoursDaily;
    if (hourlyMinor <= 0) return null;
    // The post replaces whatever job they held.
    if (person.jobId && c.jobs.get(person.jobId)?.endsAt === undefined)
      api.endJob(person.jobId, `public-post:${input.post}:${api.state.date}`);
    // The template's own public pay authority isn't this post's.
    const { publicPayAuthorityId: _authority, ...shape } = commitment;
    void _authority;
    const startsAt = addDays(makeIsoDate(api.state.date), 1);
    const weekKind = week
      ? "a part-time public-office week sized to its budget line at the post's going rate"
      : "a full-time public-office week";
    const commitmentId = `work-commitment:${jobId}`;
    const calendarIdNew = `payroll-calendar:${jobId}`;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: input.citation,
      estimatedFrom: template.id
        ? `The post's pay; ${weekKind}, with paydays that follow ${template.id}.`
        : `The post's pay; ${weekKind} and the government's biweekly pay calendar.`,
    };
    api.startJob(
      {
        id: jobId,
        personId: person.id,
        organizationId: input.employerId,
        title: input.title,
        hourlyMinor,
        hoursDaily,
        wageDailyMinor: week
          ? Math.round(
              (week.hourlyMinor * week.minutes) /
                api.parameter("minutesPerHour") /
                api.parameter("daysPerWeek"),
            )
          : Math.round(postedHourlyMinor * postHoursDaily),
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
        slots,
        expectedWeeklyMinutes,
        hourlyMinor,
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
  /** The job whose pay calendar the post follows, when it follows one. */
  payTemplateId?: string;
  readonly hoursDaily: number;
  readonly commitment: WorkCommitmentInput;
  calendar: WorkPayrollCalendarInput;
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
