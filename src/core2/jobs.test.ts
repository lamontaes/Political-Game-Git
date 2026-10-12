/** M1-04 checks on a recorded fixture; the generated-world year is tooling's job. */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { JOBS_MODULE } from "./modules/jobs";
import { macroCoreData } from "./modules/macro";
import { parameter } from "./parameters";
import { coreAPI } from "./state";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, CoreState, PersonInput, Source } from "./types";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);
const start = "2021-01-01",
  employer = "organization:shop",
  place = "place:jobs-fixture";
const src = (asOf = start): Source => ({
  tag: "ESTIMATED",
  asOf,
  citation: "Technical fixture records.",
  estimatedFrom: "Jobs fixture only.",
});
function person(
  id: string,
  liquidMinor: number,
  reliability: number,
): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1990-01-01",
    placeId: place,
    householdId: `household:${id}`,
    tier: "monthly",
    traits: { "people-mind-v1:reliability": reliability },
    liquidMinor,
    livingCostDailyMinor: 1_000,
    source: src(),
    familyIds: [],
    knownIds: [],
  };
}
function input(): CoreInput {
  const workers = ["w1", "w2", "w3", "w4"].map((id, i) =>
    person(id, 50_000, i - 1),
  );
  const seekers = ["s1", "s2"].map((id, i) =>
    person(id, 1_000 * (i + 1), i * 2),
  );
  const people = [...workers, ...seekers];
  const pastJobs = seekers.map((w) => ({
    id: `job:past:${w.id}`,
    personId: w.id,
    organizationId: employer,
    title: "Clerk",
    occupationClassification: "trade:clerk",
    hourlyMinor: 1_400,
    hoursDaily: 8,
    wageDailyMinor: 11_200,
    endsAt: "2020-11-30",
    source: src(),
  }));
  const jobs = workers.map((w) => ({
    id: `job:${w.id}`,
    personId: w.id,
    organizationId: employer,
    title: "Clerk",
    occupationClassification: "trade:clerk",
    hourlyMinor: 1_500,
    hoursDaily: 8,
    wageDailyMinor: 12_000,
    source: src(),
  }));
  return {
    seed: "jobs-fixture",
    startedAt: start,
    people: people.map((row) => ({
      ...row,
      jobId: row.id.startsWith("w") ? `job:${row.id}` : undefined,
    })),
    households: people.map((row) => ({
      id: row.householdId,
      placeId: place,
      memberIds: [row.id],
      source: src(),
    })),
    jobs: [...jobs, ...pastJobs],
    organizations: [
      {
        id: employer,
        placeId: place,
        name: "Shop",
        kind: "employer",
        liquidMinor: 50_000_000,
        source: src(),
      },
    ],
    workCommitments: workers.map((w) => ({
      id: `commitment:${w.id}`,
      jobId: `job:${w.id}`,
      personId: w.id,
      organizationId: employer,
      payrollCalendarId: "calendar:shop",
      startsAt: start,
      anchorDate: start,
      periodDays: 7,
      expectedWeeklyMinutes: 5 * 480,
      hourlyMinor: 1_500,
      slots: [0, 1, 2, 3, 4].map((day) => ({
        offsetDays: day,
        startMinute: 540,
        minutes: 480,
      })),
      paySource: src(),
      scheduleSource: src(),
    })),
    workPayrollCalendars: [
      {
        id: "calendar:shop",
        organizationId: employer,
        workCommitmentIds: workers.map((w) => `commitment:${w.id}`),
        basisRecordIds: [employer],
        rule: "fixed-days-after-inclusive-period-end",
        periodDays: 7,
        firstPeriodStartsAt: start,
        firstPaydayAt: "2021-01-12",
        effectiveFrom: start,
        nonbusinessDayRule: "no-adjustment",
        arrearsRule: "carry-to-next-recorded-payday",
        source: src(),
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function withBooks(core: CoreState, demandRatio: number): BusinessBooksState {
  const book = {
    organizationId: employer,
    kindId: "retail",
    annualPayrollMinor: 4 * 12_000 * 260,
    annualDemandMinor: 4 * 12_000 * 260 * 4 * demandRatio,
    capacityMinor: 4 * 12_000 * 260 * 4,
    annualOtherCostsMinor: 0,
    openingTownIncomeMinor: 0,
    price: 1,
    costContractIds: [],
    source: src(),
    lastReviewedAt: start,
    reachedIncomeRatio: 1,
    anchorAnnualDemandMinor: 4 * 12_000 * 260 * 4,
    anchorAnnualOtherCostsMinor: 0,
    anchorPrice: 1,
    lastGeneralPriceFactor: 1,
    lastWagePriceFactor: 1,
    nextReviewedAt: "2099-01-01",
    receivedMinor: 0,
    salesReceivedMinor: 0,
    operatingPaidMinor: 0,
    wagesRequestedMinor: 0,
    wagesPaidMinor: 0,
    wagesUnpaidMinor: 0,
  } as unknown as BusinessBooksState;
  core.finance.businesses.set(employer, book);
  return book;
}
const money = (core: CoreState) =>
  [...core.people.values()].reduce((s, r) => s + r.liquidMinor, 0) +
  [...core.organizations.values()].reduce((s, r) => s + r.liquidMinor, 0);

describe("jobs", () => {
  it("opens a position when demand outgrows the staff, hires the best-placed seeker, and records why", () => {
    const core = createLifeCore(input(), { data, modules: [JOBS_MODULE] }),
      api = coreAPI(core),
      total = money(core);
    withBooks(core, 2);
    advanceCore(core, "2021-03-31");
    const store = api.moduleState("jobs");
    const hires = store.table("changes").query("byKind", ["hire"]);
    expect(hires.length).toBeGreaterThan(0);
    for (const row of hires)
      expect(row).toMatchObject({ reasonKey: "hired", decidedBy: employer });
    const hired = hires[0]!.personId as string;
    expect(core.people.get(hired)!.jobId).toMatch(/^job:position:/);
    expect(money(core)).toBe(total);
    expect(p("jobsStaffGapActedPerMonth")).toBeGreaterThan(0);
  });
  it("lays off when demand falls below the staff, naming who decided and keeping the most tenured and reliable", () => {
    const core = createLifeCore(input(), { data, modules: [JOBS_MODULE] }),
      api = coreAPI(core),
      total = money(core);
    withBooks(core, 0.25);
    advanceCore(core, "2021-04-30");
    const layoffs = api
      .moduleState("jobs")
      .table("changes")
      .query("byKind", ["layoff"]);
    expect(layoffs.length).toBeGreaterThan(0);
    expect(layoffs[0]).toMatchObject({
      reasonKey: "demand-below-staff",
      decidedBy: employer,
      personId: "w1",
    });
    expect(
      core.eventIds.has(`event:work.job-lost:${layoffs[0]!.date}:job:w1`),
    ).toBe(true);
    expect(api.moduleState("jobs").table("seekers").get("w1")).toBeTruthy();
    expect(money(core)).toBe(total);
  });
});
