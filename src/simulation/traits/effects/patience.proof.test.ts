import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the patience difference in a random new game", () => {
  it("changes one named person's labor.worker-quit choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:patience",
      "labor.worker-quit",
      "l1-proof-patience",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("continue-work");
    expect(proof.low.choice).toBe("quit");
    expect(proof.high.reason).toEqual(expect.any(String));
    expect(proof.low.reason).toEqual(expect.any(String));
  });
});
