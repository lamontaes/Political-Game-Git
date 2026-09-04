import { describe, expect, it } from "vitest";

import { canonicalJson } from "../simulation";
import {
  compareSeeds,
  seedComparisonJson,
  seedComparisonMarkdown,
} from "./seed-comparison";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";

const SEEDS = ["dynamism-one", "dynamism-two", "dynamism-three"] as const;

describe("the multi-seed comparison harness", () => {
  const comparison = compareSeeds({ seeds: [...SEEDS] });

  it("generates one world per seed through the ordinary new-game path", () => {
    expect(comparison.summaries.map((summary) => summary.seed)).toEqual([
      ...SEEDS,
    ]);
    const worldIds = new Set(
      comparison.summaries.map((summary) => summary.worldId),
    );
    expect(worldIds.size).toBe(SEEDS.length);
  });

  it("finds at least two differences that are not names", () => {
    expect(comparison.meaningfulDifferences.length).toBeGreaterThanOrEqual(2);
    for (const difference of comparison.meaningfulDifferences) {
      expect(difference.nameOnly).toBe(false);
      expect(difference.distinctValueCount).toBeGreaterThan(1);
    }
  });

  it("counts a different household as a real difference and a different surname as not one", () => {
    const keys = comparison.meaningfulDifferences.map(
      (difference) => difference.key,
    );
    // The age of the adult the character lives with is a fact about the life.
    expect(keys).toContain("household.coResidentAges");
    expect(keys).not.toContain("player.givenName");
    expect(keys).not.toContain("player.familyName");
    expect(
      comparison.differences
        .filter((difference) => difference.nameOnly)
        .map((difference) => difference.key),
    ).toContain("player.familyName");
  });

  it("reports what the generator did not vary rather than omitting it", () => {
    expect(comparison.identicalDimensionKeys.length).toBeGreaterThan(0);
    const reported = new Set([
      ...comparison.identicalDimensionKeys,
      ...comparison.differences.map((difference) => difference.key),
    ]);
    for (const dimension of comparison.summaries[0]?.dimensions ?? []) {
      expect(reported).toContain(dimension.key);
    }
  });

  it("reads variation from canonical records rather than from presentation", () => {
    // Every summary is produced from the world alone, so regenerating the same
    // seed reproduces it exactly.
    const repeat = compareSeeds({ seeds: [...SEEDS] });
    expect(canonicalJson(repeat)).toBe(canonicalJson(comparison));
    expect(seedComparisonJson(repeat)).toBe(seedComparisonJson(comparison));
    expect(seedComparisonMarkdown(repeat)).toBe(
      seedComparisonMarkdown(comparison),
    );
  });

  it("compares a different setup without changing the shape of the answer", () => {
    const adults = compareSeeds({
      seeds: [...SEEDS],
      setup: {
        ...DEFAULT_NEW_GAME_SETUP,
        startAge: 34,
        startingLife: "legislative-office",
      },
    });
    expect(adults.meaningfulDifferences.length).toBeGreaterThanOrEqual(2);
    // The legislative surface is genuinely available at this setup, and that is
    // reported as a shared property rather than as variation nobody produced.
    const office = adults.summaries[0]?.dimensions.find(
      (dimension) => dimension.key === "opportunities.legislation",
    );
    expect(office?.value).toBe("yes");
  });

  it("refuses a comparison that cannot answer the question", () => {
    expect(() => compareSeeds({ seeds: ["only-one"] })).toThrow(
      "at least two seeds",
    );
    expect(() => compareSeeds({ seeds: ["same", "same"] })).toThrow(
      "Duplicate seed",
    );
  });

  it("writes a Markdown report that separates the two kinds of difference", () => {
    const markdown = seedComparisonMarkdown(comparison);
    expect(markdown).toContain("## Differences beyond names");
    expect(markdown).toContain("## Name-only differences");
    expect(markdown).toContain("## Identical across every seed");
    for (const seed of SEEDS) {
      expect(markdown).toContain(seed);
    }
  });
});
