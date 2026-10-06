import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the action-despite-fear difference in a random new game", () => {
  it("changes one named person's career.consider-another-term choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:action-despite-fear",
      "career.consider-another-term",
      "l1-proof-action-despite-fear",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("seek");
    expect(proof.low.choice).toBe("step-down");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
