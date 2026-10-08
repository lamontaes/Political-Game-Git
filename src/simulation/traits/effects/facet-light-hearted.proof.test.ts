import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the light-hearted facet through the shared trait table", () => {
  it("changes the same person's live press response", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:press-request",
      optionKey: "decline",
      sourceType: "context:own-knowledge",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation:
        "Saying nothing on the record avoids committing to an account.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-light-hearted",
      "press.subject-response",
      "m4-proof-facet-light-hearted",
      [baseline],
      "act-pulls",
    );
    expect(proof.without).toBe("decline");
    expect(proof.high.choice).toBe("no-response");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
  });
});
