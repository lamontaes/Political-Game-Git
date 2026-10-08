import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the playful manner difference in a random new game", () => {
  it("changes one named person's campaign.organizer-outreach choice", () => {
    const proof = proveTraitDifference(
      "personality-v1:playful-manner",
      "campaign.organizer-outreach",
      "l1-proof-playful-manner",
      [],
      "act-pulls",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.without).toBeNull();
    expect(proof.high.choice).not.toBe(proof.low.choice);
    expect(proof.low.choice).toBe("phone-shift");
    expect(proof.high.reason).toBe(
      "personality-v1:playful-manner|campaign.organizer-outreach|candidate-guidance|high",
    );
    expect(proof.low.reason).toBe(
      "personality-v1:playful-manner|campaign.organizer-outreach|phone-shift|low",
    );
  });
});
