import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the manipulative facet difference in a random new game", () => {
  it("changes the same person's live press response from decline to dispute", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:press-response",
      optionKey: "decline",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They usually decline a press request.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-manipulative",
      "press.subject-response",
      "s15-proof-facet-manipulative",
      [baseline],
      true,
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("decline");
    expect(proof.high.choice).toBe("dispute");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-manipulative|press.subject-response|dispute|high",
    );
    expect(proof.low.reason).toContain("usually decline");
  });
});
