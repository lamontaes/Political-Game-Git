import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the slow-to-warm-up difference in a random new game", () => {
  it("changes one person's live press response, with the reason traced to the trait", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-slow-to-warm-up",
      "press.subject-response",
      "s15-proof-facet-slow-to-warm-up",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
