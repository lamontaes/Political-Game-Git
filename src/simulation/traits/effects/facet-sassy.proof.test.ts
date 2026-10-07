import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-sassy difference in a random new game", () => {
  it("changes one named person's press.subject-response choice", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-sassy",
      "press.subject-response",
      "l1-proof-facet-sassy",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("dispute");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
