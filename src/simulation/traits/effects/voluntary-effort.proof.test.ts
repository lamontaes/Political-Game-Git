import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the voluntary-effort difference in a random new game", () => {
  it("changes one named person's labor.worker-quit choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:voluntary-effort",
      "labor.worker-quit",
      "l1-proof-voluntary-effort",
      [],
      "act-pulls",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("continue-work");
    expect(proof.low.choice).toBe("quit");
    expect(proof.high.reason).toBe(
      "personality-v1:voluntary-effort|labor.worker-quit|continue-work|high",
    );
    expect(proof.low.reason).toBe(
      "personality-v1:voluntary-effort|labor.worker-quit|quit|low",
    );
  });
});
