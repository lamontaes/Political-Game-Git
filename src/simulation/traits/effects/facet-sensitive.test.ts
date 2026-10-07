import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../life-places";
import { stableHash } from "../../ids";
import type { DecisionConsideration } from "../../types";
import { proveTraitDifference } from "./trait-proof-support";

function seedForJurisdiction(index: number, jurisdictionCount: number): string {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const seed = `s52-proof-facet-sensitive-${attempt}`;
    const candidate =
      parseInt(stableHash(`${seed}-0`).slice(0, 8), 16) % jurisdictionCount;
    if (candidate === index) return seed;
  }
  throw new Error(`Could not seed jurisdiction ${index}.`);
}

describe("the facet-sensitive trait in a random new game", () => {
  it("changes a named person's live press response in all 56 jurisdictions", () => {
    const jurisdictions = lifePlaceStateIdentities();
    expect(jurisdictions).toHaveLength(56);
    const baseline: DecisionConsideration = {
      stableKey: "proof:press-sensitive-question",
      optionKey: "decline",
      sourceType: "context:ordinary-practice",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation:
        "Saying nothing on the record avoids committing to an account.",
      sourceRefs: [],
    };
    for (const [index, jurisdiction] of jurisdictions.entries()) {
      const proof = proveTraitDifference(
        "personality-v1:facet-sensitive",
        "press.subject-response",
        seedForJurisdiction(index, jurisdictions.length),
        [baseline],
      );
      process.stderr.write(`TRAIT PROOF ${JSON.stringify(proof)}\n`);
      expect(proof.place).toContain(`US-${jurisdiction.usps}`);
      expect(proof.without).toBe("decline");
      expect(proof.high.choice).toBe("dispute");
      expect(proof.high.reason).toContain("personally meaningful question");
      expect(proof.low.choice).toBe("decline");
      expect(proof.low.reason).toContain("Saying nothing on the record");
    }
  });
});
