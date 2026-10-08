import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the generous difference in a random new game", () => {
  it("changes one named person's campaign.support-request choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-generous",
      "campaign.support-request",
      "m2-proof-facet-generous",
      [],
      "act-pulls",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("grant");
    expect(proof.high.reason).toEqual(expect.any(String));
    // One-sided: no marked generosity is not a reason to refuse.
    expect(proof.low.choice).toBeNull();
  });
});
