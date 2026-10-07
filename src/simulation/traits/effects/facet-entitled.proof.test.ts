import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

describe("the entitled facet difference in a random new game", () => {
  it("changes the same person's ordinary outreach choice toward individualized guidance", () => {
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
      "personality-v1:facet-entitled",
      "campaign.organizer-outreach",
      "l1-proof-facet-entitled",
      [baseline],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("organization-meeting");
    expect(proof.high.choice).toBe("candidate-guidance");
    expect(proof.low.choice).toBe("organization-meeting");
    expect(proof.high.reason).toContain("individualized help");
    expect(proof.low.reason).toContain("group meeting");
  });
});
