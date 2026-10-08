import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the dramatic difference between two people in a random new game", () => {
  it("changes a named person's live press.subject-response choice", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-dramatic",
      "press.subject-response",
      "m4-proof-facet-dramatic-two-person",
      [
        {
          stableKey: "press:own-knowledge",
          optionKey: "decline",
          sourceType: "context:own-knowledge",
          direction: "supports",
          importance: "slight",
          confidence: "high",
          explanation:
            "Saying nothing on the record avoids committing to an account.",
          sourceRefs: [],
        },
      ],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("dispute");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.personId).not.toBe(proof.low.personId);
  });
});
