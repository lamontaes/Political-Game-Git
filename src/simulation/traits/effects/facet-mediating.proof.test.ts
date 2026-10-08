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
    process.stderr.write(`T9 PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("HIGH");
    expect(proof.low.choice).toBe("LOW");
  });
});
