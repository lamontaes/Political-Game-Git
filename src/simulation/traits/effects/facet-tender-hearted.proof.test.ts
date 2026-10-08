import { describe, expect, it } from "vitest";
import type { DecisionConsideration } from "../../types";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the tender-hearted difference in a random new game", () => {
  it("makes two matched people choose differently on a live contact answer", () => {
    const accept: DecisionConsideration = {
      stableKey: "proof:contact-answer-accept",
      optionKey: "accept",
      sourceType: "context:contact-answer",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "The contact's answer can be accepted.",
      sourceRefs: [],
    };
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-tender-hearted",
      "contact.answer",
      "s52-proof-facet-tender-hearted",
      [accept],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("counter");
    expect(proof.low.choice).toBe("accept");
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.person).toEqual(expect.any(String));
    expect(proof.low.person).toEqual(expect.any(String));
    expect(proof.high.reason).toBe(
      "personality-v1:facet-tender-hearted|people.contact-answer|counter|high",
    );
  });
});
