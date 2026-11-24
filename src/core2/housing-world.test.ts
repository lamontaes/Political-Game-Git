/**
 * Each world's rents and home values (owner, Oct 27: "realistic not real"):
 * every county's median rent and owner home value opens on its own level,
 * drawn from the world's seed around the published ACS median.
 */
import { describe, expect, it } from "vitest";
import housingData from "./data/housing/housing.json" with { type: "json" };
import parameters from "./data/housing/parameters.json" with { type: "json" };
import { publishedRentValueOf, rentValueOf } from "./modules/housing";

const counties = Object.keys(housingData.countyRentValue);
const spread = parameters.housingWorldRentValueSpreadShare.value;

describe("each world's county rents and home values", () => {
  it("opens every county off its published medians and off another world's, inside the spread", () => {
    expect(counties.length).toBeGreaterThan(3000);
    for (const county of counties) {
      const real = publishedRentValueOf(county);
      const a = rentValueOf(county, "world-a");
      const b = rentValueOf(county, "world-b");
      for (const at of [0, 1] as const) {
        if (!real[at]) continue;
        expect(a[at], `${county} ${at}`).not.toBe(real[at]);
        expect(a[at], `${county} ${at}`).not.toBe(b[at]);
        expect(
          Math.abs(a[at]! / real[at]! - 1),
          `${county} ${at}`,
        ).toBeLessThanOrEqual(spread + 1e-9);
      }
    }
  });
  it("draws the same medians again from the same seed", () => {
    for (const county of counties.slice(0, 200))
      expect(rentValueOf(county, "world-a")).toEqual(
        rentValueOf(county, "world-a"),
      );
  });
});
