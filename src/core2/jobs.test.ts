/** M1-04 checks on a recorded fixture; the generated-world year is tooling's job. */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { openLaws, lawInForce } from "./modules/laws";
import { unemploymentTerms } from "./jobs-benefits";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { advanceCore, createLifeCore } from "./life";
import {
  JOBS_MODULE,
  acceptJobOffer,
  acceptScore,
  declineJobOffer,
  jobOffersFor,
  moveLabel,
  quitScore,
  roleMix,
  rolesByDeficit,
} from "./modules/jobs";
import jobsData from "./data/jobs/jobs.json" with { type: "json" };
import { macroCoreData } from "./modules/macro";
import { parameter } from "./parameters";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };
import { startPublicJob } from "./public-payroll";
import { hireStaff } from "./modules/staff";
import { JUSTICE_MODULE, JUSTICE_MODULE_ID } from "./modules/justice";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { residentsRuntime } from "./modules/residents";
import { endCountedJob } from "./residents-economy";
import type { BusinessBooksState } from "./finance-types";
import type {
  CoreInput,
  CoreModule,
  CoreState,
  PersonInput,
  Source,
} from "./types";

// A random place from all 56 (the golden-path seed when the suite runs it).
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`jobs-benefits:${Date.now()}`).digest("hex");
function drawPlace(): { key: string; state: string } {
  const states = [...corePlaceStateIdentities()]
    .map((s) => s.jurisdictionKey)
    .sort();
  const hash = createHash("sha256").update(`${seed}:benefits`).digest("hex");
  const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const place = places[parseInt(hash.slice(8, 16), 16) % places.length]!;
  return { key: place.key, state };
}

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
    // The least reliable worker, only slightly below the middle: a fixture
    // person carries this one trait alone, so it decides their whole lean,
    // and they still file for the benefits they are owed (benefitsFileBase).
    person(id, 50_000, i === 0 ? -0.1 : i - 1),
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
  it("excludes custody from job search and both applicant tiers until release", () => {
    const core = createLifeCore(input(), {
      data,
      modules: [JOBS_MODULE, JUSTICE_MODULE],
    });
    const api = coreAPI(core);
    const jobs = api.moduleState("jobs");
    const custody = api.moduleState(JUSTICE_MODULE_ID).table("custody");
    for (const personId of ["s1", "s2"]) {
      custody.put({ id: `custody:${personId}`, personId, status: "serving" });
      // Stale applications exercise hiring independently of the new-search guard.
      for (const table of ["seekers", "countedSeekers"])
        jobs.table(table).put({
          id: personId,
          personId,
          isSeeker: true,
          placeId: place,
          employed: false,
          since: start,
          referenceHourlyMinor: 0,
        });
    }
    withBooks(core, 2);
    advanceCore(core, "2021-03-31");
    expect(
      jobs
        .table("changes")
        .query("byKind", ["hire"])
        .filter((r) => r.personId === "s1" || r.personId === "s2"),
    ).toEqual([]);
    for (const personId of ["s1", "s2"]) {
      jobs.table("seekers").remove(personId);
      jobs.table("countedSeekers").remove(personId);
    }
    advanceCore(core, "2021-04-30");
    expect(jobs.table("seekers").get("s1")).toBeUndefined();
    expect(jobs.table("seekers").get("s2")).toBeUndefined();
    custody.put({ id: "custody:s1", personId: "s1", status: "released" });
    advanceCore(core, "2021-07-31");
    expect(
      jobs
        .table("changes")
        .query("byPerson", ["s1"])
        .some((r) => r.kind === "hire"),
    ).toBe(true);
    expect(
      jobs
        .table("changes")
        .query("byPerson", ["s2"])
        .some((r) => r.kind === "hire"),
    ).toBe(false);
  });
  it.each(["event", "acceptance"])(
    "withdraws a held offer on custody at %s",
    (boundary) => {
      const core = createLifeCore(input(), {
        data,
        modules: [JOBS_MODULE, JUSTICE_MODULE],
      });
      const api = coreAPI(core);
      const jobs = api.moduleState("jobs");
      jobs.table("positions").put({
        id: "position:custody",
        organizationId: employer,
        status: "open",
        offeredTo: "s1",
        offerId: "offer:custody",
      });
      jobs.table("offers").put({
        id: "offer:custody",
        personId: "s1",
        positionId: "position:custody",
        status: "pending",
      });
      for (const table of ["seekers", "countedSeekers"])
        jobs.table(table).put({ id: "s1", personId: "s1", isSeeker: true });
      api
        .moduleState(JUSTICE_MODULE_ID)
        .table("custody")
        .put({ id: "custody:s1", personId: "s1", status: "serving" });
      expect(
        startPublicJob(api, {
          personId: "s1",
          employerId: employer,
          post: "fixture",
          title: "Fixture",
          hourlyMinor: 1000,
          citation: "Technical fixture",
        }),
      ).toBeNull();
      expect(() =>
        hireStaff(
          api,
          { personId: "s1", officialId: "w1", role: "aide" },
          {
            personId: "s1",
            from: "applicant",
            reach: 1,
            reachBasis: "town",
            workingAge: 1,
            traits: {},
          },
        ),
      ).toThrow("isn't a candidate");
      if (boundary === "event") {
        api.emit({
          id: "justice.imprisoned:fixture",
          kind: "justice.imprisoned",
          date: core.date,
          personIds: ["s1"],
          placeId: place,
          source: src(),
        });
        expect(jobs.table("seekers").get("s1")).toBeUndefined();
        expect(jobs.table("countedSeekers").get("s1")).toBeUndefined();
      }
      expect(acceptJobOffer(api, "offer:custody")).toBe(false);
      expect(jobs.table("offers").get("offer:custody")).toMatchObject({
        status: "withdrawn",
      });
      expect(
        jobs.table("positions").get("position:custody"),
      ).not.toHaveProperty("offeredTo");
      expect(core.people.get("s1")!.jobId).toBeUndefined();
    },
  );
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
  it("fills a declined player opening with the next willing applicant", () => {
    const fixture = input();
    fixture.playerId = "s2";
    const core = createLifeCore(fixture, { data, modules: [JOBS_MODULE] });
    const api = coreAPI(core);
    withBooks(core, 2);
    advanceCore(core, "2021-03-02");
    const pending = jobOffersFor(api, "s2");
    expect(pending).toHaveLength(1);
    const offered = pending[0]!;
    expect(declineJobOffer(api, offered.id)).toBe(true);
    advanceCore(core, "2021-03-10");
    expect(core.people.get("s2")!.jobId).toBeUndefined();
    expect(core.people.get("s1")!.jobId).toBe(`job:${offered.positionId}:s1`);
    expect(
      api.moduleState("jobs").table("offers").get(offered.id),
    ).toMatchObject({ status: "declined" });
  });
  it("values counted applicants' recorded experience without filling them in", () => {
    const fixture = input();
    fixture.workCommitments = [
      ...fixture.workCommitments!,
      {
        ...fixture.workCommitments![0]!,
        id: "commitment:past:s1",
        personId: "s1",
        jobId: "job:past:s1",
        startsAt: "2010-01-01",
        anchorDate: "2010-01-01",
        endsAt: "2020-11-30",
        hourlyMinor: 1400,
      },
    ];
    const core = createLifeCore(
      collapseToTwoLevels(fixture, { keep: new Set(["w1", "w2", "w3", "s2"]) }),
      { data, modules: [JOBS_MODULE] },
    );
    const api = coreAPI(core);
    withBooks(core, 2);
    api.moduleState("jobs").table("countedSeekers").put({
      id: "s1",
      personId: "s1",
      placeId: place,
      isSeeker: true,
      employed: false,
      since: start,
      reasonKey: "started-looking",
      referenceHourlyMinor: 1400,
    });
    advanceCore(core, "2021-03-02");
    const hires = api
      .moduleState("jobs")
      .table("changes")
      .query("byKind", ["hire"]);
    expect(hires[0]).toMatchObject({ personId: "s1" });
    expect(core.people.has("s1")).toBe(false);
    expect(core.people.get("s2")!.jobId).toBeUndefined();
  });
  it("lays off when demand falls below the staff, naming who decided and keeping the most tenured and reliable", () => {
    const core = createLifeCore(input(), { data, modules: [JOBS_MODULE] }),
      api = coreAPI(core),
      total = money(core);
    withBooks(core, 0.25);
    // The log keeps the events of the player's circle, which the director reads.
    core.focusPersonIds.add("w1");
    advanceCore(core, "2021-04-30");
    const layoffs = api
      .moduleState("jobs")
      .table("changes")
      .query("byKind", ["layoff"]);
    expect(layoffs.length).toBeGreaterThan(0);
    expect(layoffs[0]).toMatchObject({
      reasonKey: "demand-below-staff",
      personId: "w1",
    });
    // No owner is recorded, so a worker still on the staff decided it: the
    // best paid of those staying, ties by id; never the firm as a person.
    const staying = ["w2", "w3"]
      .map((id) => core.people.get(id)!)
      .map((person) => ({ id: person.id, job: core.jobs.get(person.jobId!)! }))
      .sort(
        (a, b) =>
          (b.job.hourlyMinor ?? 0) - (a.job.hourlyMinor ?? 0) ||
          a.id.localeCompare(b.id),
      );
    const decider = staying[0]!.id;
    expect(layoffs[0]).toMatchObject({ decidedBy: decider });
    expect(decider).not.toBe(employer);
    expect(
      core.eventIds.has(`event:work.job-lost:${layoffs[0]!.date}:job:w1`),
    ).toBe(true);
    // The event carries who decided and where, for the director's scene at work.
    expect(
      core.durableLog.get(`event:work.job-lost:${layoffs[0]!.date}:job:w1`)
        ?.facts,
    ).toEqual({ decidedBy: decider, organizationId: employer });
    expect(api.moduleState("jobs").table("seekers").get("w1")).toBeTruthy();
    expect(money(core)).toBe(total);
  });
  it("pays a laid-off worker unemployment insurance from the state's fund after the waiting week", () => {
    const drawn = drawPlace();
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
          placeMetadata: { placeKey: drawn.key },
        } as CoreInput,
        { data, modules: [JOBS_MODULE] },
      ),
      api = coreAPI(core);
    openLaws(core);
    withBooks(core, 0.25);
    advanceCore(core, "2021-06-30");
    const claims = api.moduleState("jobs").table("claims").rows();
    const w1 = claims.find((row) => row.personId === "w1");
    // The drawn state's own law sets the claim: the terms read from its row.
    const terms = unemploymentTerms(api);
    const row = lawInForce(api, "unemployment-insurance").governing!;
    expect(row.jurisdiction).toBe(drawn.state);
    if (!terms.hasProgram) {
      // A territory whose law records no program: nobody can claim.
      expect(claims).toEqual([]);
      return;
    }
    expect(w1).toMatchObject({
      weeklyMinor: Math.round(
        Math.min(terms.weeklyMaximumMinor, terms.weeklyShare * 84_000),
      ),
      reasonKey: "demand-below-staff",
      lawId: row.id,
    });
    expect(terms.lawId).toBe(row.id);
    expect(terms.source.citation).toContain(row.id);
    expect(w1!.weeksLeft as number).toBeLessThanOrEqual(terms.maxWeeks);
    expect(Number(w1!.paidMinor)).toBeGreaterThan(0);
    expect(Number(w1!.paidMinor) % Number(w1!.weeklyMinor)).toBe(0);
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
  it("every program in the starting law carries the terms a claim reads, and the places without one say so", () => {
    const rows = Object.entries(startingLaw.jurisdictions).flatMap(
      ([key, list]) =>
        (list as { series: string; terms?: Record<string, unknown> }[])
          .filter((r) => r.series === "unemployment-insurance")
          .map((r) => ({ key, terms: r.terms! })),
    );
    expect(rows).toHaveLength(56);
    for (const { key, terms } of rows) {
      const list = startingLaw.jurisdictions[
        key as keyof typeof startingLaw.jurisdictions
      ] as { series: string; value: number | null }[];
      if (terms.hasProgram !== true) continue;
      expect(typeof terms.maxWeeks).toBe("number");
      expect(
        list.find((r) => r.series === "unemployment-weekly-maximum")?.value,
      ).toBeGreaterThan(0);
    }
    expect(rows.filter((r) => r.terms.hasProgram === true)).toHaveLength(53);
  });
});

