import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the opportunistic trait-act table reading", () => {
  it("changes the career choices of two people who differ in the recorded tendency", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-opportunistic",
      "career.consider-another-term",
      "session-81-opportunistic-proof",
      [],
      "act-pulls",
    );
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).not.toBe(proof.high.choice);
  });
});
