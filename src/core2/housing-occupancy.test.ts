/** Households gone from the town stop paying rent and free their homes; households that moved in rent one; vacancy is the units less the renters. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const input = process.env.GOLDEN_PATH_SEED ?? randomUUID();
const drawn = drawPlace(input, "housing-occupancy");

describe(`who lives in the rentals (${drawn.name}, ${drawn.state}, GOLDEN_PATH_SEED=${input})`, () => {
  it("ends departed households' rent and houses the households that moved in", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    const end = new Date(`${opening.startedAt}T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 8);
    advanceCore(core, end.toISOString().slice(0, "YYYY-MM-DD".length));
    const api = coreAPI(core);
    const housing = api.moduleState(HOUSING_MODULE_ID);
    const rt = residentsRuntime(core)!;
    const stocks = housing.table("stock").rows() as unknown as {
      placeId: string;
      rentalUnits: number;
      vacantRental: number;
    }[];
    const stocked = new Set(stocks.map((row) => row.placeId));
    const dwellings = housing.table("dwellings").rows() as unknown as {
      householdId: string;
      tenure: string;
      basis: string;
    }[];
    const housed = new Set(dwellings.map((row) => row.householdId));
    // Nobody pays rent for a household that is gone.
    const orphaned = [...rt.flows.values()].filter(
      (f) =>
        f.id.startsWith("rent:") &&
        !f.endedAt &&
        !rt.households.has(f.id.slice("rent:".length)),
    );
    expect(orphaned.map((f) => f.id)).toEqual([]);
    const left = [...rt.flows.values()].filter(
      (f) => f.endedReason === "housing.moved-out",
    ).length;
    const arrived = dwellings.filter((row) => row.basis === "arrival").length;
    console.log(
      `${drawn.name}: ${left} rents ended by a move out, ${arrived} households moved in and rent`,
    );
    // Every household of the wider population in the town has a home on record (housed at the last monthly review).
    const lastReview = `${core.date.slice(0, 7)}-01`;
    const unhoused = [...rt.households.values()].filter(
      (r) =>
        stocked.has(r.household.placeId) &&
        !housed.has(r.household.id) &&
        r.household.source.asOf < lastReview,
    );
    expect(unhoused.length).toBe(0);
    // A home a household gone from the town owned is off the books and up for sale (or already sold to a renter).
    expect(
      dwellings.filter(
        (row) =>
          row.tenure === "own" &&
          !core.households.has(row.householdId) &&
          !rt.households.has(row.householdId),
      ).length,
    ).toBe(0);
    // Vacancy is the units less the households renting them.
    for (const row of stocks) {
      const renters = dwellings.filter(
        (d) =>
          d.tenure === "rent" &&
          (core.households.get(d.householdId)?.placeId ??
            rt.households.get(d.householdId)?.household.placeId) ===
            row.placeId,
      ).length;
      expect(row.vacantRental).toBeGreaterThanOrEqual(0);
      expect(row.vacantRental).toBeLessThanOrEqual(
        Math.max(0, row.rentalUnits - renters) + 1,
      );
    }
  }, 900_000);
});
