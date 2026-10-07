import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the intimacy-guarded trait in a random new game", () => {
  it("changes one person's live press response from dispute to decline", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:press-response",
      optionKey: "dispute",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They have reason to dispute the request.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-intimacy-guarded",
      "press.subject-response",
      "s15-proof-facet-intimacy-guarded",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("dispute");
    expect(proof.high.choice).toBe("decline");
    expect(proof.low.choice).toBe("dispute");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toContain("reason to dispute");
  });

  it("changes the answer of a person in a relationship with another person", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-intimacy-guarded",
      "people.couple-answer",
      "t9-facet-intimacy-guarded-two-person-proof",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
