import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the outward-emotional-display difference in a random new game", () => {
  it("changes one named person's press.reporter-request-response choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:outward-emotional-display",
      "press.reporter-request-response",
      "l1-proof-outward-emotional-display",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("accept");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
