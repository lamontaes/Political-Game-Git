import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the bond-loyalty difference in a random new game", () => {
  it("changes one named person's people.couple-stage choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:bond-loyalty",
      "people.couple-stage",
      "l1-proof-bond-loyalty",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("stay");
    expect(proof.low.choice).toBe("break-up");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
