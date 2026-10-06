import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the philanthropic difference in a random new game", () => {
  it("changes one named person's campaign.organizer-outreach choice, with the reason traced to the tendency", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-philanthropic",
      "campaign.organizer-outreach",
      "m2-proof-facet-philanthropic",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).toBe("door-canvass");
    expect(proof.high.reason).toEqual(expect.any(String));
    // One-sided: no marked philanthropy is not a reason to avoid the doors.
    expect(proof.low.choice).toBeNull();
  });
});
