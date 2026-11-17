/**
 * The four island areas with no ACS housing table start from their own
 * Census 2020 owner share (SG-WORLD-housing-island-areas), and from the rent
 * and home value their own pay supports, as every place does, in a played
 * world: a place of one island area drawn by seed, played for a
 * year. Places are drawn until one has enough households for a one-point
 * owner-share check; none having them fails by name.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import housingData from "./data/housing/housing.json" with { type: "json" };
import housingParameters from "./data/housing/parameters.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ownedHomes } from "./modules/housing";
import { searchCorePlaces } from "./place-lookup";
import { coreAPI } from "./state";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`island-housing:${Date.now()}`).digest("hex");
const areas = housingData.islandAreas.areas as Record<
  string,
  { ownerShare: number }
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

describe("an island area's housing starts from its own owner share and its own pay", () => {
  it(`the owner share comes from the area's row, rent and value from the town's pay, and the year plays (seed ${seed})`, () => {
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
      // This world's owner share sits within its drawn spread of the census
      // share (owner, Oct 27: realistic, not real), to a point of rounding.
      const own = dwellings.filter((d) => d[1] === "own").length;
      expect(
        Math.abs(own / dwellings.length - row.ownerShare),
        `${where}: owner share`,
      ).toBeLessThan(
        housingParameters.housingWorldOwnerShareSpreadShare.value *
          Math.min(row.ownerShare, 1 - row.ownerShare) +
          0.01,
      );
      expect(
        dwellings.filter((d) => d[1] === "own").every((d) => d[2] > 0) &&
          dwellings.filter((d) => d[1] === "rent").every((d) => d[2] > 0),
        `${where}: every home has a value or a rent`,
      ).toBe(true);
      // Owners' median value at the opening is the typical value the town's
      // own pay supports (the opening's `housingTypical`): each home scales
      // with its household's income around it, to the cent rounding allows.
      const openingValue = median(
        dwellings.filter((d) => d[1] === "own").map((d) => d[2]),
      );
      const [typicalRent, typicalValue] = JSON.parse(
        String(core.placeMetadata?.housingTypical ?? "[0,0]"),
      ) as [number, number];
      expect(typicalRent, `${where}: the town's typical rent`).toBeGreaterThan(
        0,
      );
      expect(
        Math.abs(openingValue - typicalValue),
        `${where}: opening median value ${openingValue} against ${typicalValue}`,
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
      process.stdout.write(
        `ISLAND HOUSING ${where}: ${own} of ${dwellings.length} homes owned (row ${row.ownerShare}); owners' median ${openingValue} against the town's typical ${typicalValue}; ${endValue} a year in; ${paid.length} renter leases settled, first ${paid[0]![0]}\n`,
      );
      return;
    }
    throw new Error(
      `no island-area place with ${MIN_HOMES} homes: ${tried.join("; ")}`,
    );
    // Measured 118 s of test time for one attempt (island opening plus a played year, one process).
  }, 900_000);
});
