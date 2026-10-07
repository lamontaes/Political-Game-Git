import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("ambition in federal and state candidate decisions", () => {
  it("changes a named person's choice to consider a congressional run", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-ambitious",
      "election.consider-congress-run",
      "t3-proof-congress-run",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("run");
    expect(proof.high.reason).toMatch(/public office/);
    expect(proof.low.choice).not.toBe("run");
  });

  it("changes a named person's choice to consider a state-legislative run", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-ambitious",
      "election.consider-state-legislative-run",
      "t3-proof-state-run",
    );
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
    expect(proof.high.choice).toBe("run");
    expect(proof.high.reason).toMatch(/public office/);
    expect(proof.low.choice).not.toBe("run");
  });
});
