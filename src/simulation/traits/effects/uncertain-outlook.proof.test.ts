import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the uncertain-outlook difference in a random new game", () => {
  it("changes one named person's career.consider-another-term choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:uncertain-outlook",
      "career.consider-another-term",
      "l1-proof-uncertain-outlook",
      [],
      "act-pulls",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("seek");
    expect(proof.low.choice).toBe("step-down");
    expect(proof.high.reason).toBe(
      "personality-v1:uncertain-outlook|career.consider-another-term|seek|high",
    );
    expect(proof.low.reason).toBe(
      "personality-v1:uncertain-outlook|career.consider-another-term|step-down|low",
    );
  });
});
