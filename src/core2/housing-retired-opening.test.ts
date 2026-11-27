/**
 * A household living on retirement is priced by what it is paid (People item
 * 4): the opening counts the income awards paid to a household as its income,
 * so two retired owners with no job and different awards get different homes.
 * Before, both read as earning nothing and every such home was worth the same.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { corePlaceByKey } from "./place-lookup";
import { withHousing } from "./modules/housing";
import type { CoreInput, Source } from "./types";

type DrawnPlace = ReturnType<typeof drawPlace>;

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const start = "2026-10-12";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Retired housing fixture only.",
};
const HOMES = 24;

/** The town's households, none of them with a job, each paid a retirement award that grows with its number. */
function input(place: DrawnPlace): CoreInput {
  const town = corePlaceByKey(place.key)!.context.jurisdiction.id;
  const homes = Array.from({ length: HOMES }, (_, i) => i);
  return {
    seed: "housing-retired-fixture",
    startedAt: start,
    people: homes.map((i) => ({
      id: `person:${i}`,
      givenName: `P${i}`,
      familyName: "Fixture",
      birthDate: `${1940 + (i % 6)}-01-01`,
      placeId: town,
      householdId: `household:${i}`,
      tier: "monthly",
      traits: {},
      liquidMinor: 100_000,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
    })),
    households: homes.map((i) => ({
      id: `household:${i}`,
      placeId: town,
      memberIds: [`person:${i}`],
      source: src,
    })),
    jobs: [],
    organizations: [],
    finance: {
      contracts: homes.map((i) => ({
        id: `award:${i}`,
        householdId: `household:${i}`,
        payerIds: [],
        payeeId: `person:${i}`,
        kind: "income-award",
        amountMinor: 60_000 + i * 20_000,
        dueAt: "2026-11-01",
        periodMonths: 1,
        accruesArrears: false,
        recipientIncome: {
          personId: `person:${i}`,
          householdId: `household:${i}`,
          kindId: "retirement",
          sourceFactId: `fact:${i}`,
        },
      })),
      facilities: [],
      businesses: [],
      gaps: [],
    },
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
// first draw whose owner share leaves owners among the town's homes.
const { place, dwellings } = (() => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const drawn = drawPlace(
      seed,
      attempt ? `core2-housing-retired-${attempt}` : "core2-housing-retired",
    );
    const rows = dwellingsOf(withHousing(input(drawn)));
    if (rows.filter((row) => row[1] === "own").length >= 4)
      return { place: drawn, dwellings: rows };
  }
  throw new Error(`no place with four owners in 30 draws (seed ${seed})`);
})();

describe(`retired households' homes in ${place.name} (seed ${seed})`, () => {
  it("prices a retired owner's home by the award it is paid: more paid, a higher value", () => {
    const owners = dwellings
      .filter((row) => row[1] === "own")
      .map((row) => ({
        award: Number(row[0].split(":")[1]),
        value: row[2],
      }))
      .sort((a, b) => a.award - b.award);
    expect(owners.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < owners.length; i += 1)
      expect(owners[i]!.value, `award ${owners[i]!.award}`).toBeGreaterThan(
        owners[i - 1]!.value,
      );
  });
});
