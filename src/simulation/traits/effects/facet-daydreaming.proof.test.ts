import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the daydreaming difference in a random new game", () => {
  it("changes one person's live press response, with the reason traced to the trait", () => {
    const existingMatter: DecisionConsideration = {
      stableKey: "proof:recorded-press-matter",
      optionKey: "dispute",
      sourceType: "context:recorded-press-matter",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "The person has a recorded matter they could dispute.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-daydreaming",
      "press.subject-response",
      "s15-proof-facet-daydreaming",
      [existingMatter],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("dispute");
    expect(proof.high.choice).toBe("no-response");
    expect(proof.low.choice).toBe("dispute");
    expect(proof.high.reason).toContain("attention wanders");
  });
});
