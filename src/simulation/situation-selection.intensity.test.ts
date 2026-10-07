import { describe, expect, it } from "vitest";
import { createPlayerModel } from "./player-model";
import {
  rankSituations,
  selectSituation,
  type SituationCandidate,
} from "./situation-selection";

const candidates: readonly SituationCandidate[] = [
  {
    key: "adult.friend-in-difficulty",
    band: "adulthood",
    stakes: "pressing",
    tensions: [],
    relevance: 0.95,
    followsFromHistory: false,
  },
  {
    key: "adult.family-request",
    band: "adulthood",
    stakes: "ordinary",
    tensions: [],
    relevance: 0.3,
    followsFromHistory: false,
  },
];

const base = {
  selectionSeed: "difficulty-test-seed",
  personKey: "person-test",
  ordinal: 3,
  model: createPlayerModel(),
  candidates,
  recentKeys: [],
  recentStakes: ["pressing", "pressing", "pressing"] as const,
};

describe("challenge intensity in adaptive situation selection", () => {
  it("changes only pacing weights and preserves the eligible candidate set", () => {
    const quietInput = { ...base, intensity: "quiet" as const };
    const relentlessInput = { ...base, intensity: "relentless" as const };
    const quiet = rankSituations(quietInput);
    const relentless = rankSituations(relentlessInput);

    expect(quiet.map((entry) => entry.candidate)).toEqual(candidates);
    expect(relentless.map((entry) => entry.candidate)).toEqual(candidates);
    expect(selectSituation(quietInput)?.chosen.candidate.key).toBe(
      "adult.family-request",
    );
    expect(selectSituation(relentlessInput)?.chosen.candidate.key).toBe(
      "adult.friend-in-difficulty",
    );
  });

  it("keeps standard on the original pacing values", () => {
    const defaultRanked = rankSituations(base);
    const standardRanked = rankSituations({ ...base, intensity: "standard" });
    expect(standardRanked).toEqual(defaultRanked);
  });
});
