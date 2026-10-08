import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the self-confidence act-pull proof", () => {
  it("changes one person's career choice through the shared table", () => {
    const proof = proveTraitDifference(
      "personality-v1:self-confidence",
      "career.consider-another-term",
      "l1-proof-self-confidence",
      [],
      "act-pulls",
    );

    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("seek");
    expect(proof.high.reason).toBe(
      "personality-v1:self-confidence|career.consider-another-term|seek|high",
    );
    expect(proof.low.choice).toBe("step-down");
    expect(proof.low.reason).toBe(
      "personality-v1:self-confidence|career.consider-another-term|step-down|low",
    );
  });
});
