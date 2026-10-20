/**
 * An owner's home has a value even where the ACS withholds the county's median
 * (a county with very few households): the state's median stands in, so the
 * property tax has homes to bill. Places in those counties are drawn at
 * random; the place and seed are named in every failure message.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { ownedHomes, rentValueOf } from "./modules/housing";
import countyNeighbors from "./data/housing/county-neighbors.json" with { type: "json" };
import { realLocalities } from "./places";
import { countyPopulationSharesForPlace } from "./reference/government-units";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const RENT_VALUE = housingData.countyRentValue as unknown as Record<
  string,
  [number | null, number | null]
>;

it("a county the ACS withholds takes the median of its neighboring counties' published values", () => {
  const neighbors = countyNeighbors.neighbors as Record<string, string[]>;
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2
      ? sorted[mid]!
      : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  };
  let checked = 0;
  for (const [county, ids] of Object.entries(neighbors)) {
    const [rent, value] = rentValueOf(county);
    expect(rent, county).toBeGreaterThan(0);
    expect(value, county).toBeGreaterThan(0);
    for (const field of [0, 1] as const) {
      if (RENT_VALUE[county]?.[field]) continue;
      const published = ids
        .map((id) => RENT_VALUE[id]?.[field])
        .filter((v): v is number => !!v);
      if (!published.length) continue;
      expect(field ? value : rent, `${county} field ${field}`).toBe(
        median(published),
      );
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(0);
});

it("gives owners a home value in a county whose median value the ACS withholds, and bills their property tax", () => {
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|county-estimate|${key}`).digest("hex");
  const placesInWithheldCounties = [...realLocalities()]
    .filter((place) => {
      const geoid = place.sourceGeoid ?? "";
      if (geoid.length !== 7) return false;
      const county = [...countyPopulationSharesForPlace(geoid)].sort(
        (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
      )[0]?.[0];
      return !!county && !RENT_VALUE[county]?.[1];
    })
    .sort((a, b) => rank(a.key).localeCompare(rank(b.key)));
  expect(placesInWithheldCounties.length).toBeGreaterThan(0);
  setBookkeeping(false);
  try {
    const place = placesInWithheldCounties[0]!;
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const where = `${place.key} [${place.sourceGeoid}], seed ${seed}`;
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const dwellings = api
      .moduleState("housing")
      .table("dwellings")
      .rows() as unknown as { tenure: string; valueMinor?: number }[];
    const owners = dwellings.filter((row) => row.tenure === "own");
    // A town with owners has homes to tax, none of them worth nothing.
    expect(owners.length, where).toBeGreaterThan(0);
    expect(owners.filter((row) => !row.valueMinor).length, where).toBe(0);
    const town = lawChain(api).townPlaceId;
    expect(ownedHomes(api, town).length, where).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
