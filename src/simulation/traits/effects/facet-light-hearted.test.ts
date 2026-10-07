import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-light-hearted trait in a random new game", () => {
  it("changes one named person's labor.worker-quit choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-light-hearted",
      "labor.worker-quit",
      "l1-proof-facet-light-hearted",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("continue-work");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
