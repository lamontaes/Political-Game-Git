import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the opportunistic trait-act table reading", () => {
  it("changes a person's career choice from the recorded tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-opportunistic",
      "career.consider-another-term",
      "session-81-opportunistic-proof",
    );
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
