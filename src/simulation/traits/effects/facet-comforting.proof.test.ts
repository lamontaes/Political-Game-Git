import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the comforting difference in a random new game", () => {
  it("changes contact.answer for two people with matching non-target trait reasons", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-comforting",
      "contact.answer",
      "m4-proof-facet-comforting",
      [
        {
          stableKey: "proof:shared-context",
          optionKey: "decline",
          sourceType: "context:own-knowledge",
          direction: "supports",
          importance: "slight",
          confidence: "high",
          explanation: "Declining is the quiet default.",
          sourceRefs: [],
        },
      ],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("accept");
    expect(proof.low.choice).toBe("decline");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
