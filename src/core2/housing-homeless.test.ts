/**
 * Losing a home (owner, Oct 14): an evicted household goes to a relative with
 * room, a shelter bed or the street, by its records; it rents again when it
 * can; and an owner who stops paying the mortgage goes through the state's
 * foreclosure to the same statuses. Recorded fixtures for the edge cases;
 * the played year is in scripts/world-proofs/world-homelessness-year.ts.
 */
import { describe, expect, it } from "vitest";
import foreclosureData from "./data/housing/foreclosure.json" with { type: "json" };
import shelterData from "./data/housing/shelter-beds.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE } from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import {
  HOUSING_STATUS_EVENT,
  housingStatusCounts,
  housingStatusOf,
  reviewHomeless,
  shelterRateFor,
  type HousingStatusRow,
} from "./housing-homeless";
import type { CoreInput, PersonInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:homeless-fixture",
  landlord = "organization:landlord:place:homeless-fixture",
  bank = "organization:bank:homeless-fixture",
  outside = "organization:outside:homeless-fixture";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Homelessness fixture only.",
};

function person(
  id: string,
  household: string,
  cash: number,
  familyIds: string[] = [],
): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId: place,
    householdId: household,
    tier: "monthly",
    traits: {},
    liquidMinor: cash,
    livingCostDailyMinor: 0,
    source: src,
    familyIds,
    knownIds: [],
  };
}

