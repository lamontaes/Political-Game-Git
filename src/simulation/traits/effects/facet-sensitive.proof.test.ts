import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the sensitive difference in a random new game", () => {
  it("changes one named person's live press response through the shared act table", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-sensitive",
      "press.subject-response",
      "m4-proof-facet-sensitive",
      [
        {
          stableKey: "press:own-knowledge",
          optionKey: "dispute",
          sourceType: "context:own-knowledge",
          direction: "supports",
          importance: "slight",
          confidence: "high",
          explanation: "The account differs from what the person remembers.",
          sourceRefs: [],
        },
      ],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBe("dispute");
    expect(proof.high.choice).toBe("decline");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-sensitive|press.subject-response|decline|high",
    );
    expect(proof.low.choice).toBe("dispute");
  });
});