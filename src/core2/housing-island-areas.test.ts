/**
 * The four island areas with no ACS housing table start from their own
 * Census 2020 owner share, rent and home value (SG-WORLD-housing-island-areas),
 * in a played world: a place of one island area drawn by seed, played for a
 * year. Places are drawn until one has enough households for a one-point
 * owner-share check; none having them fails by name.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { homePriceRatio } from "./housing-prices";
import { advanceCore } from "./life";
import { ownedHomes, rentValueOf, valueDateOf } from "./modules/housing";
import { searchCorePlaces } from "./place-lookup";
import { coreAPI } from "./state";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`island-housing:${Date.now()}`).digest("hex");
const areas = housingData.islandAreas.areas as Record<
  string,
  {
    ownerShare: number;
    medianRentUsd: number;
    medianValueUsd: number;
    valueDate: string;
  }
>;
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;
// Enough homes that rounding to whole households stays under one point.
const MIN_HOMES = 100;
const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

describe("an island area's housing starts from its own Census 2020 row", () => {
  it(`owner share, rent and value come from the area's row, and the year plays (seed ${seed})`, () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const state = pick(Object.keys(areas).sort(), `state:${attempt}`);
      const place = pick(
        searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        })
          .slice()
          .sort((a, b) => a.key.localeCompare(b.key)),
        `place:${attempt}`,
      );
      const where = `${state} ${place.key}, seed ${seed}`;
      const world = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const row = areas[state]!;
      // The opening records every household's home in the world's housing metadata.
      const dwellings = JSON.parse(
        String(core.placeMetadata?.housingDwellings ?? "[]"),
      ) as [string, string, number][];
      if (dwellings.length < MIN_HOMES) {
        tried.push(`${where}: ${dwellings.length} homes`);
        continue;
      }
      expect(core.placeMetadata?.housingCounty, where).toBe(
        `nation:${state.slice(3)}`,
      );
      const own = dwellings.filter((d) => d[1] === "own").length;
      expect(
        Math.abs(own / dwellings.length - row.ownerShare),
        `${where}: owner share`,
      ).toBeLessThan(0.01);
      // Rent and value come from the area's own row, and the value is dated
      // at the census (April 2020), so the price index moves it from there to
      // the start for every owner's home.
      expect(rentValueOf(`nation:${state.slice(3)}`), where).toEqual([
        row.medianRentUsd,
        row.medianValueUsd,
      ]);
      expect(valueDateOf(`nation:${state.slice(3)}`), where).toBe(
        row.valueDate,
      );
      expect(
        dwellings.filter((d) => d[1] === "own").every((d) => d[2] > 0) &&
          dwellings.filter((d) => d[1] === "rent").every((d) => d[2] > 0),
        `${where}: every home has a value or a rent`,
      ).toBe(true);
      // Owners' median value at the opening is the census value moved by the
      // price index from April 2020 to the start, not the census value itself.
      const openingValue = median(
        dwellings.filter((d) => d[1] === "own").map((d) => d[2]),
      );
      // Each home still scales with its household's income; the owners'
      // median is the census value indexed to the start, to the minor unit
      // its rounding allows.
      const indexed =
        row.medianValueUsd *
        100 *
        homePriceRatio(state.slice(3), row.valueDate, core.date);
      expect(
        Math.abs(openingValue - indexed),
        `${where}: opening median value ${openingValue} against ${indexed}`,
      ).toBeLessThanOrEqual(1);
      expect(
        new Set(dwellings.filter((d) => d[1] === "own").map((d) => d[2])).size,
        `${where}: owners' values vary`,
      ).toBeGreaterThan(1);
      // The year plays out from that opening.
      const end = addDays(makeIsoDate(core.date), 365);
      advanceCore(core, end);
      expect(core.date, where).toBe(end);
      const api = coreAPI(core);
      const owned = ownedHomes(api);
      expect(owned.length, `${where}: owners still hold homes`).toBeGreaterThan(
        0,
      );
      const endValue = median(owned.map((h) => h.valueMinor));
      expect(endValue, `${where}: owners' median value after a year`).not.toBe(
        openingValue,
      );
      // Renters pay: a lease of a renter household settled on its billing day.
      const rentDwellings = new Set(
        dwellings.filter((d) => d[1] === "rent").map((d) => d[0]),
      );
      const paid = [...core.finance.contracts.entries()].filter(
        ([id, lease]) =>
          id.startsWith("lease:") &&
          rentDwellings.has(id.slice("lease:".length)) &&
          lease.lastSettledAt !== undefined &&
          lease.amountMinor > 0,
      );
      expect(paid.length, `${where}: renter leases settled`).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `no island-area place with ${MIN_HOMES} homes: ${tried.join("; ")}`,
    );
    // Measured 118 s of test time for one attempt (island opening plus a played year, one process).
  }, 900_000);
});
