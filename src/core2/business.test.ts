/** M1-08 first cut: owners and owner draws from profit, on a recorded fixture. */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { BUSINESS_MODULE } from "./modules/business";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { WORLD_TRANSFER_MODULE } from "./world-transfer";
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
        modules: [WORLD_TRANSFER_MODULE, BUSINESS_MODULE],
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
