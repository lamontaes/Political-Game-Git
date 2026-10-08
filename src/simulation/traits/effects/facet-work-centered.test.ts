import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-work-centered trait in a random new game", () => {
  it("changes one named person's labor.worker-quit choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-work-centered",
      "labor.worker-quit",
      "l1-proof-facet-work-centered",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("continue-work");
    expect(proof.high.reason).toBe(
      "personality-v1:facet-work-centered|labor.worker-quit|continue-work|high",
    );
    expect(proof.low.choice).toBeNull();
  });
});
