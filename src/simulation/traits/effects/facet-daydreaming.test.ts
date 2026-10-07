import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-daydreaming trait in a random new game", () => {
  it("changes one named person's labor.worker-quit choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-daydreaming",
      "labor.worker-quit",
      "l1-proof-facet-daydreaming",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("quit");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
