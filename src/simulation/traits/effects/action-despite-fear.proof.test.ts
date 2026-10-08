import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the action-despite-fear difference in a random new game", () => {
  it("changes the same choice for two named people who differ only in the trait", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:action-despite-fear",
      "career.consider-another-term",
      "l1-proof-action-despite-fear",
    );
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("seek");
    expect(proof.low.choice).toBe("step-down");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
