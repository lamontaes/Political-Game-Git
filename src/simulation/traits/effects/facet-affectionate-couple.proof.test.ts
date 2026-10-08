import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("affection in couple decisions", () => {
  it("changes a named person's answer to becoming a couple", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-affectionate",
      "people.couple-answer",
      "t4-proof-couple-answer",
      [],
      "table",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("accept");
    expect(proof.high.reason).toContain(
      "personality-v1:facet-affectionate|people.couple-answer|",
    );
    expect(proof.low.choice).not.toBe("accept");
  });

  it("changes a named person's choice to stay in an established couple", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-affectionate",
      "people.couple-stage",
      "t4-proof-couple-stage",
      [],
      "table",
      ["stay", "break-up"],
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("stay");
    expect(proof.high.reason).toContain(
      "personality-v1:facet-affectionate|people.couple-stage|",
    );
    expect(proof.low.choice).not.toBe("stay");
  });
});
