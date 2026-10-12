/** M1-05 checks on a recorded fixture: eviction only from unpaid rent, through the place's steps. */
import { describe, expect, it } from "vitest";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE, setRightToCounsel } from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { transferCash } from "./world-transfer";
import type { CoreInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:housing-fixture",
  landlord = "organization:landlord";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Housing fixture only.",
};
function input(usps: string): CoreInput {
  const people = [
    ["payer", 10_000_000],
    ["broke", 0],
  ] as const;
  return {
    seed: "housing-fixture",
    startedAt: start,
    people: people.map(([id, cash]) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: place,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: cash,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
    })),
    households: people.map(([id]) => ({
      id: `household:${id}`,
      placeId: place,
      memberIds: [id],
      source: src,
    })),
    jobs: [],
    organizations: [
      {
        id: landlord,
        placeId: place,
        name: "Rentals",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
    ],
    finance: {
      contracts: people.map(([id]) => ({
        id: `lease:household:${id}`,
        householdId: `household:${id}`,
        payerIds: [id],
        payeeId: landlord,
        kind: "household-purchase",
        amountMinor: 100_000,
        dueAt: "2021-02-01",
        periodMonths: 1,
        accruesArrears: true,
        source: src,
      })),
      facilities: [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    placeMetadata: { housingState: usps },
  };
}

describe("eviction follows the place's steps", () => {
  it("serves notice after the grace period, files after the cure deadline, and removes only after judgment", () => {
    const usps = "TX",
      law = housingData.eviction[usps];
    const core = createLifeCore(input(usps), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-04-30");
    const cases = api.moduleState("housing").snapshot().tables
      .cases as unknown as Record<string, string | number | boolean>[];
    expect(cases.every((row) => row.leaseId === "lease:household:broke")).toBe(
      true,
    );
    const first = cases[0]!;
    expect(first).toMatchObject({ stage: "removed", noticeAt: "2021-02-06" });
    const days = (a: unknown, b: unknown) =>
      (Date.parse(String(b)) - Date.parse(String(a))) / 86_400_000;
    expect(days(first.noticeAt, first.filedAt)).toBe(law.noticeDays);
    expect(days(first.filedAt, first.judgmentAt)).toBe(law.hearingDays);
    expect(days(first.judgmentAt, first.removedAt)).toBe(law.stayDays);
    expect(core.eventIds.has(`event:housing.eviction:${first.id}`)).toBe(true);
    expect(core.finance.contracts.get("lease:household:broke")!.endedAt).toBe(
      first.removedAt,
    );
    expect(
      core.finance.contracts.get("lease:household:payer")!.endedAt,
    ).toBeUndefined();
    expect(core.organizations.get(landlord)!.liquidMinor).toBe(300_000);
  });
});

describe("paying within the notice period", () => {
  it("in South Carolina, whose statute lets a tenant cure, cures the case when the household pays what it owes before the deadline", () => {
    const core = createLifeCore(input("SC"), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-02-07");
    // The broke household is paid after the notice (a payday), from the landlord-unrelated payer.
    transferCash(api, "fixture:payday", "payer", "broke", 500_000, src);
    advanceCore(core, "2021-02-28");
    const cases = api.moduleState("housing").snapshot().tables
      .cases as unknown as { stage: string; leaseId: string }[];
    expect(
      cases.find((row) => row.leaseId === "lease:household:broke"),
    ).toMatchObject({ stage: "cured" });
    expect(
      core.finance.contracts.get("lease:household:broke")!.arrearsMinor,
    ).toBe(0);
  });
});

describe("buying a home", () => {
  it("a renter whose rent outruns what a mortgage would cost buys with the down payment from savings and a loan from the town bank; the lease ends; money balances", async () => {
    const { CREDIT_MODULE } = await import("./modules/credit");
    const { MACRO_MODULE, withCentralBank } = await import("./modules/macro");
    const base = input("TX");
    const buyer = {
      ...base.people[0]!,
      liquidMinor: 10_000_000,
      jobId: "job:payer",
    };
    const fixture = withCentralBank({
      ...base,
      people: [buyer, base.people[1]!],
      jobs: [
        {
          id: "job:payer",
          personId: "payer",
          organizationId: "organization:shop",
          title: "Clerk",
          hourlyMinor: 1_875,
          hoursDaily: 8,
          wageDailyMinor: 15_000,
          source: src,
        },
      ],
      organizations: [
        ...base.organizations,
        {
          id: "organization:shop",
          placeId: place,
          name: "Shop",
          kind: "employer",
          liquidMinor: 100_000_000,
          source: src,
        },
        {
          id: "organization:bank:fixture",
          placeId: place,
          name: "Bank",
          kind: "bank",
          liquidMinor: 500_000_000,
          source: src,
        },
        {
          id: "outside-market:fixture",
          placeId: place,
          name: "Outside",
          kind: "outside-market",
          liquidMinor: 0,
          outsideFlow: src,
          source: src,
        },
      ],
      finance: {
        ...base.finance!,
        contracts: base.finance!.contracts.map((row) =>
          row.id === "lease:household:payer"
            ? { ...row, amountMinor: 200_000 }
            : row,
        ),
      },
      placeMetadata: { housingState: "TX", housingCounty: "01001" },
    });
    const core = createLifeCore(fixture, {
        data: worldCoreData(),
        modules: [MACRO_MODULE, CREDIT_MODULE, HOUSING_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core);
    const cash = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const outsideNet = () =>
      [...core.cashJournal.externalFlowsByOwner.values()].reduce(
        (n, row) => n + row.netMinor,
        0,
      );
    const opening = cash();
    advanceCore(core, "2021-03-10");
    const purchases = api.moduleState("housing").snapshot().tables
      .purchases as unknown as {
      householdId: string;
      downMinor: number;
      loanMinor: number;
    }[];
    expect(purchases[0]).toMatchObject({ householdId: "household:payer" });
    expect(purchases[0]!.downMinor).toBeGreaterThan(0);
    expect(purchases[0]!.loanMinor).toBeGreaterThan(0);
    expect(
      core.finance.contracts.get("lease:household:payer")!.endedAt,
    ).toBeDefined();
    const loans = api.moduleState("credit").snapshot().tables
      .loans as unknown as { kind: string; householdId: string }[];
    expect(
      loans.some(
        (row) =>
          row.kind === "mortgage" && row.householdId === "household:payer",
      ),
    ).toBe(true);
    expect(
      api
        .moduleState("housing")
        .table("dwellings")
        .get("dwelling:household:payer"),
    ).toMatchObject({ tenure: "own", basis: "purchase" });
    expect(cash()).toBe(opening - outsideNet());
  });
});

describe("right to counsel in eviction", () => {
  it("where the law gives tenants a lawyer, a working household behind on rent settles for a payment plan and stays", () => {
    const opening = input("TX");
    const core = createLifeCore(
        {
          ...opening,
          people: opening.people.map((row) =>
            row.id === "broke" ? { ...row, jobId: "job:broke" } : row,
          ),
          jobs: [
            {
              id: "job:broke",
              personId: "broke",
              organizationId: landlord,
              title: "Clerk",
              wageDailyMinor: 10_000,
              hoursDaily: 8,
              source: src,
            },
          ],
        },
        { data: worldCoreData(), modules: [HOUSING_MODULE] },
      ),
      api = coreAPI(core);
    advanceCore(core, "2021-01-01");
    setRightToCounsel(api, place, true);
    advanceCore(core, "2021-03-01");
    const cases = () =>
      api.moduleState("housing").snapshot().tables.cases as unknown as Record<
        string,
        string | number | boolean
      >[];
    const settled = cases().find((row) => row.stage === "settled")!;
    // A tenth of $3,000 a month in pay carries the arrears inside a year.
    expect(settled).toMatchObject({
      leaseId: "lease:household:broke",
      reasonKey: "counsel-negotiated-payment-plan",
    });
    expect(Number(settled.planMonths)).toBeLessThanOrEqual(12);
    // The household's pay arrives; it keeps up rent and the plan.
    transferCash(api, "fixture:pay", "payer", "broke", 2_000_000, src);
    advanceCore(core, "2022-03-01");
    const done = cases().find((row) => row.id === settled.id)!;
    expect(done).toMatchObject({ stage: "plan-paid", open: false });
    expect(core.finance.contracts.get("lease:household:broke")!.endedAt).toBe(
      undefined,
    );
    expect(core.eventIds.has(`event:housing.eviction:${settled.id}`)).toBe(
      false,
    );
  });
});
