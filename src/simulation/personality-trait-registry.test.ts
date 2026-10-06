import { describe, expect, it } from "vitest";

import {
  PERSONALITY_TRAIT_READERS,
  PERSONALITY_TRAIT_REGISTRY,
  NOT_YET_CONNECTED_TRAITS,
  TRAIT_LIFE_PARTS,
  TRAIT_STRENGTH_LEVELS,
  traitsWithoutReaderOrDebt,
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

  it("names real behavior readers and makes every other trait explicit debt", () => {
    expect(traitsWithoutReaderOrDebt()).toEqual([]);
    expect(PERSONALITY_TRAIT_READERS).toHaveLength(7);
    expect(NOT_YET_CONNECTED_TRAITS).toHaveLength(90);
    expect(
      new Set(PERSONALITY_TRAIT_READERS.map(({ trait }) => trait)).size,
    ).toBe(PERSONALITY_TRAIT_READERS.length);
    expect(new Set(NOT_YET_CONNECTED_TRAITS).size).toBe(
      NOT_YET_CONNECTED_TRAITS.length,
    );
    expect(
      PERSONALITY_TRAIT_READERS.some(({ trait }) =>
        NOT_YET_CONNECTED_TRAITS.includes(
          trait as (typeof NOT_YET_CONNECTED_TRAITS)[number],
        ),
      ),
    ).toBe(false);
  });

  it("fails when an unread trait is removed from the explicit debt", () => {
    expect(
      traitsWithoutReaderOrDebt(
        PERSONALITY_TRAIT_REGISTRY,
        PERSONALITY_TRAIT_READERS,
        NOT_YET_CONNECTED_TRAITS.slice(1),
      ),
    ).toEqual([NOT_YET_CONNECTED_TRAITS[0]]);
  });

  it("does not let the debt list grow", () => {
    expect(NOT_YET_CONNECTED_TRAITS.length).toBeLessThanOrEqual(92);
  });
});
