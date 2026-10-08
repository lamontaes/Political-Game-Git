import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

describe("the cocky difference in a random new game", () => {
  it("changes a plea decision for two people who differ only in the trait", () => {
    const proof = proveTwoPersonTraitDifference(
      "personality-v1:facet-cocky",
      "court.plea",
      "t9-proof-facet-cocky-two-person",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.personId).not.toBe(proof.low.personId);
    expect(proof.high.choice).toBe("trial");
    expect(proof.low.choice).toBeNull();
    expect(proof.high.reason).toEqual(expect.any(String));
  });
});
