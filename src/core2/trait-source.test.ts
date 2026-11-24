import { describe, expect, it } from "vitest";
import { recordedTraitSource } from "./trait-source";
import type { Source } from "./types";

const shared: Source = {
  tag: "ESTIMATED",
  asOf: "2021-01-01",
  citation: "Complete generated upbringing basis",
  estimatedFrom:
    "Recorded family and economic context; not an observed opinion",
};
const override: Source = {
  tag: "SOURCED",
  asOf: "2021-01-01",
  citation: "Independently supplied trait record",
};

describe("shared generated trait provenance", () => {
  it("preserves every complete Source field through a JSON round trip", () => {
    const person = JSON.parse(
      JSON.stringify({
        traits: { curiosity: 0.4, patience: -0.2 },
        sharedTraitSource: shared,
      }),
    );
    expect(recordedTraitSource(person, "curiosity")).toEqual(shared);
    expect(recordedTraitSource(person, "patience")).toEqual(shared);
  });

  it("keeps the independent per-trait Source ahead of the generated prior", () => {
    const person = {
      traits: { curiosity: 0.4, patience: -0.2 },
      sharedTraitSource: shared,
      traitSources: { curiosity: override },
    };
    expect(recordedTraitSource(person, "curiosity")).toBe(override);
    expect(recordedTraitSource(person, "patience")).toBe(shared);
    expect(person.traitSources.curiosity).toEqual(override);
  });

  it("does not give an absent or inherited trait a generated Source", () => {
    const person = {
      traits: Object.create({ curiosity: 0.4 }),
      sharedTraitSource: shared,
    };
    expect(recordedTraitSource(person, "curiosity")).toBeUndefined();
    expect(recordedTraitSource(person, "patience")).toBeUndefined();
    expect(recordedTraitSource({ traits: {} }, "curiosity")).toBeUndefined();
  });
});
