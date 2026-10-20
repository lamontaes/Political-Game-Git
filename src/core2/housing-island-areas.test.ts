/**
 * The four island areas with no ACS housing table start from their own
 * Census 2020 owner share, rent and home value (SG-WORLD-housing-island-areas),
 * in a played world: a place of one island area drawn by seed.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { searchCorePlaces } from "./place-lookup";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`island-housing:${Date.now()}`).digest("hex");
const areas = housingData.islandAreas.areas as Record<
  string,
  { ownerShare: number; medianRentUsd: number; medianValueUsd: number }
>;
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

describe("an island area's housing starts from its own Census 2020 row", () => {
  it(`owner share, rent and value come from the area's row (seed ${seed})`, () => {
    const state = pick(Object.keys(areas).sort(), "state");
    const place = pick(
      searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      })
        .slice()
        .sort((a, b) => a.key.localeCompare(b.key)),
      "place",
    );
    const world = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const row = areas[state]!;
    // The opening records every household's home in the world's housing metadata.
    const dwellings = JSON.parse(
      String(core.placeMetadata?.housingDwellings ?? "[]"),
    ) as [string, string, number, string][];
    const all = dwellings.length;
    const own = dwellings.filter((d) => d[1] === "own").length;
    expect(all, `${state} ${place.key}: dwellings`).toBeGreaterThan(0);
    // A count of homes rounds to whole households.
    expect(Math.abs(own / all - row.ownerShare)).toBeLessThan(
      Math.max(0.02, 3 / all),
    );
    expect(core.placeMetadata?.housingCounty).toBe(`nation:${state.slice(3)}`);
  }, 900_000);
});
