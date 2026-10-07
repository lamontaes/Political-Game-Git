import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the nostalgic facet difference in a random new game", () => {
  it("changes the same person's choice about an established relationship", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:relationship-baseline",
      optionKey: "break-up",
      sourceType: "context:relationship-course",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They have begun to follow separate paths.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-nostalgic",
      "people.couple-stage",
      "s13-proof-facet-nostalgic",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("break-up");
    expect(proof.high.choice).toBe("stay");
    expect(proof.low.choice).toBe("break-up");
    expect(proof.high.reason).toBe(
      "Frequently revisits meaningful earlier relationships and experiences.",
    );
    expect(proof.low.reason).toBe("They have begun to follow separate paths.");
  });
});
