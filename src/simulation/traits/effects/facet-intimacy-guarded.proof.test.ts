import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the intimacy-guarded trait in a random new game", () => {
  it("changes the answer of one person in a relationship with another person, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-intimacy-guarded",
      "people.couple-answer",
      "t9-facet-intimacy-guarded-two-person-proof",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
