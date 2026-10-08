import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the outward-emotional-display difference in a random new game", () => {
  it("changes press.reporter-request-response for two people with matching non-target trait reasons", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:outward-emotional-display",
      "press.reporter-request-response",
      "l1-proof-outward-emotional-display-two-person",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("accept");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
