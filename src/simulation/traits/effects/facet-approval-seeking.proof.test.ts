import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the approval-seeking difference in a random new game", () => {
  it("changes one person's live press response, with the reason traced to the trait", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-approval-seeking",
      "press.subject-response",
      "s15-proof-facet-approval-seeking",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("dispute");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBeNull();
  });
});
