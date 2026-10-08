import { describe, expect, it } from "vitest";

import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("envious act pulls in a random new game", () => {
  it("changes a mogul's approach between two residents with opposite poles", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-envious",
      "mogul.approach",
      "t9-envious-two-person-proof",
      [
        {
          stableKey: "mogul:community-gift",
          optionKey: "donate",
          sourceType: "context:fixture",
          direction: "supports",
          importance: "slight",
          confidence: "medium",
          explanation: "They want to support the campaign.",
          sourceRefs: [],
        },
      ],
      "act-pulls",
    );
    console.info("T9 facet-envious two-person proof", JSON.stringify(proof));

    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("deal");
    expect(proof.high.reason).toContain(
      "personality-v1:facet-envious|mogul.approach|deal|high",
    );
    expect(proof.low.choice).toBe("donate");
    expect(proof.low.reason).toBe("They want to support the campaign.");
  });
});
