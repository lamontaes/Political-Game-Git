import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the arbitrary facet in a random new game", () => {
  it("changes the same person's live career choice with its high pole", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:career-choice",
      optionKey: "seek",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They usually seek another term.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-arbitrary",
      "career.consider-another-term",
      "s13-proof-facet-arbitrary",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("seek");
    expect(proof.low.choice).toBe("seek");
    expect(proof.high.choice).toBe("step-down");
    expect(proof.high.reason).toContain("unpredictable career choice");
    expect(proof.low.reason).toContain("usually seek");
  });
});
