import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-teasing trait in a random new game", () => {
  it("changes one named person's contact.answer choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-teasing",
      "contact.answer",
      "session42-proof-facet-teasing",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("counter");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-teasing|people.contact-answer|counter|high",
    );
    expect(proof.low.choice).toBeNull();
  });
});
