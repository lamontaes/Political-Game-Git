/**
 * The core's opening trait table is the old engine's registry for the packs
 * the opening seeds from: the same traits, in the same order, with the same
 * declarations (core-old-imports-population-traits). The opening reads only
 * this table to seed a person's trait values, so equal tables give equal
 * seeded values for everyone, in every place.
 */
import { describe, expect, it } from "vitest";
import { seedableTraits } from "../src/core2/opening-trait-table";
import { loadedTraitRegistry } from "../src/simulation/trait-registry";

describe("the opening's trait table against the old registry", () => {
  it("holds the same traits, in the same order, as the old registry's seeded packs", () => {
    const table = seedableTraits();
    const packs = new Set(table.map((trait) => trait.pack));
    const old = [...loadedTraitRegistry().traits.values()].filter((trait) =>
      packs.has(trait.pack),
    );
    expect(table.length).toBeGreaterThan(0);
    expect(table.map((trait) => trait.qualifiedKey)).toEqual(
      old.map((trait) => trait.qualifiedKey),
    );
    expect(JSON.stringify(table)).toBe(JSON.stringify(old));
  });
});
