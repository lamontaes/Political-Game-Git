import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the concern-for-distress difference in a random new game", () => {
  it("changes clemency.petition for two people with matching non-target trait reasons", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:concern-for-distress",
      "clemency.petition",
      "l1-proof-concern-for-distress",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("petition");
    expect(proof.low.choice).toBe("wait");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
