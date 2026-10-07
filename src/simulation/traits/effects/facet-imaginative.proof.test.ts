import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the imaginative facet difference in a random new game", () => {
  it("changes the same person's ordinary outreach choice toward new possibilities", () => {
    const baseline: DecisionConsideration = {
      stableKey: "proof:ordinary-outreach",
      optionKey: "organization-meeting",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "They usually favor a group meeting for outreach.",
      sourceRefs: [],
    };
    const proof = proveTraitDifference(
      "personality-v1:facet-imaginative",
      "campaign.organizer-outreach",
      "l1-proof-facet-imaginative",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("organization-meeting");
    expect(proof.high.choice).toBe("candidate-guidance");
    expect(proof.low.choice).toBe("organization-meeting");
    expect(proof.high.reason).toContain("explore new possibilities");
    expect(proof.low.reason).toContain("group meeting");
  });
});
