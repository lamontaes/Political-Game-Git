import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the devoted difference in a random new game", () => {
  it("changes one named person's people.couple-answer choice", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-devoted",
      "people.couple-answer",
      "m4-proof-facet-devoted",
      [
        {
          stableKey: "couple:existing-relationship-standing",
          optionKey: "decline",
          sourceType: "context:relationship",
          direction: "supports",
          importance: "slight",
          confidence: "medium",
          explanation:
            "The existing relationship gives them reason to keep things as they are.",
          sourceRefs: [],
        },
      ],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("decline");
    expect(proof.high.choice).toBe("accept");
    expect(proof.low.choice).toBe("decline");
  });
});
