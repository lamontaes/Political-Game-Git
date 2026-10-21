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
import { advanceCore } from "./life";
import { rentValueOf, valueDateOf } from "./modules/housing";
import { searchCorePlaces } from "./place-lookup";

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
      // The year plays out from that opening.
      const end = addDays(makeIsoDate(core.date), 365);
      advanceCore(core, end);
      expect(core.date, where).toBe(end);
      return;
    }
    throw new Error(
      `no island-area place with ${MIN_HOMES} homes: ${tried.join("; ")}`,
    );
  }, 900_000);
});
