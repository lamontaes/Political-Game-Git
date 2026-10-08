import { describe, expect, it } from "vitest";
import { proveTraitDifference } from "./trait-proof-support";

describe("facet-defensive in the shared plea decision", () => {
  it("records a table reason that can outweigh the same small plea preference", () => {
    const proof = proveTraitDifference(
      "personality-v1:facet-defensive",
      "court.plea",
      "h1-defensive-proof",
      [
        {
          stableKey: "proof:plea-offer",
          optionKey: "plead",
          sourceType: "context:plea-offer",
          direction: "supports",
          importance: "slight",
          confidence: "high",
          explanation: "The offer gives the person a reason to plead.",
          sourceRefs: [],
        },
      ],
      true,
    );

    expect(proof.without).toBe("plead");
    expect(proof.high.choice).toBe("trial");
    expect(proof.low.choice).toBe("plead");
    expect(proof.high.reason).toContain(
      "personality-v1:facet-defensive|justice.plea|trial|high",
    );
  });
});
