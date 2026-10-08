import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the zealous difference in a random new game", () => {
  it("changes career.consider-another-term for two people with matching non-target trait reasons", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-zealous",
      "career.consider-another-term",
      "m4-proof-facet-zealous",
      [
        {
          stableKey: "proof:shared-context",
          optionKey: "step-down",
          sourceType: "context:own-knowledge",
          direction: "supports",
          importance: "slight",
          confidence: "high",
          explanation: "Stepping down is the quiet option.",
          sourceRefs: [],
        },
      ],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("seek");
    expect(proof.low.choice).toBe("step-down");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
