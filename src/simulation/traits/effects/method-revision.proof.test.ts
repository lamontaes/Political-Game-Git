import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the method-revision difference in a random new game", () => {
  it("changes contact.answer for two people with matching non-target trait reasons", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:method-revision",
      "contact.answer",
      "l1-proof-method-revision-two-person",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("accept");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
