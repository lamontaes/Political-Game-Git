import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the smug difference in a random new game", () => {
  it("changes one named person's live press response through the shared act table", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-smug",
      "press.subject-response",
      "m4-proof-facet-smug",
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
      "act-pulls",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("decline");
    expect(proof.high.choice).toBe("dispute");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-smug|press.subject-response|dispute|high",
    );
    expect(proof.low.choice).toBe("decline");
  });
});
