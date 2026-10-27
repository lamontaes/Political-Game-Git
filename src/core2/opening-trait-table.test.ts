import { describe, expect, it } from "vitest";
import { seedableTraits } from "./opening-trait-table";
import { PERSONALITY_PACK } from "./personality-catalogue";
import { PEOPLE_MIND_VERSION } from "./people-trait-definitions";

describe("the opening's trait table", () => {
  it("holds the people, legislature and personality traits without any decision", () => {
    const packs = new Set(seedableTraits().map((trait) => trait.pack));
    expect(packs.has(PEOPLE_MIND_VERSION)).toBe(true);
    expect(packs.has(PERSONALITY_PACK)).toBe(true);
    expect(packs.size).toBe(3);
  });
});
