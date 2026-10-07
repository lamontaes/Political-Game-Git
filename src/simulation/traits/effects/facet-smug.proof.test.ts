import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-smug difference in a random new game", () => {
  it("changes one named person's press.reporter-request-response choice", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-smug",
      "press.reporter-request-response",
      "l1-proof-facet-smug",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("accept");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
