import { describe, expect, it } from "vitest";
import { averageTwoBedroomRent } from "./rent-estimate";

describe("averageTwoBedroomRent", () => {
  it("weights each area by the people it holds", () => {
    expect(
      averageTwoBedroomRent([
        { publishedPopulation: 100, rentByBedrooms: { "2": 1000 } },
        { publishedPopulation: 300, rentByBedrooms: { "2": 2000 } },
      ]),
    ).toBe(1750);
  });

  it("counts an area with no published population once and skips one with no rent", () => {
    expect(
      averageTwoBedroomRent([
        { rentByBedrooms: { "2": 900 } },
        { rentByBedrooms: { "1": 500 } },
        { publishedPopulation: null, rentByBedrooms: { "2": 1100 } },
      ]),
    ).toBe(1000);
  });

  it("skips shard records that carry no rents at all", () => {
    expect(
      averageTwoBedroomRent([
        {},
        { publishedPopulation: 5, rentByBedrooms: null },
        { publishedPopulation: 5, rentByBedrooms: { "2": 800 } },
      ]),
    ).toBe(800);
  });

  it("gives nothing when no area has a two-bedroom rent", () => {
    expect(averageTwoBedroomRent([{ rentByBedrooms: {} }])).toBeNull();
    expect(averageTwoBedroomRent([])).toBeNull();
  });
});
