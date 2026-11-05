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
const WAITING: Readonly<Record<string, string>> = {};
const NAMES =
  /function\s+(stateOf|stateKeyOf|stateOfPlace|stateOfPlaceKey|stateOfPlaceId|townOf)\b/;
const COUNTY_LOOKUPS =
  /(countyPopulationSharesForPlace|countyGeoidsForPlace|countyLandSharesForPlace)\(/;
// The reference file that holds the Census county parts, the reader that wraps
// it, and the map's own builder are the only readers of those parts.
const COUNTY_WAITING = new Set([
  "src/core2/reference/government-units.ts",
  "src/core2/place-map.ts",
  "src/core2/tooling/place-map-build.ts",
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
  it("looks up no town's county except through the place map reader", () => {
    const found = files.filter((f) =>
      COUNTY_LOOKUPS.test(readFileSync(f, "utf8")),
    );
    expect(found.filter((f) => !COUNTY_WAITING.has(f))).toEqual([]);
  });
});
