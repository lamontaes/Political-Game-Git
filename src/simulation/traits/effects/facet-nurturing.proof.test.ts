import { describe, expect, it } from "vitest";

import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("nurturing act pulls in a random new game", () => {
  it("changes the same choice between two residents with opposite poles", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-nurturing",
      "mogul.approach",
      "t9-nurturing-two-person-proof",
      [
        {
          stableKey: "proof:nurturing-baseline",
          optionKey: "deal",
          sourceType: "context:fixture",
          direction: "supports",
          importance: "slight",
          confidence: "medium",
          explanation: "The baseline reason both residents share.",
          sourceRefs: [],
        },
      ],
      "act-pulls",
    );
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("donate");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-nurturing|mogul.approach|donate|high",
    );
    expect(proof.low.choice).toBe("deal");
  });
});
