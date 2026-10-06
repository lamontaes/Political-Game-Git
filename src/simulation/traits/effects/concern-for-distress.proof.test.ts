import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the concern-for-distress difference in a random new game", () => {
  it("changes one named person's clemency.petition choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:concern-for-distress",
      "clemency.petition",
      "l1-proof-concern-for-distress",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("petition");
    expect(proof.low.choice).toBe("wait");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
