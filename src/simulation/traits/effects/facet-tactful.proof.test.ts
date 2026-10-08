import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the tactful facet difference in a random new game", () => {
  it("changes the same person's ordinary outreach choice from door to phone", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:ordinary-outreach",
      optionKey: "door-canvass",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They usually favor a direct door canvass.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-tactful",
      "campaign.organizer-outreach",
      "l1-proof-facet-tactful",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("door-canvass");
    expect(proof.high.choice).toBe("phone-shift");
    expect(proof.low.choice).toBe("door-canvass");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-tactful|campaign.organizer-outreach|phone-shift|high",
    );
    expect(proof.low.reason).toContain("direct door canvass");
  });
});
