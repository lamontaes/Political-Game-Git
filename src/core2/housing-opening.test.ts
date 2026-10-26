/** The opening's homes belong to the played town, with real values, owners and renters (sim stories, Oct 12, item 16). */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { corePlaceByKey } from "./place-lookup";
import { withHousing } from "./modules/housing";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import type { CoreState } from "./types";

type DrawnPlace = ReturnType<typeof drawPlace>;
import type { CoreInput, Source } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const start = "2026-10-12";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Housing opening fixture only.",
};

function input(place: DrawnPlace, townHomes = 12): CoreInput {
  const town = corePlaceByKey(place.key)!.context.jurisdiction.id;
  // The opening also generates the county, with more households than the town.
  const county = "place:county-fixture";
  const homes = [
    ...Array.from({ length: townHomes }, (_, i) => ({ i, placeId: town })),
    ...Array.from({ length: 40 }, (_, i) => ({
      i: i + townHomes,
      placeId: county,
    })),
  ];
  return {
    seed: "housing-opening-fixture",
    startedAt: start,
    people: homes.map(({ i, placeId }) => ({
      id: `person:${i}`,
      givenName: `P${i}`,
      familyName: "Fixture",
      birthDate: `${1950 + i}-01-01`,
      placeId,
      householdId: `household:${i}`,
      tier: "monthly",
      traits: {},
      liquidMinor: 100_000,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
    })),
    households: homes.map(({ i, placeId }) => ({
      id: `household:${i}`,
      placeId,
      memberIds: [`person:${i}`],
      source: src,
    })),
    // Only the town's residents have recorded jobs, at different pay.
    jobs: homes
      .filter(({ placeId }) => placeId === town)
      .map(({ i }) => ({
        id: `job:${i}`,
        personId: `person:${i}`,
        organizationId: "organization:employer",
        title: "Worker",
        wageDailyMinor: 8_000 + i * 1_500,
        hoursDaily: 8,
        source: src,
      })),
    organizations: [
      {
        id: "organization:employer",
        placeId: town,
        name: "Employer",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
    ],
    finance: { contracts: [], facilities: [], businesses: [], gaps: [] },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    placeMetadata: { placeKey: place.key },
  };
}

type Dwelling = [string, "own" | "rent", number, string];
const dwellingsOf = (housed: CoreInput) =>
  JSON.parse(housed.placeMetadata!.housingDwellings!) as Dwelling[];

// A random place from all 56, named with its seed in the test title: the
// first draw whose owner share leaves both owners and renters among the
// town's homes (a place that is nearly all owners has no renter to lease to).
const { place, housed } = (() => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const drawn = drawPlace(
      seed,
      attempt ? `core2-housing-opening-${attempt}` : "core2-housing-opening",
    );
    const opening = withHousing(input(drawn));
    const dwellings = dwellingsOf(opening);
    if (
      dwellings.some((row) => row[1] === "own") &&
      dwellings.some((row) => row[1] === "rent")
    )
      return { place: drawn, housed: opening };
  }
  throw new Error(
    `no place with owners and renters in 30 draws (seed ${seed})`,
  );
})();

describe(`opening homes in ${place.name} (seed ${seed})`, () => {
  it("houses the played town's households, owners at real values and renters on leases", () => {
    const opening = input(place);
    const town = corePlaceByKey(place.key)!.context.jurisdiction.id;
    const dwellings = dwellingsOf(housed);
    const inTown = new Set(
      opening.households
        .filter((row) => row.placeId === town)
        .map((row) => row.id),
    );
    // Every home on record is in the town, and every town household has one.
    expect(dwellings.map((row) => row[0]).sort()).toEqual([...inTown].sort());
    const owned = dwellings.filter((row) => row[1] === "own");
    const rented = dwellings.filter((row) => row[1] === "rent");
    expect(owned.length).toBeGreaterThan(0);
    expect(rented.length).toBeGreaterThan(0);
    expect(owned.every((row) => row[2] > 0)).toBe(true);
    expect(rented.every((row) => row[2] > 0)).toBe(true);
    // Renters pay their rent each month through a lease.
    const leases = housed.finance!.contracts.filter((row) =>
      row.id.startsWith("lease:"),
    );
    expect(leases.map((row) => row.householdId).sort()).toEqual(
      rented.map((row) => row[0]).sort(),
    );
    expect(leases.every((row) => row.amountMinor > 0)).toBe(true);
  });
});

describe(`a place whose survey reads all owners (seed ${seed})`, () => {
  it("still has renters, the share pulled toward its county's by sample size", () => {
    const geoids = new Set<string>(
      Object.entries(housingData.placeTenure as Record<string, number[]>)
        .filter(([, [homes, owned]]) => homes >= 100 && owned === homes)
        .map(([geoid]) => geoid),
    );
    const tried: string[] = [];
    for (let attempt = 0; attempt < 400; attempt++) {
      const drawn = drawPlace(seed, `core2-housing-allowned-${attempt}`);
      const geoid = corePlaceByKey(drawn.key)?.sourceGeoid;
      if (!tried.includes(drawn.key)) tried.push(drawn.key);
      if (!geoid || !geoids.has(geoid)) continue;
      const dwellings = dwellingsOf(withHousing(input(drawn, 100)));
      expect(
        dwellings.some((row) => row[1] === "rent"),
        `${drawn.name} (${drawn.key}) has no renters, seed ${seed}`,
      ).toBe(true);
      return;
    }
    throw new Error(
      `no drawn place reads all owned in 400 draws; places tried: ${tried.join(", ")} (seed ${seed})`,
    );
  });
});

describe(`the played bench world of a place whose survey reads all owned (seed ${seed})`, () => {
  it("has counted renters whose rent flows are settled in the first weeks", () => {
    const geoids = new Set<string>(
      Object.entries(housingData.placeTenure as Record<string, number[]>)
        .filter(([, [homes, owned]]) => homes >= 100 && owned === homes)
        .map(([geoid]) => geoid),
    );
    const tried: string[] = [];
    for (let attempt = 0; attempt < 400; attempt++) {
      const drawn = drawPlace(seed, `core2-housing-allowned-world-${attempt}`);
      const geoid = corePlaceByKey(drawn.key)?.sourceGeoid;
      if (!tried.includes(drawn.key)) tried.push(drawn.key);
      if (!geoid || !geoids.has(geoid)) continue;
      const world = buildBenchWorld(drawn.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: drawn.key,
      });
      const core = world.core as unknown as CoreState;
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
      const rt = residentsRuntime(core)!;
      const rents = [...rt.flows.values()].filter(
        (flow) =>
          flow.id.startsWith("rent:") && rt.households.has(flow.id.slice(5)),
      );
      const where = `${drawn.name} (${drawn.key}), place seed ${drawn.seed}, test seed ${seed}`;
      expect(rents.length, `counted rent flows in ${where}`).toBeGreaterThan(0);
      const paid = rents.filter((flow) => (flow.lastPaidMinor ?? 0) > 0);
      expect(
        paid.length,
        `counted rent flows settled in ${where}: first is ${rents[0]!.id}`,
      ).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `no drawn place reads all owned in 400 draws; places tried: ${tried.join(", ")} (seed ${seed})`,
    );
  }, 600_000);
});
