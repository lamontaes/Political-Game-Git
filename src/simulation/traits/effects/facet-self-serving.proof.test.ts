import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../life-places";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the self-serving facet difference in all 56 places", () => {
  it.each(lifePlaceStateIdentities())(
    "changes the same person's decision in $name",
    (state) => {
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
        `l1-proof-facet-self-serving:${state.usps}`,
        [baseline],
        state.jurisdictionKey,
      );
      process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
      expect(proof.without).toBe("step-down");
      expect(proof.high.choice).toBe("seek");
      expect(proof.low.choice).toBe("step-down");
      expect(proof.high.reason).toContain("advance themselves");
      expect(proof.low.reason).toContain("leave when the term ends");
      expect(proof.place).toContain(`US-${state.usps}`);
    },
  );
});
