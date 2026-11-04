import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * One map (owner, Nov 4): every system reads where a place is and what it sits
 * under through src/core2/place-map.ts. Game code may not define its own
 * stateOf, stateKeyOf, townOf or county lookup. A file listed here still has
 * one and waits for its family's move; the list may only shrink, and each line
 * says why the file is not a place lookup yet or what moves it.
 */
const WAITING: Readonly<Record<string, string>> = {
  "src/core2/estates.ts":
    "stateOf reads the world's budget and law records, not a place; moves with the laws family",
  "src/core2/modules/school.ts":
    "stateOf reads the world's law chain; moves with the laws family",
  "src/core2/election-ties.ts":
    "stateOf reads the state the elections module recorded; moves with the elections family",
  "src/core2/candidate-pool.ts":
    "townOf reads the town the offices module recorded; moves with the elections family",
  "src/core2/modules/homeless-count.ts":
    "townOf reads the first visible place of the world; moves with the housing records family",
  "src/core2/modules/housing.ts":
    "townOf builds the housing town from households and the place map; moves with the households family",
};
const NAMES =
  /function\s+(stateOf|stateKeyOf|stateOfPlace|stateOfPlaceKey|stateOfPlaceId|townOf)\b/;
const COUNTY_LOOKUPS =
  /(countyPopulationSharesForPlace|countyGeoidsForPlace|countyLandSharesForPlace)\(/;
const COUNTY_WAITING = new Set([
  "src/core2/modules/credit.ts",
  "src/core2/modules/staff.ts",
  "src/core2/modules/regional.ts",
  "src/core2/population.ts",
  "src/core2/reference/government-units.ts",
  "src/core2/tooling/place-map-build.ts",
  "src/core2/hud-rents.ts",
  "src/core2/opening-public-owner.ts",
  "src/core2/reference/local-institutions.ts",
  "src/core2/town-employment-mix.ts",
  "src/bench/creator.ts",
]);

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(path);
  }
  return out;
}

describe("no private place lookup", () => {
  const files = sources("src");
  it("defines no stateOf, stateKeyOf or townOf outside the waiting list", () => {
    const found = files.filter((f) => NAMES.test(readFileSync(f, "utf8")));
    expect(found.filter((f) => !(f in WAITING))).toEqual([]);
    expect(Object.keys(WAITING).filter((f) => !found.includes(f))).toEqual([]);
  });
  it("looks up no town's county outside the map and the waiting list", () => {
    const found = files.filter((f) =>
      COUNTY_LOOKUPS.test(readFileSync(f, "utf8")),
    );
    expect(found.filter((f) => !COUNTY_WAITING.has(f))).toEqual([]);
  });
});
