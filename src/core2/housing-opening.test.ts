/** The opening's homes belong to the played town, with real values, owners and renters (sim stories, Oct 12, item 16). */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { corePlaceByKey } from "./place-lookup";
import { withHousing } from "./modules/housing";

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

function input(place: DrawnPlace): CoreInput {
  const town = corePlaceByKey(place.key)!.context.jurisdiction.id;
  // The opening also generates the county, with more households than the town.
  const county = "place:county-fixture";
  const homes = [
    ...Array.from({ length: 12 }, (_, i) => ({ i, placeId: town })),
    ...Array.from({ length: 40 }, (_, i) => ({ i: i + 12, placeId: county })),
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
