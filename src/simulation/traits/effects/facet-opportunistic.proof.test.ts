import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the opportunistic difference in a random new game", () => {
  it("changes a career decision for two people who differ only in the trait", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-opportunistic",
      "career.consider-another-term",
      "l1-proof-facet-opportunistic-two-person",
      [],
      "act-pulls",
    );
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("seek");
    expect(proof.low.choice).toBeNull();
    expect(proof.high.reason).toEqual(expect.any(String));
  });
});
