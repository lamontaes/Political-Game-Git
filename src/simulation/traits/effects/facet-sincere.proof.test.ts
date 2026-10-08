import { describe, expect, it } from "vitest";

import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("sincere act pulls in a random new game", () => {
  it("changes the same choice between two residents with opposite poles", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-sincere",
      "press.subject-response",
      "t9-sincere-two-person-proof",
      [
        {
          stableKey: "proof:sincere-baseline",
          optionKey: "decline",
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
    expect(proof.high.choice).toBe("dispute");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-sincere|press.subject-response|dispute|high",
    );
    expect(proof.low.choice).toBe("decline");
  });
});
