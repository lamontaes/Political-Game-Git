import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the brooding facet difference in a random new game", () => {
  it("changes the same person's live officeholding choice against a baseline", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:ordinary-officeholding-choice",
      optionKey: "seek",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They usually seek another term.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-brooding",
      "career.consider-another-term",
      "s13-proof-facet-brooding",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("seek");
    expect(proof.high.choice).toBe("step-down");
    expect(proof.low.choice).toBe("seek");
    expect(proof.high.reason).toContain("dwelling on the strain");
    expect(proof.low.reason).toContain("usually seek");
  });
});
