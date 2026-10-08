import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the meticulous trait-act table reading", () => {
  it("changes a person's career choice from the recorded tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-meticulous",
      "career.consider-another-term",
      "session-80-meticulous-proof",
    );
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
