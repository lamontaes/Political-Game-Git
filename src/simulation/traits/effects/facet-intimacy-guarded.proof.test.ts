import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the intimacy-guarded difference in a random new game", () => {
  it("makes two matched people choose differently on a live press response", () => {
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
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-intimacy-guarded",
      "press.subject-response",
      "s15-proof-facet-intimacy-guarded",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("decline");
    expect(proof.low.choice).toBe("dispute");
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.person).toEqual(expect.any(String));
    expect(proof.low.person).toEqual(expect.any(String));
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toContain("reason to dispute");
  });
});
