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
import { homePriceRatio } from "./housing-prices";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
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

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

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
      // A home's value is the area's census median moved from April 2020 to
      // the start by the price index, and a rent the area's median rent, each
      // scaled by the household's income; the median household sits on the row.
      const ratio = homePriceRatio(
        state.slice(3),
        row.valueDate,
        gameStartDate(),
      );
      const scales = dwellings.map(([, tenure, minor]) =>
        tenure === "own"
          ? minor / (row.medianValueUsd * 100 * ratio)
          : minor / (row.medianRentUsd * 100),
      );
      expect(
        Math.abs(median(scales) - 1),
        `${where}: median household's value and rent against the row`,
      ).toBeLessThan(0.02);
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
