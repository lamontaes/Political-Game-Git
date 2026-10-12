/** M1-08 first cut: owners and owner draws from profit, on a recorded fixture. */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { BUSINESS_MODULE } from "./modules/business";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, CoreState, Source } from "./types";

const start = "2021-01-01",
  shop = "organization:shop",
  place = "place:business-fixture";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Business fixture only.",
};
function input(): CoreInput {
  const people = [
    ["owner", 2_000, 3_000],
    ["clerk", 2_000, 1_500],
  ] as const;
  return {
    seed: "business-fixture",
    startedAt: start,
    people: people.map(([id, cash]) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1975-01-01",
      placeId: place,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: cash,
      livingCostDailyMinor: 1_000,
      source: src,
      familyIds: [],
      knownIds: [],
      jobId: `job:${id}`,
    })),
    households: people.map(([id]) => ({
      id: `household:${id}`,
      placeId: place,
      memberIds: [id],
      source: src,
    })),
    jobs: people.map(([id, , hourly]) => ({
      id: `job:${id}`,
      personId: id,
      organizationId: shop,
      title: "Shop work",
      hourlyMinor: hourly,
      hoursDaily: 8,
      wageDailyMinor: hourly * 8,
      source: src,
    })),
    organizations: [
      {
        id: shop,
        placeId: place,
        name: "Shop",
        kind: "employer",
        liquidMinor: 5_000_000,
        source: src,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function books(core: CoreState): BusinessBooksState {
  const book = {
    organizationId: shop,
    kindId: "retail",
    annualPayrollMinor: 12_000_000,
    annualDemandMinor: 40_000_000,
    capacityMinor: 40_000_000,
    annualOtherCostsMinor: 0,
    openingTownIncomeMinor: 0,
    price: 1,
    costContractIds: [],
    source: src,
    lastReviewedAt: start,
    reachedIncomeRatio: 1,
    anchorAnnualDemandMinor: 40_000_000,
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
    closedAt: undefined,
  } as unknown as BusinessBooksState;
  core.finance.businesses.set(shop, book);
  return book;
}
const money = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (s, r) => s + r.liquidMinor,
    0,
  );

describe("owners draw from profit", () => {
  it("makes the highest-paid worker the owner and moves part of a month's profit to them through the ledger", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [BUSINESS_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core),
      book = books(core),
      total = money(core);
    advanceCore(core, "2021-01-15");
    expect(api.moduleState("business").table("owners").get(shop)).toMatchObject(
      { ownerId: "owner" },
    );
    book.salesReceivedMinor = 3_000_000;
    book.wagesPaidMinor = 1_000_000;
    advanceCore(core, "2021-02-02");
    const draw = api
      .moduleState("business")
      .table("draws")
      .get(`draw:${shop}:2021-02-01`)!;
    expect(draw).toMatchObject({ profitMinor: 2_000_000 });
    expect(draw.drawnMinor as number).toBeGreaterThan(0);
    expect(draw.drawnMinor as number).toBeLessThanOrEqual(2_000_000);
    expect(core.people.get("owner")!.liquidMinor).toBe(
      2_000 + (draw.drawnMinor as number),
    );
    expect(money(core)).toBe(total);
  });
});

describe("founding a business where a market has room", () => {
  it("an enterprising adult founds a restaurant; it wins an equal share of the households' purchases and a startup loan; money balances", async () => {
    const { CREDIT_MODULE } = await import("./modules/credit");
    const { MACRO_MODULE, withCentralBank } = await import("./modules/macro");
    const place2 = "place:founding-fixture",
      residentsId = "residents:founding-fixture";
    const s2: Source = { ...src, asOf: "2026-10-01" };
    const base = withCentralBank({
      seed: "founding-fixture",
      startedAt: "2026-10-01",
      people: [
        {
          id: "founder",
          givenName: "Found",
          familyName: "Fixture",
          birthDate: "1985-01-01",
          placeId: place2,
          householdId: "household:founder",
          tier: "monthly",
          traits: {
            "personality-v1:facet-enterprising": 3,
            "people-mind-v1:risk": 3,
          },
          liquidMinor: 0,
          livingCostDailyMinor: 0,
          source: s2,
          familyIds: [],
          knownIds: [],
        },
      ],
      households: [
        {
          id: "household:founder",
          placeId: place2,
          memberIds: ["founder"],
          source: s2,
        },
      ],
      jobs: [],
      organizations: [
        ...["diner:a", "diner:b"].map((id) => ({
          id,
          placeId: place2,
          name: id,
          kind: "employer",
          liquidMinor: 1_000_000,
          source: s2,
        })),
        {
          id: "organization:bank:fixture",
          placeId: place2,
          name: "Bank",
          kind: "bank",
          liquidMinor: 500_000_000,
          source: s2,
        },
        {
          id: residentsId,
          placeId: place2,
          name: "Residents",
          kind: "residents",
          liquidMinor: 100_000_000,
          source: s2,
        },
      ],
      residents: {
        version: "core2-residents-v1",
        accounts: [{ placeId: place2, accountId: residentsId }],
        households: [],
        flows: ["diner:a", "diner:b"].map((id) => ({
          id: `purchase:${id}`,
          kind: "purchase" as const,
          financeKind: "household.food",
          payerId: residentsId,
          payeeId: id,
          residentsId,
          placeId: place2,
          amountMinor: 300_000,
          firstAt: "2026-10-12",
          cadence: { kind: "months" as const, every: 1, day: 12 },
          salesReceipt: true,
          marketAdjusted: false,
          source: s2,
        })),
        source: s2,
      },
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    });
    const core = createLifeCore(base, {
      data: worldCoreData(),
      modules: [MACRO_MODULE, CREDIT_MODULE, BUSINESS_MODULE],
      scheduledWork: false,
    });
    for (const id of ["diner:a", "diner:b"]) {
      const book = {
        ...books(core),
        organizationId: id,
        kindId: "restaurant",
        annualDemandMinor: 60_000_000,
        capacityMinor: 40_000_000,
      };
      core.finance.businesses.set(id, book as BusinessBooksState);
    }
    core.finance.businesses.delete(shop);
    const total = money(core);
    advanceCore(core, "2026-12-15");
    const foundings = api(core).moduleState("business").snapshot().tables
      .foundings as unknown as {
      founderId: string;
      kindId: string;
      customersMonthlyMinor: number;
      loanMinor: number;
    }[];
    expect(foundings[0]).toMatchObject({
      founderId: "founder",
      kindId: "restaurant",
    });
    expect(foundings[0]!.customersMonthlyMinor).toBeGreaterThan(0);
    expect(foundings[0]!.loanMinor).toBeGreaterThan(0);
    expect(money(core)).toBe(total);
  });
});
const api = (core: CoreState) => coreAPI(core);