describe("jobs: causes, not rates", () => {
  const calm = {
    payGap: 0,
    tenureYears: p("jobsTypicalTenureYears"),
    unemploymentGapPts: 0,
  };
  const pull = (score: number) => 1 / (1 + Math.exp(-score));
  it("a worker who moves to equal or lower pay is never labeled a better offer", () => {
    // Equal pay, a small raise and a fat raise, with no trait pull.
    expect(acceptScore(p, 1_500, 1_500, true)).toBeLessThan(0);
    expect(acceptScore(p, 1_400, 1_500, true)).toBeLessThan(0);
    expect(acceptScore(p, 1_530, 1_500, true)).toBeLessThan(0);
    expect(acceptScore(p, 1_800, 1_500, true)).toBeGreaterThan(0);
    // Sliding: each extra bit of pay adds to the score.
    expect(acceptScore(p, 1_700, 1_500, true)).toBeGreaterThan(
      acceptScore(p, 1_600, 1_500, true),
    );
    // A jobless seeker takes a job at any pay near their last.
    expect(acceptScore(p, 1_500, 1_500, false)).toBeGreaterThan(0);
    const reasons = jobsData.reasons;
    expect(moveLabel(p, 1_500, 1_500, reasons.traitDrawn)).toBe("trait-drawn");
    expect(moveLabel(p, 1_400, 1_500, reasons.otherOffer)).toBe("other-offer");
    expect(moveLabel(p, 1_800, 1_500, reasons.traitDrawn)).toBe("better-offer");
    // Traits can carry a move that pay alone would not: the label says so.
    expect(acceptScore(p, 1_500, 1_500, true, 3)).toBeGreaterThan(0);
  });
  it("quit pulls slide with the pay gap, tenure and the place's unemployment", () => {
    const base = quitScore(p, calm);
    expect(quitScore(p, { ...calm, payGap: 0.1 })).toBeGreaterThan(base);
    expect(quitScore(p, { ...calm, payGap: 0.3 })).toBeGreaterThan(
      quitScore(p, { ...calm, payGap: 0.1 }),
    );
    expect(quitScore(p, { ...calm, tenureYears: 0.5 })).toBeGreaterThan(base);
    expect(quitScore(p, { ...calm, tenureYears: 15 })).toBeLessThan(base);
    expect(quitScore(p, { ...calm, unemploymentGapPts: 5 })).toBeLessThan(base);
    expect(quitScore(p, { ...calm, unemploymentGapPts: -2 })).toBeGreaterThan(
      base,
    );
  });
  it("a neutral worker's pull sits in the JOLTS band, as a check on the total only", () => {
    const quits = jobsData.turnover.industries.total.quits;
    const share = p("jobsQuitToNonemploymentShare");
    const monthly = pull(quitScore(p, calm)) * 100;
    expect(monthly).toBeGreaterThan(quits.p05 * share * 0.8);
    expect(monthly).toBeLessThan(quits.p95 * share * 1.2);
  });
  it("new positions follow the staff mix, counted roles included", () => {
    const job = (id: string, title: string) => ({
      id,
      personId: id,
      organizationId: employer,
      title,
      wageDailyMinor: 1,
      hoursDaily: 8,
      source: src(),
    });
    const staff = [
      job("a", "Server"),
      job("b", "Server"),
      job("c", "Server"),
      job("d", "Cook"),
      job("e", "Dishwasher"),
    ];
    const mix = roleMix(staff, [staff[0]!]);
    expect(mix.Server).toMatchObject({ count: 3, templateJobId: "a" });
    expect(Object.keys(mix).sort()).toEqual(["Cook", "Dishwasher", "Server"]);
    // With the cook gone, the cook role is the most under its share.
    const order = rolesByDeficit(mix, { Server: 3, Dishwasher: 1 });
    expect(order[0]).toBe("Cook");
    // Deterministic.
    expect(rolesByDeficit(mix, { Server: 3, Dishwasher: 1 })).toEqual(order);
  });
  it("opens positions for a counted worker's role and withdraws surplus postings gradually", () => {
    const opening = input();
    const residents = "organization:residents",
      counted = { ...person("c1", 0, 0), householdId: "household:c1" };
    const countedJob = {
      id: "job:c1",
      personId: "c1",
      organizationId: employer,
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
      organizationId: employer,
      payrollCalendarId: "calendar:shop",
    };
    const core = createLifeCore(
      {
        ...opening,
        organizations: [
          ...opening.organizations,
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
          calendars: opening.workPayrollCalendars!,
          flows: [
            {
              id: "residents:wages:shop",
              kind: "wages",
              financeKind: "work.count-payroll",
              payerId: employer,
              payeeId: residents,
              residentsId: residents,
              placeId: place,
              amountMinor: 12_000 * 7,
              periodFactor: 7,
              firstAt: "2021-01-12",
              cadence: { kind: "days", every: 7 },
              salesReceipt: false,
              marketAdjusted: false,
              organizationId: employer,
              jobIds: ["job:c1"],
              perDayMinorByJob: { "job:c1": 12_000 },
              source: src(),
            },
          ],
        },
      },
      { data, modules: [JOBS_MODULE] },
    );
    const book = withBooks(core, 8);
    advanceCore(core, "2021-05-31");
    const positions = coreAPI(core).moduleState("jobs").table("positions");
    const made = ["open", "filled", "withdrawn"].flatMap(
      (status) =>
        positions.query("byStatus", [status]) as unknown as {
          occupation: string;
          status: string;
        }[],
    );
    // The staff is four clerks and one cook: some new position copies the cook's role.
    expect(made.some((row) => row.occupation === "trade:cook")).toBe(true);
    expect(made.some((row) => row.occupation === "trade:clerk")).toBe(true);
    // Demand falls back to the staff: postings lapse over months, not at once.
    const open = () =>
      (positions.query("byStatus", ["open"]) as unknown as unknown[]).length;
    const before = open();
    book.annualDemandMinor = book.capacityMinor / 4;
    const counts: number[] = [];
    for (const date of [
      "2021-06-02",
      "2021-07-02",
      "2021-08-02",
      "2021-09-02",
    ]) {
      advanceCore(core, date);
      counts.push(open());
    }
    // Not all at once: the first review after the fall leaves some open, and the count only falls.
    expect(before).toBeGreaterThanOrEqual(4);
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[0]).toBeLessThan(before);
    for (let i = 1; i < counts.length; i++)
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]!);
  });
});

