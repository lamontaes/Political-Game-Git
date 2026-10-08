import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("the facet-cruel trait in court decisions", () => {
  it.each([
    ["justice.pretrial-detention", "court:hold-before-trial"],
    ["justice.sentence", "court:jail"],
    ["justice.clemency-decision", "clemency:deny"],
  ])("changes a named person's %s choice", (decision, choice) => {
    const proof = proveTraitDifference(
      "personality-v1:facet-cruel",
      decision,
      `t6-proof-${decision}`,
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe(choice);
    expect(proof.high.reason).toMatch(/suffer|punishment|sentence/);
    expect(proof.without).toBeNull();
    expect(proof.low.choice).toBeNull();
  });
});
