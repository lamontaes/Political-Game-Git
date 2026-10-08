import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the method-revision difference in a random new game", () => {
  it("changes one named person's contact.answer choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:method-revision",
      "contact.answer",
      "l1-proof-method-revision",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("accept");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.reason).toBe(
      "personality-v1:method-revision|people.contact-answer|accept|high",
    );
    expect(proof.low.reason).toBe(
      "personality-v1:method-revision|people.contact-answer|decline|low",
    );
  });
});
