import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import {
  businessName,
  businessNameContext,
  businessNameStyles,
  fillBusinessName,
} from "./business-names";
import names from "./data/business/names.json" with { type: "json" };

// A place drawn from all 56 the way the runner draws, unless the runner names one.
const drawn = drawPlace("business-names", "M1-08");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;

describe(`business names: ${key} (seed ${seed})`, () => {
  it("a new business takes the first of its kind's styles not already in town", () => {
    const context = {
      town: "Riverton",
      state: "Ohio",
      family: "Okafor",
      county: "Lake County",
    };
    const [first, second] = businessNameStyles("restaurant").map((style) =>
      fillBusinessName(style, context),
    );
    expect(businessName("restaurant", context, new Set())).toBe(first);
    expect(businessName("restaurant", context, new Set([first!]))).toBe(second);
    // No style carries the raw kind id or a phrase Americans don't use.
    for (const styles of Object.values(names.kinds))
      for (const style of styles)
        expect(style.toLowerCase()).not.toMatch(/general store|mercantile/);
  });

  it("every business in a generated opening is named from its kind's styles", () => {
    const input = generatedOpening(
      { seed, key },
      { economy: false, settings: { population: 700 } },
    );
    const employers = input.organizations.filter(
      (row) => row.kind === "employer",
    );
    expect(employers.length, `seed ${seed}`).toBeGreaterThan(0);
    for (const row of employers) {
      expect(row.name).not.toMatch(/general store|mercantile/i);
      expect(row.name).not.toMatch(/\{\w+\}/);
    }
    // The place's own names are what a style fills in.
    const context = businessNameContext(employers[0]!.placeId, "Okafor");
    expect(context.town.length).toBeGreaterThan(0);
    expect(context.county.length).toBeGreaterThan(0);
  }, 600_000);
});
