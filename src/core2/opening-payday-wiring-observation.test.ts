/** Additive constructor-boundary fixtures. SOURCE-ONLY and UNEXECUTED by the reviewer. */
import { describe, expect, it } from "vitest";
import { createLifeCore } from "./life";
import { WORK_MODULE } from "./modules/work";
import { parameter as p } from "./parameters";
import { admittedWorkPayrollCalendarMatches } from "./work-attendance";
import type { WorkPayrollCalendarInput } from "./work-pay-period";
import type { CoreInput, Source } from "./types";

const zero = p("zero"),
  one = p("one"),
  unit = p("minorPerDollar");
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-11-01",
  citation:
    "Actual controlled constructor fixture owners, job and standing terms.",
  estimatedFrom:
    "Independent saved technical records, not an observed employer or generated-world claim.",
  generationPriorVintage: "controlled-constructor-vintage",
};
function packet(): CoreInput {
  const calendar: WorkPayrollCalendarInput = {
    id: "caller-calendar",
    organizationId: "employer",
    workCommitmentIds: ["work"],
    basisRecordIds: ["employer", "job", "work"],
    rule: "fixed-days-after-inclusive-period-end",
    periodDays: p("daysPerWeek"),
    firstPeriodStartsAt: "2021-02-01",
    firstPaydayAt: "2021-02-08",
    effectiveFrom: "2021-02-01",
    effectiveUntil: "2021-04-01",
    nonbusinessDayRule: "no-adjustment",
    arrearsRule: "carry-to-next-recorded-payday",
    source: {
      ...source,
      citation: "Caller full independently recorded future calendar Source.",
      estimatedFrom:
        "Exact caller-supplied dates, end, cadence and basis; full rationale stays on the genuine owner.",
      generationPriorVintage: "caller-full-custom-calendar",
    },
  };
  return {
    seed: "controlled-payday-constructor-wiring",
    startedAt: "2021-01-01",
    people: [
      {
        id: "worker",
        givenName: "Opening",
        familyName: "Fixture",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: unit,
        livingCostDailyMinor: zero,
        familyIds: [],
        knownIds: [],
        jobId: "job",
        source,
      },
    ],
    households: [
      { id: "home", placeId: "place", memberIds: ["worker"], source },
    ],
    organizations: [
      {
        id: "employer",
        name: "Recorded employer",
        kind: "employer",
        placeId: "place",
        liquidMinor: unit,
        source,
      },
    ],
    jobs: [
      {
        id: "job",
        personId: "worker",
        organizationId: "employer",
        title: "Independent owned primary job",
        hoursDaily: one,
        hourlyMinor: unit,
        wageDailyMinor: unit,
        source,
      },
    ],
    workCommitments: [
      {
        id: "work",
        jobId: "job",
        personId: "worker",
        organizationId: "employer",
        payrollCalendarId: calendar.id,
        startsAt: "2021-02-01",
        anchorDate: "2021-02-01",
        periodDays: one,
        hourlyMinor: unit,
        expectedWeeklyMinutes: p("minutesPerHour") * p("daysPerWeek"),
        slots: [
          { offsetDays: zero, startMinute: zero, minutes: p("minutesPerHour") },
        ],
        scheduleSource: {
          ...source,
          citation:
            "Full custom independent actual attendance schedule Source.",
        },
        paySource: {
          ...source,
          citation: "Full custom independent actual hourly pay Source.",
        },
      },
    ],
    workPayrollCalendars: [calendar],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function noEarningsOrPayment(
  core: ReturnType<typeof createLifeCore>,
  input: CoreInput,
) {
  expect(core.work.totalsByJob.size).toBe(zero);
  expect(core.work.payrollLedgerByCommitment.size).toBe(zero);
  expect(core.work.earnedPayPeriods.size).toBe(zero);
  expect(core.work.payrollPeriodsByDue.size).toBe(zero);
  expect(core.work.payrollArrearsByDue.size).toBe(zero);
  expect(core.work.lastAttendanceByJob.size).toBe(zero);
  expect(core.work.latestPayrollByJob.size).toBe(zero);
  expect(core.work.payrollCashSources.size).toBe(zero);
  expect(core.work.lastResultByJob.size).toBe(zero);
  expect(core.work.cashSources.size).toBe(zero);
  expect(core.actCounters.size).toBe(zero);
  for (const row of input.people) {
    expect(core.people.get(row.id)!.liquidMinor).toBe(row.liquidMinor);
    expect(core.people.get(row.id)!.source).toEqual(row.source);
  }
  for (const row of input.organizations) {
    expect(core.organizations.get(row.id)!.liquidMinor).toBe(row.liquidMinor);
    expect(core.organizations.get(row.id)!.source).toEqual(row.source);
  }
}
describe("opening payroll wiring without fictional earning or cash (UNEXECUTED)", () => {
  it("omitted plans generate only actual primary jobs while retaining nonprimary and ended job records", () => {
    const data = packet();
    delete data.workCommitments;
    delete data.workPayrollCalendars;
    data.jobs = [
      ...data.jobs,
      { ...data.jobs[zero]!, id: "retained-other-job" },
      { ...data.jobs[zero]!, id: "retained-ended-job", endsAt: "2020-12-31" },
    ];
    const original = structuredClone(data),
      core = createLifeCore(data, { observer: false });
    expect([...core.work.commitments.values()].map((row) => row.jobId)).toEqual(
      ["job"],
    );
    expect(core.work.payrollCalendars.size).toBe(one);
    const calendar = [...core.work.payrollCalendars.values()][zero]!;
    expect(calendar.source.tag).toBe("ESTIMATED");
    expect(calendar.source.estimatedFrom).toContain(
      "No pre-opening earned pay",
    );
    expect(
      admittedWorkPayrollCalendarMatches(core, calendar.id, calendar),
    ).toBe(true);
    for (const job of data.jobs)
      expect(core.jobs.get(job.id)!.source).toEqual(job.source);
    expect(core.jobs.has("retained-ended-job")).toBe(true);
    noEarningsOrPayment(core, data);
    expect(data).toEqual(original);
  });
  it("explicit empty plans and calendars stay empty despite a real current primary job", () => {
    const data = { ...packet(), workCommitments: [], workPayrollCalendars: [] },
      original = structuredClone(data),
      core = createLifeCore(data, { observer: false });
    expect(core.people.get("worker")!.jobId).toBe("job");
    expect(core.work.commitments.size).toBe(zero);
    expect(core.work.payrollCalendars.size).toBe(zero);
    expect(core.work.payrollCalendarByJob.size).toBe(zero);
    expect(core.work.payrollCalendarByCommitment.size).toBe(zero);
    noEarningsOrPayment(core, data);
    expect(data).toEqual(original);
  });
  it("scheduledWork false clears both runtime collections without altering supplied owner records or future calendar input", () => {
    const data = packet(),
      original = structuredClone(data),
      core = createLifeCore(data, { scheduledWork: false, observer: false });
    expect(core.data.work).toBeUndefined();
    expect(core.modules.has(WORK_MODULE.id)).toBe(false);
    expect(core.work.commitments.size).toBe(zero);
    expect(core.work.payrollCalendars.size).toBe(zero);
    expect(core.work.payrollCalendarByJob.size).toBe(zero);
    expect(core.work.payrollCalendarByCommitment.size).toBe(zero);
    noEarningsOrPayment(core, data);
    expect(data).toEqual(original);
  });
  it("preserves caller-supplied future dates/end/cadence/full Sources while admitting an independent owned immutable calendar", () => {
    const data = packet(),
      original = structuredClone(data),
      supplied = data.workPayrollCalendars![zero]!,
      core = createLifeCore(data, { observer: false }),
      actual = core.work.payrollCalendars.get(supplied.id)!,
      work = core.work.commitments.get("work")!;
    expect(actual).toEqual(supplied);
    expect(actual).not.toBe(supplied);
    expect(Object.isFrozen(actual)).toBe(true);
    expect(actual.source).toEqual(supplied.source);
    expect(actual.source).not.toBe(supplied.source);
    expect(admittedWorkPayrollCalendarMatches(core, actual.id, actual)).toBe(
      true,
    );
    expect(work.paySource).toEqual(data.workCommitments![zero]!.paySource);
    expect(work.scheduleSource).toEqual(
      data.workCommitments![zero]!.scheduleSource,
    );
    expect(core.work.payrollCalendarByJob.get("job")).toBe(actual.id);
    expect(core.work.payrollCalendarByCommitment.get("work")).toBe(actual.id);
    expect(actual.firstPaydayAt).toBe("2021-02-08");
    expect(actual.effectiveUntil).toBe("2021-04-01");
    noEarningsOrPayment(core, data);
    expect(data).toEqual(original);
  });
  it("a supplied independently owned calendar fills only an omitted link and preserves exact existing attendance/pay terms", () => {
    const data = packet();
    data.workCommitments = data.workCommitments!.map((row) => {
      const copy = { ...row };
      delete copy.payrollCalendarId;
      return copy;
    });
    const original = structuredClone(data),
      core = createLifeCore(data, { observer: false }),
      actual = core.work.commitments.get("work")!;
    expect(actual.payrollCalendarId).toBe("caller-calendar");
    for (const key of [
      "startsAt",
      "anchorDate",
      "periodDays",
      "hourlyMinor",
      "expectedWeeklyMinutes",
      "slots",
      "paySource",
      "scheduleSource",
    ] as const)
      expect(actual[key]).toEqual(data.workCommitments![zero]![key]);
    noEarningsOrPayment(core, data);
    expect(data).toEqual(original);
  });
  it("does not replace unavailable supplied authority with a startup calendar or invent absent calendar basis records", () => {
    for (const change of [
      (calendar: WorkPayrollCalendarInput) => ({
        ...calendar,
        source: { ...calendar.source, asOf: "2021-01-02" },
      }),
      (calendar: WorkPayrollCalendarInput) => ({
        ...calendar,
        basisRecordIds: ["missing-record"],
      }),
    ]) {
      const data = packet();
      data.workPayrollCalendars = [change(data.workPayrollCalendars![zero]!)];
      const original = structuredClone(data);
      expect(() => createLifeCore(data, { observer: false })).toThrow();
      expect(data).toEqual(original);
    }
  });
});
