/** Seam: a hire mid-run is scheduled and paid on its calendar; an ended job stops and keeps earned pay. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { advanceCore, createLifeCore } from "./life";
import { parameter as p } from "./parameters";
import { coreAPI } from "./state";
import type { CoreInput, CoreState, Source } from "./types";

const start = "2021-01-01",
  worker = "person:hire",
  employer = "organization:hiring-employer",
  unit = 1_000;
const src = (asOf = start): Source => ({
  tag: "ESTIMATED",
  asOf,
  citation: "Technical fixture records.",
  estimatedFrom: "Job lifecycle seam fixture only.",
});
function input(): CoreInput {
  return {
    seed: "job-lifecycle",
    startedAt: start,
    people: [
      {
        id: worker,
        givenName: "Recorded",
        familyName: "Worker",
        birthDate: "1990-01-01",
        placeId: "place",
        householdId: "household:hire",
        tier: "daily",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        source: src(),
        familyIds: [],
        knownIds: [],
      },
    ],
    households: [
      {
        id: "household:hire",
        placeId: "place",
        memberIds: [worker],
        source: src(),
      },
    ],
    jobs: [],
    organizations: [
      {
        id: employer,
        placeId: "place",
        name: "Hiring employer",
        kind: "employer",
        liquidMinor: unit * 100,
        source: src(),
      },
    ],
    workCommitments: [],
    workPayrollCalendars: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
const money = (core: CoreState) =>
  core.people.get(worker)!.liquidMinor +
  core.organizations.get(employer)!.liquidMinor;

describe("job start and end mid-run", () => {
  it("pays a new hire on the employer's payday and keeps earned pay after the job ends", () => {
    const core = createLifeCore(input(), {
        data: DEFAULT_DATA,
        modules: [
          {
            id: "fixture-layoff",
            onCalendarWork: (calendarApi, work) =>
              calendarApi.endJob(work.sourceRecordIds[0]!, work.key),
          },
        ],
      }),
      api = coreAPI(core),
      total = money(core);
    advanceCore(core, "2021-01-03");
    const startsAt = "2021-01-04";
    api.startJob(
      {
        id: "job:hire",
        personId: worker,
        organizationId: employer,
        title: "New hire",
        wageDailyMinor: unit,
        hoursDaily: p("one"),
        hourlyMinor: unit,
        source: src(core.date),
      },
      {
        id: "commitment:hire",
        jobId: "job:hire",
        personId: worker,
        organizationId: employer,
        payrollCalendarId: "calendar:hire",
        startsAt,
        anchorDate: startsAt,
        periodDays: p("one"),
        expectedWeeklyMinutes: p("daysPerWeek") * p("minutesPerHour"),
        hourlyMinor: unit,
        slots: [
          {
            offsetDays: p("zero"),
            startMinute: 9 * 60,
            minutes: p("minutesPerHour"),
          },
        ],
        paySource: src(core.date),
        scheduleSource: src(core.date),
      },
      {
        id: "calendar:hire",
        organizationId: employer,
        workCommitmentIds: ["commitment:hire"],
        basisRecordIds: [employer, "job:hire", "commitment:hire"],
        rule: "fixed-days-after-inclusive-period-end",
        periodDays: p("daysPerWeek"),
        firstPeriodStartsAt: startsAt,
        firstPaydayAt: "2021-01-15",
        effectiveFrom: startsAt,
        nonbusinessDayRule: "no-adjustment",
        arrearsRule: "carry-to-next-recorded-payday",
        source: src(core.date),
      },
    );
    expect(core.people.get(worker)!.jobId).toBe("job:hire");
    api.moduleCalendar("fixture-layoff").schedule({
      key: "fixture:layoff",
      date: "2021-01-08",
      kind: "layoff",
      source: src(core.date),
      sourceRecordIds: ["job:hire"],
    });
    advanceCore(core, "2021-01-08");
    expect(core.jobs.get("job:hire")!.endsAt).toBe("2021-01-08");
    expect(core.people.get(worker)!.jobId).toBeUndefined();
    advanceCore(core, "2021-01-31");
    const paid = core.people.get(worker)!.liquidMinor;
    expect(paid).toBeGreaterThan(p("zero"));
    expect(paid).toBeLessThanOrEqual(unit * 5);
    expect(money(core)).toBe(total);
  });
});
