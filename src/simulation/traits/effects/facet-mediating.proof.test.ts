import { describe, expect, it } from "vitest";

import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("mediating act pulls in a random new game", () => {
  it("changes the same choice between two residents with opposite poles", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-mediating",
      "justice.sentence",
      "t9-mediating-two-person-proof",
      [
        {
          stableKey: "proof:mediating-baseline",
          optionKey: "court:jail",
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
    expect(proof.high.choice).toBe("court:community-supervision");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-mediating|justice.sentence|court:community-supervision|high",
    );
    expect(proof.low.choice).toBe("court:jail");
  });
});
