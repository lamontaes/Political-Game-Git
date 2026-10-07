import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the self-serving facet difference in a random new game", () => {
  it("changes the same person's decision about seeking another term", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:ordinary-outreach",
      optionKey: "step-down",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They plan to leave when the term ends.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-self-serving",
      "career.consider-another-term",
      "l1-proof-facet-self-serving",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("step-down");
    expect(proof.high.choice).toBe("seek");
    expect(proof.low.choice).toBe("step-down");
    expect(proof.high.reason).toContain("advance themselves");
    expect(proof.low.reason).toContain("leave when the term ends");
  });
});