describe("staffing recovery", () => {
  it("reopens recorded roles after a live employer loses its last worker", () => {
    const departures: CoreModule = {
      id: "test:last-workers",
      onDay(api) {
        if (api.state.date !== "2021-01-02") return;
        api.moduleCalendar("test:last-workers").schedule({
          key: "departures",
          date: "2021-01-03",
          kind: "departures",
          source: src(),
          sourceRecordIds: [...api.state.jobs.values()]
            .filter((job) => job.organizationId === employer && !job.endsAt)
            .map((job) => job.id),
        });
      },
      onCalendarWork(api, work) {
        for (const id of work.sourceRecordIds)
          api.endJob(id, "fixture:all-workers-left");
      },
    };
    const core = createLifeCore(input(), {
      data,
      modules: [JOBS_MODULE, departures],
    });
    withBooks(core, 1);
    advanceCore(core, "2021-01-02");
    const api = coreAPI(core);
    const prior = [...core.jobs.values()].filter(
      (job) => job.organizationId === employer && !job.endsAt,
    );
    expect(prior.length).toBeGreaterThan(0);
    advanceCore(core, "2021-01-04");
    expect(
      [...core.jobs.values()].filter(
        (job) => job.organizationId === employer && !job.endsAt,
      ),
    ).toHaveLength(0);
    advanceCore(core, "2021-03-02");
    const positions = api
      .moduleState("jobs")
      .table("positions")
      .rows()
      .filter((row) => row.organizationId === employer);
    expect(positions.length).toBeGreaterThan(0);
    expect(positions.some((row) => row.status === "filled")).toBe(true);
    expect(
      positions.every((row) =>
        prior.some((job) => job.id === row.templateJobId),
      ),
    ).toBe(true);
    expect(core.finance.businesses.get(employer)!.closedAt).toBeUndefined();
  });
});

