import { describe, expect, it } from "vitest";
import { createProductionPolicyCatalog } from "../production-catalog";

const expected = new Map([
  [
    "us-policy-positions:justice-public-safety.restore-voting-after-sentence",
    ["right-permission"],
  ],
  [
    "us-policy-positions:justice-public-safety.permit-to-carry-concealed",
    ["right-permission"],
  ],
  [
    "us-policy-positions:business-commerce.legalize-cannabis-sales",
    ["right-permission"],
  ],
  [
    "us-policy-positions:labor-workforce.raise-minimum-wage",
    ["institution-rule"],
  ],
  [
    "us-policy-positions:government-operations.legislative-term-limits",
    ["institution-rule", "institution-rule"],
  ],
]);

describe("the previously unused policy consequence kinds", () => {
  it("attaches the registered rights and institution rows to their policy questions", () => {
    const catalog = createProductionPolicyCatalog();
    for (const [stableKey, kinds] of expected) {
      const proposition = Object.values(catalog.propositions).find(
        (row) => row.stableKey === stableKey,
      );
      expect(proposition, stableKey).toBeDefined();
      expect(proposition!.consequences?.map((row) => row.kind)).toEqual(
        expect.arrayContaining(kinds),
      );
    }
  });
});
