import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the initial-trust difference in a random new game", () => {
  it("changes one named person's contact.answer choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:initial-trust",
      "contact.answer",
      "l1-proof-initial-trust",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("accept");
    expect(proof.low.choice).toBe("counter");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
