import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the truthfulness difference in a random new game", () => {
  it("changes one named person's press.subject-response choice", () => {
    const proof = proveTraitDifference(
      "personality-v1:truthfulness",
      "press.subject-response",
      "l1-proof-truthfulness",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("decline");
    expect(proof.low.choice).toBe("dispute");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
