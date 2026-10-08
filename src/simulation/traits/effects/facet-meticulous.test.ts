import { describe, expect, it } from "vitest";

import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the meticulous career choice in a random new game", () => {
  it("changes the choice between two residents with opposite recorded poles", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-meticulous",
      "career.consider-another-term",
      "session-80-meticulous-two-person-proof",
      [
        {
          stableKey: "career:leave-office",
          optionKey: "step-down",
          sourceType: "context:fixture",
          direction: "supports",
          importance: "slight",
          confidence: "medium",
          explanation: "They have considered leaving office.",
          sourceRefs: [],
        },
      ],
      "act-pulls",
    );
    console.info("T9 facet-meticulous two-person proof", JSON.stringify(proof));

    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.choice).toBe("step-down");
    expect(proof.low.reason).toBe("They have considered leaving office.");
  });
});
