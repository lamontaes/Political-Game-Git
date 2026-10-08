import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the self-conscious difference in a random new game", () => {
  it("changes a reporter's request answer for two people who differ only in the trait", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-self-conscious",
      "press.reporter-request-response",
      "t9-proof-facet-self-conscious-two-person",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("defer");
    expect(proof.low.choice).toBeNull();
    expect(proof.high.reason).toEqual(expect.any(String));
  });
});
