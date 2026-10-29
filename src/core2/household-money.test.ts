/**
 * A household's money is pay in, rent or mortgage out, and one everyday-living
 * amount (owner, Oct 13): the home is paid first, everyday living from what is
 * left, and the month records what went unpaid.
 */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { CREDIT_MODULE } from "./modules/credit";
import { MACRO_MODULE, withCentralBank } from "./modules/macro";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import type { CoreInput, CoreState, PersonInput, Source } from "./types";

const start = "2026-10-01",
  place = "place:household-money";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Household money fixture only.",
};
const person = (
  id: string,
  householdId: string,
  liquidMinor: number,
  familyIds: string[],
): PersonInput => ({
  id,
  givenName: id,
  familyName: "Fixture",
  birthDate: id === "grandmother" ? "1950-01-01" : "1980-01-01",
  placeId: place,
  householdId,
  tier: "monthly",
  traits: {},
  liquidMinor,
  livingCostDailyMinor: 1_000,
  source: src,
  familyIds,
  knownIds: [],
});

function input(): CoreInput {
  // A father with nothing left and a son with $1,000 share a $600 lease and
  // $800 a month of everyday living.
  const people = [
    person("father", "household:home", 0, ["son"]),
    person("son", "household:home", 100_000, ["father"]),
  ];
  return withCentralBank({
    seed: "household-money",
    startedAt: start,
    people,
    households: [
      {
        id: "household:home",
        placeId: place,
        memberIds: ["father", "son"],
        source: src,
      },
    ],
    jobs: [],
    organizations: [
      {
        id: "organization:grocer",
        placeId: place,
        name: "Grocer",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
      {
        id: "organization:landlord",
        placeId: place,
        name: "Landlord",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
    ],
    finance: {
      contracts: [
        {
          id: "groceries:household:home",
          householdId: "household:home",
          payerIds: ["father", "son"],
          payeeId: "organization:grocer",
          kind: "household.food",
          amountMinor: 80_000,
          dueAt: "2026-10-05",
          periodMonths: 1,
          accruesArrears: false,
          salesReceipt: true,
          source: src,
        },
        {
          id: "lease:household:home",
          householdId: "household:home",
          payerIds: ["father", "son"],
          payeeId: "organization:landlord",
          kind: "household-purchase",
          amountMinor: 60_000,
          dueAt: "2026-10-15",
          periodMonths: 1,
          accruesArrears: true,
          source: src,
        },
      ],
      facilities: [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  });
}
const money = (core: CoreState) =>
  [...core.people.values()].reduce((n, row) => n + row.liquidMinor, 0) +
  [...core.organizations.values()].reduce((n, row) => n + row.liquidMinor, 0);

describe("a household that runs short", () => {
  it("pays its home first, buys what it can of everyday living, and records the rest", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [MACRO_MODULE, CREDIT_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core),
      total = money(core);
    // Purchases are one everyday-living plan, not a bill per store.
    expect(core.finance.contracts.has("groceries:household:home")).toBe(false);
    expect(core.finance.livingPlans.get("household:home")).toMatchObject({
      monthlyMinor: 80_000,
    });
    advanceCore(core, "2026-11-01");
    const month = api
      .moduleState("credit")
      .table("households")
      .get("household-month:household:home:2026-11-01")!;
    // $600 kept back for the lease left $400 of the $800 for everyday living.
    expect(month).toMatchObject({
      housingMinor: 60_000,
      everydayMinor: 80_000,
      billsMinor: 140_000,
      paidMinor: 100_000,
      unpaidMinor: 40_000,
      // Why: the members held $1,000 on their living day and kept $600 back.
      livingHeldMinor: 100_000,
      keptBackMinor: 60_000,
    });
    expect(core.organizations.get("organization:grocer")!.liquidMinor).toBe(
      40_000,
    );
    expect(core.organizations.get("organization:landlord")!.liquidMinor).toBe(
      60_000,
    );
    // Unbought everyday living is never a debt; the lease is paid in full.
    expect(
      core.finance.contracts.get("lease:household:home")!.arrearsMinor,
    ).toBe(0);
    expect(money(core)).toBe(total);
  });
});
