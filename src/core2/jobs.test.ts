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
  it("pays a laid-off worker unemployment insurance from the state's fund after the waiting week", () => {
    const opening = input();
    const outside = "organization:outside";
    const core = createLifeCore(
        {
          ...opening,
          organizations: [
            ...opening.organizations!,
            {
              id: outside,
              placeId: place,
              name: "Outside the town",
              kind: "outside",
              liquidMinor: 0,
              outsideFlow: src(),
              source: src(),
            },
          ],
        } as CoreInput,
        { data, modules: [JOBS_MODULE] },
      ),
      api = coreAPI(core);
    withBooks(core, 0.25);
    advanceCore(core, "2021-06-30");
    const claims = api.moduleState("jobs").table("claims").rows();
    const w1 = claims.find((row) => row.personId === "w1");
    // Half of $840 a week, under the $611 maximum; the waiting week unpaid.
    expect(w1).toMatchObject({
      weeklyMinor: 42_000,
      reasonKey: "demand-below-staff",
    });
    expect(Number(w1!.paidMinor)).toBeGreaterThan(0);
    expect(Number(w1!.paidMinor) % 42_000).toBe(0);
    expect(String(w1!.nextPayAt) > String(w1!.filedAt)).toBe(true);
    // Nobody who kept their job has a claim.
    const laidOff = new Set(
      api
        .moduleState("jobs")
        .table("changes")
        .query("byKind", ["layoff"])
        .map((row) => row.personId),
    );
    for (const row of claims) expect(laidOff.has(row.personId)).toBe(true);
    const flows = core.cashJournal.externalFlowsByOwner.get(outside);
    expect(flows?.netMinor).toBe(
      -claims.reduce((sum, row) => sum + Number(row.paidMinor), 0),
    );
  });

  it("puts a young adult who never worked into the labor market when the household's money runs short, in a two-level world", () => {
    const opening = input();
    // A parent with no money and an 18-year-old whose own living cost the
    // household carries; neither has worked in this world.
    const home = "household:young";
    const parent = {
      ...person("p1", 0, 0),
      householdId: home,
      birthDate: "1975-01-01",
    };
    const young = {
      ...person("y1", 0, 0),
      householdId: home,
      birthDate: "2002-06-01",
      livingCostDailyMinor: 0,
    };
    const core = createLifeCore(
      {
        ...opening,
        people: [...opening.people, parent, young],
        households: [
          ...opening.households,
          { id: home, placeId: place, memberIds: ["p1", "y1"], source: src() },
        ],
        residents: {
          version: "core2-residents-v1",
          source: src(),
          accounts: [],
          households: [],
          flows: [],
        },
      },
      { data, modules: [JOBS_MODULE] },
    );
    withBooks(core, 1);
    advanceCore(core, "2021-02-02");
    expect(
      coreAPI(core).moduleState("jobs").table("seekers").get("y1"),
    ).toMatchObject({ reasonKey: "started-looking", employed: false });
  });
  it("introduces a new hire to the full coworkers already working there", () => {
    const core = createLifeCore(input(), { data, modules: [JOBS_MODULE] }),
      api = coreAPI(core);
    withBooks(core, 2);
    advanceCore(core, "2021-03-31");
    const hire = api
      .moduleState("jobs")
      .table("changes")
      .query("byKind", ["hire"])[0]!;
    const hired = core.people.get(hire.personId as string)!;
    for (const id of ["w1", "w2", "w3", "w4"])
      expect(hired.knownIds.has(id)).toBe(true);
  });
  it("lets a full person take a role first held by a counted worker, on that worker's schedule", () => {
    const opening = input();
    const diner = "organization:diner",
      residents = "organization:residents",
      counted = { ...person("c1", 0, 0), householdId: "household:c1" };
    const countedJob = {
      id: "job:c1",
      personId: "c1",
      organizationId: diner,
      title: "Cook",
      occupationClassification: "trade:cook",
      hourlyMinor: 1_500,
      hoursDaily: 8,
      wageDailyMinor: 12_000,
      source: src(),
    };
    const commitment = {
      ...opening.workCommitments![0]!,
      id: "commitment:c1",
      jobId: "job:c1",
      personId: "c1",
      organizationId: diner,
      payrollCalendarId: "calendar:diner",
    };
    const calendar = {
      ...opening.workPayrollCalendars![0]!,
      id: "calendar:diner",
      organizationId: diner,
      workCommitmentIds: ["commitment:c1"],
      basisRecordIds: [diner],
    };
    // Only the jobless seekers s1 and s2 are full people near the diner.
    const core = createLifeCore(
      {
        ...opening,
        organizations: [
          ...opening.organizations,
          { ...opening.organizations[0]!, id: diner, name: "Diner" },
          {
            id: residents,
            placeId: place,
            name: "Residents",
            kind: "residents",
            liquidMinor: 0,
            source: src(),
          },
        ],
        residents: {
          version: "core2-residents-v1",
          source: src(),
          accounts: [{ placeId: place, accountId: residents }],
          households: [
            {
              household: {
                id: "household:c1",
                placeId: place,
                memberIds: ["c1"],
                source: src(),
              },
              people: [counted],
              jobs: [countedJob],
              workCommitments: [commitment],
              contracts: [],
            },
          ],
          calendars: [calendar],
          flows: [
            {
              id: "residents:wages:diner",
              kind: "wages",
              financeKind: "work.count-payroll",
              payerId: diner,
              payeeId: residents,
              residentsId: residents,
              placeId: place,
              amountMinor: 12_000 * 7,
              periodFactor: 7,
              firstAt: "2021-01-12",
              cadence: { kind: "days", every: 7 },
              salesReceipt: false,
              marketAdjusted: false,
              organizationId: diner,
              jobIds: ["job:c1"],
              perDayMinorByJob: { "job:c1": 12_000 },
              source: src(),
            },
          ],
        },
      },
      { data, modules: [JOBS_MODULE] },
    );
    withBooks(core, 1);
    const shop = core.finance.businesses.get(employer)!;
    core.finance.businesses.set(diner, {
      ...shop,
      organizationId: diner,
      annualPayrollMinor: 12_000 * 260,
      annualDemandMinor: 12_000 * 260 * 4 * 10,
      capacityMinor: 12_000 * 260 * 4,
      anchorAnnualDemandMinor: 12_000 * 260 * 4,
    });
    advanceCore(core, "2021-03-31");
    const hires = coreAPI(core)
      .moduleState("jobs")
      .table("changes")
      .query("byKind", ["hire"])
      .filter((row) => row.organizationId === diner);
    const full = hires.find((row) => core.people.has(row.personId as string));
    expect(full).toBeTruthy();
    const job = core.jobs.get(full!.jobId as string)!;
    expect(job).toMatchObject({ organizationId: diner, title: "Cook" });
    const schedule = [...core.work.commitments.values()].find(
      (row) => row.jobId === job.id,
    )!;
    expect(schedule.slots).toEqual(commitment.slots);
  });
});
