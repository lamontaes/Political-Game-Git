import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the approval-seeking difference in a random new game", () => {
  it("changes a live press response for two people who differ only in the trait", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-approval-seeking",
      "press.subject-response",
      "l1-proof-facet-approval-seeking-two-person",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("dispute");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
