import { describe, expect, it } from "vitest";

import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("fair-minded act pulls in a random new game", () => {
  it("changes the same choice between two residents with opposite poles", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-fair-minded",
      "justice.clemency-decision",
      "t9-fair-minded-two-person-proof",
      [
        {
          stableKey: "proof:fair-minded-baseline",
          optionKey: "clemency:grant",
          sourceType: "context:fixture",
          direction: "supports",
          importance: "slight",
          confidence: "medium",
          explanation: "The baseline reason both residents share.",
          sourceRefs: [],
        },
      ],
      "act-pulls",
    );
    process.stderr.write(`T9 PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("HIGH");
    expect(proof.low.choice).toBe("LOW");
  });
});
