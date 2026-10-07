import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("philanthropy in an individual campaign donor ask", () => {
  it("changes a named person's choice to give", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-philanthropic",
      "campaign.donor-ask",
      "t3-proof-campaign-donor",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("give");
    expect(proof.high.reason).toMatch(/material support/);
    expect(proof.low.choice).not.toBe("give");
  });
});
