import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the ambitious difference in a random new game", () => {
  it("changes one named person's career.consider-another-term choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-ambitious",
      "career.consider-another-term",
      "m2-proof-facet-ambitious",
      [],
      "table",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