/** Renters: `broke` people who can't pay, and others; `filler` people in one paying household make up the place's size. */
function input(
  usps: string,
  broke: { id: string; family?: string[] }[],
  others: PersonInput[],
  filler = 0,
): CoreInput {
  const people = [
    ...broke.map((b) => person(b.id, `household:${b.id}`, 0, b.family)),
    ...others,
    ...Array.from({ length: filler }, (_, i) =>
      person(`filler-${i}`, "household:filler", 1_000_000_000),
    ),
  ];
  const households = new Map<string, string[]>();
  for (const row of people)
    households.set(row.householdId, [
      ...(households.get(row.householdId) ?? []),
      row.id,
    ]);
  return {
    seed: "homeless-fixture",
    startedAt: start,
    people,
    households: [...households].map(([id, memberIds]) => ({
      id,
      placeId: place,
      memberIds,
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
      contracts: broke.map((b) => ({
        id: `lease:household:${b.id}`,
        householdId: `household:${b.id}`,
        payerIds: [b.id],
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
    placeMetadata: { housingState: usps, housingTown: place },
  };
}

const statuses = (api: ReturnType<typeof coreAPI>) =>
  api
    .moduleState("housing")
    .table("statuses")
    .rows() as unknown as HousingStatusRow[];

describe("where an evicted household goes", () => {
  it("to a relative with room: doubled up with the closest kin, the reason and the host on the record", () => {
    const core = createLifeCore(
      input(
        "TX",
        [{ id: "tenant", family: ["aunt"] }],
        [person("aunt", "household:aunt", 1_000_000_000, ["tenant"])],
      ),
      { data: worldCoreData(), modules: [HOUSING_MODULE] },
    );
    const api = coreAPI(core);
    advanceCore(core, "2021-08-31");
    expect(housingStatusOf(api, "tenant")).toBe("doubled-up");
    expect(housingStatusOf(api, "aunt")).toBe("housed");
    const row = statuses(api)[0]!;
    expect(row).toMatchObject({
      id: "household:tenant",
      hostHouseholdId: "household:aunt",
      reasons: { relative: "aunt" },
    });
    expect(row.caseId).toMatch(/^eviction:lease:household:tenant:/);
    expect(
      core.eventIds.has(
        `${HOUSING_STATUS_EVENT}:household:tenant:${row.since}`,
      ),
    ).toBe(true);
  });

  it("else to a shelter bed while the place has one (HUD's state rate times its people), else to the street", () => {
    // New York's year-round beds per 10,000 times the place's 160 people: one bed.
    const filler = 158;
    const beds = Math.floor(
      ((filler + 2) * shelterData.bedsPer10k.NY) / 10_000,
    );
    expect(beds).toBe(1);
    const core = createLifeCore(
      input("NY", [{ id: "first" }, { id: "second" }], [], filler),
      { data: worldCoreData(), modules: [HOUSING_MODULE] },
    );
    const api = coreAPI(core);
    advanceCore(core, "2021-09-30");
    const byId = new Map(statuses(api).map((row) => [row.id, row]));
    expect(
      [
        byId.get("household:first")?.status,
        byId.get("household:second")?.status,
      ].sort(),
    ).toEqual(["sheltered", "unsheltered"]);
    const counts = housingStatusCounts(api, place);
    expect(counts.sheltered).toBe(1);
    expect(counts.unsheltered).toBe(1);
    expect(counts.housed).toBe(filler);
  });

  it("rents again once its pay reaches the landlord's multiple of the rent and its cash covers the first month", () => {
    const core = createLifeCore(input("TX", [{ id: "tenant" }], []), {
      data: worldCoreData(),
      modules: [HOUSING_MODULE],
    });
    const api = coreAPI(core);
    advanceCore(core, "2021-08-31");
    expect(housingStatusOf(api, "tenant")).toBe("unsheltered");
    // A job that pays well and savings: the next review leases again.
    core.people.get("tenant")!.liquidMinor = 10_000_000;
    core.jobs.set("job:tenant", {
      id: "job:tenant",
      personId: "tenant",
      organizationId: landlord,
      title: "Clerk",
      hoursDaily: 8,
      wageDailyMinor: 50_000,
      source: src,
    });
    core.people.get("tenant")!.jobId = "job:tenant";
    // Meeting the income/cash test cannot house anyone without a signed lease.
    reviewHomeless(
      api,
      () => 100_000,
      () => undefined,
    );
    expect(housingStatusOf(api, "tenant")).toBe("unsheltered");
    const housing = api.moduleState("housing");
    const stock = housing.table("stock").get(`stock:${place}`)!;
    housing.table("stock").put({
      ...stock,
      rentalUnits: Number(stock.rentalUnits) + 1,
      vacantRental: Number(stock.vacantRental) + 1,
    });
    const available = Number(
      housing.table("stock").get(`stock:${place}`)!.vacantRental,
    );
    const projectId = "project:rehousing-fixture";
    housing.table("projects").put({
      id: projectId,
      placeId: place,
      kind: "multi",
      units: 1,
      affordableUnits: 0,
      askingRentMinor: 80_000,
      medianPayMinor: 400_000,
      payerId: landlord,
      builderId: landlord,
      monthlyCostMinor: 0,
      paidMinor: 0,
      startedAt: start,
      completesAt: "2021-08-01",
      open: false,
      isProject: true,
    });
    advanceCore(core, "2021-10-31");
    const occupancy = housing.table("occupancy").get("household:tenant")!;
    expect(occupancy).toMatchObject({ projectId, unit: 0 });
    expect(housing.table("stock").get(`stock:${place}`)!.vacantRental).toBe(
      available - 1,
    );
    expect(
      core.finance.contracts.get(String(occupancy.leaseId))!.amountMinor,
    ).toBe(80_000);
    expect(
      housing
        .table("moves")
        .rows()
        .some(
          (row) =>
            row.householdId === "household:tenant" && row.vacancyDelta === -1,
        ),
    ).toBe(true);
    expect(housingStatusOf(api, "tenant")).toBe("housed");
    expect(
      [...core.finance.contracts.keys()].some((id) =>
        id.startsWith("lease:household:tenant:"),
      ),
    ).toBe(true);
  });
});

describe("an owner who stops paying the mortgage", () => {
  it("goes through the state's foreclosure: filed past 120 days, sold on the state's timeline, the lender paid from the sale with the rest a loss, then removed to the same statuses", () => {
    const usps = "TX";
    const steps = foreclosureData.places.TX;
    const base = input(usps, [], [person("owner", "household:owner", 0)]);
    const core = createLifeCore(
      {
        ...base,
        organizations: [
          ...base.organizations,
          {
            id: bank,
            placeId: place,
            name: "Bank",
            kind: "bank",
            liquidMinor: 0,
            source: src,
          },
          {
            id: outside,
            placeId: place,
            name: "Outside",
            kind: "employer",
            liquidMinor: 0,
            outsideFlow: src,
            source: src,
          },
        ],
        finance: {
          ...base.finance!,
          contracts: [
            {
              id: "mortgage:household:owner",
              householdId: "household:owner",
              payerIds: ["owner"],
              payeeId: bank,
              kind: "household-purchase",
              amountMinor: 150_000,
              dueAt: "2021-02-01",
              periodMonths: 1,
              accruesArrears: true,
              source: src,
            },
          ],
        },
        placeMetadata: {
          ...base.placeMetadata,
          housingDwellings: JSON.stringify([
            ["household:owner", "own", 20_000_000, "house"],
          ]),
          housingMortgages: JSON.stringify([
            {
              householdId: "household:owner",
              holderId: bank,
              boughtYear: 2015,
              rate: 0.04,
              originalMinor: 25_000_000,
              balanceMinor: 18_000_000,
              paymentMinor: 150_000,
              monthsLeft: 300,
            },
          ]),
        },
      },
      { data: worldCoreData(), modules: [HOUSING_MODULE] },
    );
    const api = coreAPI(core);
    advanceCore(core, "2022-06-30");
    const cases = api
      .moduleState("housing")
      .table("foreclosures")
      .rows() as unknown as {
      filedAt: string;
      soldAt?: string;
      removedAt?: string;
      stage: string;
      salePriceMinor?: number;
      recoveredMinor?: number;
      lossMinor?: number;
      owedAtSaleMinor?: number;
    }[];
    expect(cases.length).toBe(1);
    const row = cases[0]!;
    const days = (a: string, b: string) =>
      (Date.parse(b) - Date.parse(a)) / 86_400_000;
    // Filed only after the federal 120 days of missed payments from February 1.
    expect(days("2021-02-01", row.filedAt)).toBeGreaterThan(
      foreclosureData.federalDelinquencyDays,
    );
    // Sold on the state's timeline.
    expect(days(row.filedAt, row.soldAt!)).toBe(
      Math.max(steps.typicalDaysToComplete ?? 0, 1),
    );
    // The lender recovered the sale price up to what it was owed; the rest is its loss.
    expect(row.salePriceMinor).toBe(
      Math.round(20_000_000 * api.parameter("housingForeclosureSaleShare")),
    );
    expect(row.recoveredMinor).toBe(
      Math.min(row.salePriceMinor!, row.owedAtSaleMinor!),
    );
    expect(row.lossMinor).toBe(row.owedAtSaleMinor! - row.recoveredMinor!);
    expect(core.organizations.get(bank)!.liquidMinor).toBe(row.recoveredMinor);
    const mortgage = api
      .moduleState("housing")
      .table("mortgages")
      .get("mortgage:household:owner") as unknown as {
      balanceMinor: number;
      foreclosedAt?: string;
    };
    expect(mortgage).toMatchObject({
      balanceMinor: 0,
      foreclosedAt: row.soldAt,
    });
    expect(row.stage).toBe("removed");
    expect(housingStatusOf(api, "owner")).toBe("unsheltered");
    expect(
      core.finance.contracts.get("mortgage:household:owner")!.endedAt,
    ).toBe(row.removedAt);
  });
});

describe("shelter beds per 10,000 by place", () => {
  it("gives American Samoa and the Marianas the island-area median, not the nation's rate", () => {
    const islands = ["GU", "PR", "VI"]
      .map((k) => (shelterData.bedsPer10k as Record<string, number>)[k]!)
      .sort((a, b) => a - b);
    for (const usps of ["AS", "MP"]) {
      expect(shelterRateFor(usps), usps).toBe(islands[1]);
      expect(shelterRateFor(usps), usps).toBeLessThan(
        shelterData.nationalBedsPer10k,
      );
    }
    expect(shelterRateFor("GU")).toBe(6.18);
    expect(shelterRateFor("NY")).toBe(shelterData.bedsPer10k.NY);
  });
});