describe("quitting during an employed search", () => {
  it("keeps a counted worker eligible to leave while already looking", () => {
    const core = createLifeCore(
      collapseToTwoLevels(input(), {
        keep: new Set(["w1", "w3", "w4", "s1", "s2"]),
      }),
      {
        data: {
          ...data,
          parameters: {
            ...data.parameters,
            jobsQuitBaseline: {
              ...data.parameters.jobsQuitBaseline!,
              value: 20,
            },
          },
        },
        modules: [JOBS_MODULE],
      },
    );
    const api = coreAPI(core);
    withBooks(core, 1);
    api.moduleState("jobs").table("countedSeekers").put({
      id: "w2",
      personId: "w2",
      placeId: place,
      isSeeker: true,
      employed: true,
      since: start,
      reasonKey: "looking-around",
      referenceHourlyMinor: 1500,
    });
    advanceCore(core, "2021-03-02");
    expect(
      api
        .moduleState("jobs")
        .table("changes")
        .query("byPerson", ["w2"])
        .some(
          (row) =>
            row.kind === "quit" && row.reasonKey === jobsData.reasons.leftJob,
        ),
    ).toBe(true);
  });
});

describe("retirement during an employed search", () => {
  it("lets both tiers reconsider work and clears a retired worker's search", () => {
    const fixture = input();
    fixture.people = fixture.people.map((person) =>
      ["w1", "w2"].includes(person.id)
        ? { ...person, birthDate: "1920-01-01" }
        : person,
    );
    const core = createLifeCore(
      collapseToTwoLevels(fixture, {
        keep: new Set(["w1", "w3", "w4", "s1", "s2"]),
      }),
      { data, modules: [JOBS_MODULE] },
    );
    const api = coreAPI(core);
    withBooks(core, 1);
    for (const [personId, table] of [
      ["w1", "seekers"],
      ["w2", "countedSeekers"],
    ])
      api.moduleState("jobs").table(table!).put({
        id: personId!,
        personId: personId!,
        placeId: place,
        isSeeker: true,
        employed: true,
        since: start,
        reasonKey: "looking-around",
        referenceHourlyMinor: 1500,
      });
    advanceCore(core, "2021-04-02");
    for (const [personId, table] of [
      ["w1", "seekers"],
      ["w2", "countedSeekers"],
    ]) {
      expect(
        api
          .moduleState("jobs")
          .table("changes")
          .query("byPerson", [personId!])
          .some((row) => row.reasonKey === jobsData.reasons.retired),
      ).toBe(true);
      expect(
        api.moduleState("jobs").table(table!).get(personId!),
      ).toBeUndefined();
    }
  });
});

