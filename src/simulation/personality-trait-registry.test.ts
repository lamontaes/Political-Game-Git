import { describe, expect, it } from "vitest";

import {
  PERSONALITY_TRAIT_READERS,
  PERSONALITY_TRAIT_REGISTRY,
  TRAIT_LIFE_PARTS,
  TRAIT_STRENGTH_LEVELS,
  traitsWithoutReaders,
} from "./personality-trait-registry";

describe("the one personality trait registry", () => {
  it("contains five universal traits and 92 notable qualities", () => {
    expect(PERSONALITY_TRAIT_REGISTRY).toHaveLength(97);
    expect(
      PERSONALITY_TRAIT_REGISTRY.filter(
        ({ holding }) => holding === "everyone-has-a-level",
      ),
    ).toHaveLength(5);
    expect(
      PERSONALITY_TRAIT_REGISTRY.filter(
        ({ holding }) => holding === "notable-only",
      ),
    ).toHaveLength(92);
    expect(
      new Set(
        PERSONALITY_TRAIT_REGISTRY.map(({ qualifiedKey }) => qualifiedKey),
      ).size,
    ).toBe(97);
  });

  it("uses the approved strengths and optional parts of life", () => {
    expect(TRAIT_STRENGTH_LEVELS).toEqual([
      "faint",
      "a lean",
      "clearly",
      "strongly",
      "defining",
    ]);
    expect(TRAIT_LIFE_PARTS).toEqual([
      "work",
      "family",
      "public life",
      "friends",
    ]);
    expect(
      PERSONALITY_TRAIT_REGISTRY.every(({ optionalLifePart }) =>
        Boolean(optionalLifePart),
      ),
    ).toBe(true);
  });

  it("contains the approved merges and none of the retired qualities", () => {
    const entries = new Map(
      PERSONALITY_TRAIT_REGISTRY.map((entry) => [entry.qualifiedKey, entry]),
    );
    for (const retired of [
      "personality-v1:social-contact-preference",
      "personality-v1:ownership-of-duties",
      "personality-v1:facet-reserved",
      "personality-v1:facet-cheeky",
      "personality-v1:facet-distractible",
      "personality-v1:facet-even-tempered",
    ]) {
      expect(entries.has(retired)).toBe(false);
    }
    expect(entries.has("personality-v1:facet-calm")).toBe(true);
    expect(entries.has("personality-v1:facet-mischievous")).toBe(true);
    expect(entries.has("personality-v1:facet-daydreaming")).toBe(true);
  });

  it("fails its coverage question when any trait has no reader", () => {
    expect(traitsWithoutReaders()).toEqual([]);
    expect(PERSONALITY_TRAIT_READERS).toHaveLength(97);
    expect(
      traitsWithoutReaders(PERSONALITY_TRAIT_REGISTRY, [
        ...PERSONALITY_TRAIT_READERS.slice(1),
      ]),
    ).toEqual([PERSONALITY_TRAIT_REGISTRY[0]!.qualifiedKey]);
  });
});
