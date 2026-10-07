import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the self-serving facet difference in a random new game", () => {
  it("changes the same person's outreach choice toward personal time", () => {
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
      "personality-v1:facet-self-serving",
      "campaign.organizer-outreach",
      "l1-proof-facet-self-serving",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("door-canvass");
    expect(proof.high.choice).toBe("not-now");
    expect(proof.low.choice).toBe("door-canvass");
    expect(proof.high.reason).toContain("own time");
    expect(proof.low.reason).toContain("direct door canvass");
  });
});
