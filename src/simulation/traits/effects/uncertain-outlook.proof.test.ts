import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the uncertain-outlook difference in a random new game", () => {
  it("changes career.consider-another-term for two people with matching non-target trait reasons", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:uncertain-outlook",
      "career.consider-another-term",
      "l1-proof-uncertain-outlook-two-person",
      [],
      "act-pulls",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("seek");
    expect(proof.low.choice).toBe("step-down");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
