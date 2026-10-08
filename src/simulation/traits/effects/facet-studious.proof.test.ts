import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the studious difference in a random new game", () => {
  it("changes a plea decision for two people who differ only in the trait", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-studious",
      "court.plea",
      "l1-proof-facet-studious-two-person",
    );
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("trial");
    expect(proof.low.choice).toBeNull();
    expect(proof.high.reason).toEqual(expect.any(String));
  });
});
