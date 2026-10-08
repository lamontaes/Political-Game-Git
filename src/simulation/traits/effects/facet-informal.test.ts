import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-informal trait in a random new game", () => {
  it("changes one named person's contact.answer choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-informal",
      "contact.answer",
      "l1-proof-facet-informal",
      [],
      true,
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("counter");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
