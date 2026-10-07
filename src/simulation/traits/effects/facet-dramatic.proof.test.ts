import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the dramatic difference in a random new game", () => {
  it("changes one named person's live press.subject-response choice", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-dramatic",
      "press.subject-response",
      "m4-proof-facet-dramatic",
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
    expect(proof.without).toBe("decline");
    expect(proof.high.choice).toBe("dispute");
    expect(proof.low.choice).toBe("decline");
  });
});
