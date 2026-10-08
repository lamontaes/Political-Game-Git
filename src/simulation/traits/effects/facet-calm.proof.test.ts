import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the calm difference in a random new game", () => {
  it("changes labor.worker-quit for two people with matching non-target trait reasons", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-calm",
      "labor.worker-quit",
      "m4-proof-facet-calm",
      [
        {
          stableKey: "proof:strained-workplace",
          optionKey: "quit",
          sourceType: "context:own-knowledge",
          direction: "supports",
          importance: "slight",
          confidence: "high",
          explanation:
            "The strain at work has built up and leaving is a real option.",
          sourceRefs: [],
        },
      ],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("continue-work");
    expect(proof.low.choice).toBe("quit");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
