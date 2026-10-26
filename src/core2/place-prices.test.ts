/** Prices a law sets for a place: households' spending moves through the ledger to the law's payee or back from outside. */
import { describe, expect, it } from "vitest";
import goods from "./data/prices/goods.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import {
  PLACE_PRICES_MODULE,
  adjustPrice,
  businessEnergyCostYear,
  monthlyChange,
  setPlacePrice,
} from "./modules/place-prices";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import type { CoreInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:prices-fixture",
  utility = "organization:utility",
  outside = "organization:outside";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Prices fixture only.",
};
function input(): CoreInput {
  const people = ["worker", "retiree"];
  return {
    seed: "prices-fixture",
    startedAt: start,
    people: people.map((id) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1960-01-01",
      placeId: place,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: 5_000_000,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
      ...(id === "worker" ? { jobId: "job:worker" } : {}),
    })),
    households: people.map((id) => ({
      id: `household:${id}`,
      placeId: place,
      memberIds: [id],
      source: src,
    })),
    jobs: [
      {
        id: "job:worker",
        personId: "worker",
        organizationId: utility,
        title: "Lineworker",
        wageDailyMinor: 25_000,
        hoursDaily: 8,
        source: src,
      },
    ],
    organizations: [
      {
        id: utility,
        placeId: place,
        name: "Utility",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
      {
        id: outside,
        placeId: place,
        name: "Outside the town",
        kind: "outside",
        liquidMinor: 0,
        outsideFlow: src,
        source: src,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  } as CoreInput;
}

describe("prices a law sets", () => {
  it("charges the same consumption total when unequal-income households are counted", () => {
    const base = input();
    const fixture: CoreInput = {
      ...base,
      playerId: "worker",
      focusPersonIds: ["worker"],
      people: [
        ...base.people,
        {
          ...base.people[0]!,
          id: "high-earner",
          householdId: "household:high-earner",
          jobId: "job:high-earner",
        },
      ],
      households: [
        ...base.households,
        {
          ...base.households[0]!,
          id: "household:high-earner",
          memberIds: ["high-earner"],
        },
      ],
      jobs: [
        ...base.jobs,
        {
          ...base.jobs[0]!,
          id: "job:high-earner",
          personId: "high-earner",
          wageDailyMinor: 100_000,
        },
      ],
    };
    const run = (counted: boolean) => {
      const core = createLifeCore(
        counted ? collapseToTwoLevels(fixture) : fixture,
        {
          data: worldCoreData(),
          modules: [PLACE_PRICES_MODULE],
        },
      );
      const api = coreAPI(core);
      advanceCore(core, "2021-01-02");
      adjustPrice(api, {
        placeId: place,
        good: "electricity",
        share: 0.1,
        payeeId: utility,
        cause: "fixture-electricity",
        source: src,
      });
      advanceCore(core, "2021-02-04");
      expect(core.cashJournal.totals.grossDebitMinor).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return core.organizations.get(utility)!.liquidMinor;
    };
    expect(run(true)).toBe(run(false));
  });
  it("a dearer electricity price moves each household's extra spending to the utility; fare-free transit refunds riders' fares from outside", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [PLACE_PRICES_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    adjustPrice(api, {
      placeId: place,
      good: "electricity",
      share: 0.1,
      payeeId: utility,
      cause: "clean-electricity-standard",
      source: src,
    });
    setPlacePrice(api, {
      placeId: place,
      good: "transit-fare",
      priceMinor: 0,
      cause: "fare-free-transit",
      source: src,
    });
    const before = core.people.get("retiree")!.liquidMinor;
    advanceCore(core, "2021-02-04");
    // The retiree has no pay: they spend as the lowest income group does.
    const floor = api.parameter("pricesIncomeFloorShare");
    const power = (good: "electricity" | "transit-fare") =>
      floor ** api.parameter(goods.goods[good].elasticityParameter);
    const electricity = monthlyChange(
      { good: "electricity", kind: "share", value: 0.1 },
      power("electricity"),
      1,
    );
    const fare = monthlyChange(
      { good: "transit-fare", kind: "price", value: 0 },
      power("transit-fare"),
      1,
    );
    expect(electricity.payMinor).toBeGreaterThan(0);
    expect(fare.refundMinor).toBeGreaterThan(0);
    expect(core.people.get("retiree")!.liquidMinor - before).toBe(
      Math.round(fare.refundMinor) - Math.round(electricity.payMinor),
    );
    // The worker earns more and spends more on electricity than the retiree.
    expect(core.organizations.get(utility)!.liquidMinor).toBeGreaterThan(
      2 * Math.round(electricity.payMinor),
    );
    const flows = core.cashJournal.externalFlowsByOwner.get(outside);
    expect(flows?.netMinor).toBeLessThan(0);
  });
  it("a law that prices energy costs a business its energy share of the price change, and other laws set no energy price", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [PLACE_PRICES_MODULE],
      }),
      api = coreAPI(core);
    const q =
      "us-policy-positions:environment-energy.clean-electricity-standard";
    const small = businessEnergyCostYear(api, q, 1_000_000)!;
    const large = businessEnergyCostYear(api, q, 2_000_000)!;
    expect(small).toBeGreaterThan(0);
    expect(large).toBe(2 * small);
    expect(
      businessEnergyCostYear(
        api,
        "us-policy-positions:environment-energy.bottle-deposit",
        1_000_000,
      ),
    ).toBeNull();
  });
});