describe("closure during an employed job search", () => {
  it("ends both tiers' jobs and records their actual job IDs even when they were already looking", () => {
    const drawn = drawPlace();
    const base = input();
    const closing: CoreModule = {
      id: "test:closure-during-search",
      onDay(api) {
        if (api.state.date !== "2021-01-02") return;
        for (const [personId, table] of [
          ["w1", "seekers"],
          ["w2", "countedSeekers"],
        ]) {
          api.moduleState("jobs").table(table!).put({
            id: personId!,
            personId: personId!,
            placeId: place,
            isSeeker: true,
            employed: true,
            since: api.state.date,
            reasonKey: "looking-around",
            referenceHourlyMinor: 1500,
          });
        }
        api.moduleCalendar("test:closure-during-search").schedule({
          key: "close",
          date: "2021-01-03",
          kind: "close",
          source: src(),
          sourceRecordIds: [employer],
        });
      },
      onCalendarWork(api) {
        endCountedJob(api.state as CoreState, "job:w3");
        api.closeBusinessByChoice({
          organizationId: employer,
          ownerAccountId: api.accounts().main("w4"),
          reasonKey: "fixture:owner-retired",
          source: src(),
        });
      },
    };
    const core = createLifeCore(
      collapseToTwoLevels(
        {
          ...base,
          workCommitments: base.workCommitments!.map((row) => ({
            ...row,
            startsAt: "2019-01-01",
          })),
          placeMetadata: { placeKey: drawn.key },
        },
        { keep: new Set(["w1", "w4", "s1", "s2"]) },
      ),
      { data, modules: [JOBS_MODULE, closing] },
    );
    openLaws(core);
    withBooks(core, 1);
    advanceCore(core, "2021-01-04");
    const api = coreAPI(core);
    const state = api.moduleState("jobs");
    expect(core.jobs.get("job:w1")?.endsAt).toBe("2021-01-03");
    expect(residentsRuntime(core)!.jobs.get("job:w2")?.endsAt).toBe(
      "2021-01-03",
    );
    expect(
      state.table("changes").get("job-change:2021-01-03:job:w3:closure"),
    ).toBeUndefined();
    for (const [personId, table] of [
      ["w1", "seekers"],
      ["w2", "countedSeekers"],
    ]) {
      expect(
        state
          .table("changes")
          .get(`job-change:2021-01-03:job:${personId}:closure`),
      ).toMatchObject({
        personId,
        jobId: `job:${personId}`,
        kind: "closure",
        reasonKey: jobsData.reasons.closure,
      });
      expect(state.table(table!).get(personId!)).toMatchObject({
        employed: false,
        since: "2021-01-03",
        reasonKey: jobsData.reasons.closure,
      });
      if (unemploymentTerms(api).hasProgram)
        expect(
          state.table("claims").get(`claim:${personId}:2021-01-03`),
        ).toBeDefined();
    }
  });
});
