import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the hot-headed facet difference in a random new game", () => {
  it("changes the same person's live career choice toward challenging opponents again", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:ordinarily-steps-down",
      optionKey: "step-down",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They usually leave office when their term ends.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-hot-headed",
      "career.consider-another-term",
      "s13-proof-facet-hot-headed",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("step-down");
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toContain("quick to challenge");
    expect(proof.low.choice).toBe("step-down");
  });
});
