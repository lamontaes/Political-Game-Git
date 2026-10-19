import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { propertyTaxDueDates } from "./housing-property-tax";
import { ownedHomes } from "./modules/housing";
import { coreAPI } from "./state";

// The played world reads each owner's escrow from the mortgages table: owners
// with a mortgage still being paid are billed monthly, the rest on the place's
// due dates (pool item world-stopgap-housing-property-tax-faked-mechanic).
const seed = process.env.PROPERTY_TAX_SEED ?? randomBytes(8).toString("hex");

describe(`owners' property tax in a played world (seed ${seed})`, () => {
  it("splits the owners into escrowed and billed-on-due-dates, and the place has due dates", () => {
    const place = drawPlace(seed, "property-tax-played");
    const where = `${place.name}, ${place.state}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 2));
    const api = coreAPI(world.core);
    const homes = ownedHomes(api);
    expect(homes.length, where).toBeGreaterThan(0);
    // An owner is escrowed exactly when a mortgage still being paid names the household.
    const mortgaged = new Set(
      (
        api.moduleState("housing").table("mortgages").rows() as unknown as {
          householdId: string;
          monthsLeft: number;
          foreclosedAt?: string;
        }[]
      )
        .filter((row) => row.monthsLeft > 0 && !row.foreclosedAt)
        .map((row) => row.householdId),
    );
    for (const home of homes)
      expect(home.escrowed, `${where}: ${home.householdId}`).toBe(
        mortgaged.has(home.householdId),
      );
    const dates = propertyTaxDueDates(place.state.replace(/^US-/, ""));
    expect(dates.installments, where).toBeGreaterThanOrEqual(1);
  }, 600_000);
});
