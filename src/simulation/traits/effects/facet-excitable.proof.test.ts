import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the excitable difference in a random new game", () => {
  it("changes one person's live career choice, with the reason traced to the trait", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-excitable",
      "career.consider-another-term",
      "s15-proof-facet-excitable",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
