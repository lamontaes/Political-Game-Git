import { describe, expect, it } from "vitest";

import {
  createPlayerModel,
  lifePlaceStateIdentities,
  selectSituation,
  type SituationCandidate,
  type SituationSelectionInput,
} from "./index";

const candidates: readonly SituationCandidate[] = [
  {
    key: "adult.family-request",
    band: "adulthood",
    stakes: "pressing",
    tensions: [],
    relevance: 1,
    followsFromHistory: false,
  },
  {
    key: "adult.weekend-invitation",
    band: "adulthood",
    stakes: "ordinary",
    tensions: [],
    relevance: 0.2,
    followsFromHistory: false,
  },
];

function input(
  challenge: SituationSelectionInput["challenge"],
  recentStakes: SituationSelectionInput["recentStakes"],
  placeKey = "test-place",
): SituationSelectionInput {
  return {
    selectionSeed: "challenge-intensity-test",
    personKey: placeKey,
    ordinal: 1,
    model: createPlayerModel(),
    candidates,
    recentKeys: [],
    recentStakes,
    challenge,
  };
}

describe("challenge intensity in the shared situation selector", () => {
  it("keeps standard weights and lets quiet and relentless order the same candidates differently", () => {
    const hardRun = ["pressing", "pressing", "pressing"] as const;
    const quiet = selectSituation(input("quiet", hardRun));
    const standard = selectSituation(input("standard", hardRun));
    const relentless = selectSituation(input("relentless", hardRun));

    expect(standard?.ranked[0]?.components.pacingPenalty).toBe(1.2);
    expect(quiet?.ranked[0]?.components.pacingPenalty).toBe(1.8);
    expect(relentless?.ranked[0]?.components.pacingPenalty).toBe(0.6);
    expect(quiet?.ranked.map((entry) => entry.candidate.key)).toEqual(
      standard?.ranked.map((entry) => entry.candidate.key),
    );
    expect(standard?.ranked.map((entry) => entry.candidate.key)).toEqual(
      relentless?.ranked.map((entry) => entry.candidate.key),
    );
    expect(quiet?.chosen.candidate.key).toBe("adult.weekend-invitation");
    expect(relentless?.chosen.candidate.key).toBe("adult.family-request");
  });

  it("uses one shared candidate path for all 56 life places", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);

    for (const place of places) {
      const quiet = selectSituation(
        input(
          "quiet",
          ["pressing", "pressing", "pressing"],
          place.jurisdictionKey,
        ),
      );
      const relentless = selectSituation(
        input(
          "relentless",
          ["pressing", "pressing", "pressing"],
          place.jurisdictionKey,
        ),
      );
      const offered = candidates.map((candidate) => candidate.key).sort();
      expect(quiet?.ranked.map((entry) => entry.candidate.key).sort()).toEqual(
        offered,
      );
      expect(
        relentless?.ranked.map((entry) => entry.candidate.key).sort(),
      ).toEqual(offered);
    }
  });
});
