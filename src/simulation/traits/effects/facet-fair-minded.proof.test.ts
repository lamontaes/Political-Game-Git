import { describe, expect, it } from "vitest";
import { proveTwoPersonTraitDifference } from "./trait-proof-support";

const TRAIT = "personality-v1:facet-fair-minded";

describe("the fair-minded difference in a random new game", () => {
  it.each([
    ["labor.worker-quit", "continue-work"],
    ["justice.clemency-decision", "clemency:deny"],
    ["campaign.support-request", "defer"],
  ])(
    "changes %s between two people alike in every other trait reason",
    (decisionId, pushedOption) => {
      const proof = proveTwoPersonTraitDifference(
        TRAIT,
        decisionId,
        "t9-proof-facet-fair-minded",
        [],
        "act-pulls",
      );
      process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
      expect(proof.high.personId).not.toBe(proof.low.personId);
      expect(proof.high.choice).toBe(pushedOption);
      expect(proof.low.choice).not.toBe(pushedOption);
      expect(proof.high.reason).toContain(TRAIT);
    },
  );
});
