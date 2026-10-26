import { describe, expect, it } from "vitest";
import housingData from "./data/housing/housing.json" with { type: "json" };
import neighbors from "./data/housing/county-neighbors.json" with { type: "json" };
import { rentValueOf } from "./modules/housing";

const rentValue = housingData.countyRentValue as unknown as Record<
  string,
  [number | null, number | null]
>;

// A county the ACS gives no median for takes the household-weighted median of
// its neighboring counties (Census county adjacency), not its state's.
describe("a county without an ACS median rent or home value", () => {
  for (const [county, near] of Object.entries(neighbors.neighbors)) {
    it(`${county} reads its neighbors' medians`, () => {
      const [rent, value] = rentValueOf(county);
      const published = near
        .map((n) => rentValue[n])
        .filter((rv) => rv?.[0] && rv[1]) as [number, number][];
      expect(published.length, county).toBeGreaterThan(0);
      const own = rentValue[county];
      const inRange = (x: number, at: 0 | 1) => {
        const column = published.map((r) => r[at]);
        return x >= Math.min(...column) && x <= Math.max(...column);
      };
      // A figure the ACS does publish for the county itself stays as published.
      if (own?.[0]) expect(rent, county).toBe(own[0]);
      else expect(inRange(rent!, 0), `${county} rent ${rent}`).toBe(true);
      if (own?.[1]) expect(value, county).toBe(own[1]);
      else expect(inRange(value!, 1), `${county} value ${value}`).toBe(true);
    });
  }
});
