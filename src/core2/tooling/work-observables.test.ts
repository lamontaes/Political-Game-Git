import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "../life";
import { parameter as p } from "../parameters";
import type { CoreInput, Source, WorkCommitmentInput } from "../types";
import {
  rosterDiaryExposure,
  summarizeWorkObservables,
} from "./work-observables";

const source: Source = {
  tag: "ESTIMATED",
  asOf: "2021-01-01",
  citation:
    "Controlled observation-boundary fixture; not a generated-world realism receipt.",
};
const ageDays = (result: ReturnType<typeof rosterDiaryExposure>, id: string) =>
  result.byAge.find((row) => row.ageId === id)!.residentDiaryDays;

function fixture(): CoreInput {
  const people = [
    { id: "fixture-worker", birthDate: "2004-01-01", jobId: "fixture-job" },
    { id: "fixture-child", birthDate: "2010-01-01" },
    { id: "fixture-nonworker", birthDate: "1960-01-01" },
  ].map((row) => ({
    ...row,
    givenName: row.id,
    familyName: "Fixture",
    placeId: "fixture-place",
    householdId: `household:${row.id}`,
    tier: "weekly",
    traits: {},
    liquidMinor: p("zero"),
    livingCostDailyMinor: p("minorPerDollar"),
    source,
    familyIds: [],
    knownIds: [],
  }));
  const term: WorkCommitmentInput = {
    id: "fixture-commitment",
    jobId: "fixture-job",
    personId: "fixture-worker",
    organizationId: "fixture-employer",
    startsAt: source.asOf!,
    anchorDate: source.asOf!,
    periodDays: p("one"),
    expectedWeeklyMinutes: p("daysPerWeek") * p("minutesPerHour"),
    hourlyMinor: p("minorPerDollar"),
    slots: [
      {
        offsetDays: p("zero"),
        startMinute: p("workMorningStartMinute"),
        minutes: p("minutesPerHour"),
      },
    ],
    scheduleSource: source,
    paySource: source,
  };
  return {
    seed: "work-exposure-fixture",
    startedAt: source.asOf!,
    people,
    jobs: [
      {
        id: "fixture-job",
        personId: "fixture-worker",
        organizationId: "fixture-employer",
        title: "Recorded worker",
        hoursDaily: p("one"),
        hourlyMinor: p("minorPerDollar"),
        wageDailyMinor: p("minorPerDollar"),
        source,
      },
    ],
    workCommitments: [term],
    organizations: [
      {
        id: "fixture-employer",
        name: "Recorded fixture employer",
        kind: "employer",
        placeId: "fixture-place",
        liquidMinor: p("minorPerDollar") * p("minorPerDollar"),
        source,
      },
    ],
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

describe("dated resident diary exposure and paid-work crosswalk", () => {
  it("counts every resident diary day and changes age on the actual birthday", () => {
    const residents = [
      { id: "birthday-crossing", birthDate: "2001-01-03" },
      { id: "nonworker", birthDate: "1980-01-01" },
    ];
    const result = rosterDiaryExposure(residents, "2021-01-01", "2021-01-05");
    expect(result.residentDiaryDays).toBe(p("two") * p("two") * p("two"));
    expect(ageDays(result, "atus-age-15")).toBe(p("one"));
    expect(ageDays(result, "atus-age-20")).toBe(p("two") + p("one"));
    expect(ageDays(result, "atus-age-35")).toBe(p("two") * p("two"));
  });

  it("uses canonical Feb. 29 age semantics and preserves equivalent date partitions", () => {
    const residents = [
      { id: "leap-birth", birthDate: "1968-02-29" },
      { id: "child", birthDate: "2015-01-01" },
    ];
    const whole = rosterDiaryExposure(residents, "2023-02-26", "2023-03-01");
    const first = rosterDiaryExposure(residents, "2023-02-26", "2023-02-28"),
      last = rosterDiaryExposure(residents, "2023-02-28", "2023-03-01");
    expect(ageDays(whole, "atus-age-45")).toBe(p("one"));
    expect(ageDays(whole, "atus-age-55")).toBe(p("two"));
    for (const row of whole.byAge)
      expect(row.residentDiaryDays).toBe(
        ageDays(first, row.ageId) + ageDays(last, row.ageId),
      );
    expect(ageDays(whole, "below-reference-age")).toBe(p("two") + p("one"));
  });

  it("normalizes actual work over nonworkers as well as workers, with a subset comparison", () => {
    const input = fixture(),
      core = createLifeCore(input);
    advanceCore(core, "2021-01-03");
    const report = summarizeWorkObservables(input, core),
      worker = report.byAge.find((row) => row.ageId === "atus-age-15")!;
    expect(report.exposure.residentDiaryDays).toBe(
      input.people.length * p("two"),
    );
    expect(worker.paidWorkMinutes).toBe(p("two") * p("minutesPerHour"));
    expect(worker.paidWorkHoursPerResidentDiaryDay).toBe(p("one"));
    expect(report.calendar.plannedDatedSegments).toBe(p("two"));
    expect(report.calendar.attendedDatedSegments).toBe(p("two"));
    expect(report.money.paidMinor).toBe(p("two") * p("minorPerDollar"));
    expect(report.money.closedMoneyConserved).toBe(true);
    expect(report.money.latestCashReceiptFailures).toBe(p("zero"));
    expect(worker.comparisonStatus).toContain("subset");
    expect(report.coefficientCalibration).toBe("not-inferred");
    expect(
      report.byAge.find((row) => row.ageId === "atus-age-55")!
        .paidWorkHoursPerResidentDiaryDay,
    ).toBe(p("zero"));
  });

  it("does not treat disabled observation or an opening-only run as zero observed work hours", () => {
    const input = fixture(),
      core = createLifeCore(input, { scheduledWork: false });
    expect(
      summarizeWorkObservables(input, core).byAge.every(
        (row) => row.paidWorkHoursPerResidentDiaryDay === null,
      ),
    ).toBe(true);
    advanceCore(core, "2021-01-02");
    const report = summarizeWorkObservables(input, core);
    expect(report.enabled).toBe(false);
    expect(
      report.byAge.every(
        (row) => row.paidWorkHoursPerResidentDiaryDay === null,
      ),
    ).toBe(true);
  });

  it("rejects unrecorded births, roster removals and changed residency rather than inventing exposure", () => {
    expect(() =>
      rosterDiaryExposure(
        [{ id: "future-birth", birthDate: "2021-01-02" }],
        "2021-01-01",
        "2021-01-03",
      ),
    ).toThrow("dated admission stream");
    const input = fixture(),
      core = createLifeCore(input);
    core.people.delete("fixture-child");
    expect(() => summarizeWorkObservables(input, core)).toThrow(
      "dated exposure admission/removal",
    );
    const moved = createLifeCore(input);
    moved.people.get("fixture-child")!.placeId = "fixture-new-place";
    expect(() => summarizeWorkObservables(input, moved)).toThrow(
      "dated exposure stream",
    );
  });
});
