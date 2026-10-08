import { describe, expect, it } from "vitest";
import { stateJurisdictionForKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { STATES } from "../state-reference";

const EXPECTED_PERMISSION_ROWS = new Map([
  [
    "us-policy-positions:justice-public-safety.restore-voting-after-sentence",
    ["right-permission:restore-voting-after-sentence"],
  ],
  [
    "us-policy-positions:justice-public-safety.permit-to-carry-concealed",
    ["right-permission:permit-to-carry-concealed"],
  ],
  [
    "us-policy-positions:business-commerce.legalize-cannabis-sales",
    [
      "right-permission:legalize-cannabis-sales",
      "right-permission:legalize-cannabis-sales:retail-opening",
    ],
  ],
]);

describe("shared permission-law data for all 56 state and territory keys", () => {
  const catalog = createProductionPolicyCatalog();

  it.each(Object.keys(STATES).sort())(
    "maps US-%s to the shared permission rows",
    (usps) => {
      const state = stateJurisdictionForKey(`US-${usps}`);
      expect(state, usps).not.toBeNull();
      expect(state?.name, usps).toBe(STATES[usps]!.name);
      expect(state?.provenance.jurisdiction, usps).toBe(state?.id);

      for (const [stableKey, expectedIds] of EXPECTED_PERMISSION_ROWS) {
        const proposition = catalog.propositionOrder
          .map((id) => catalog.propositions[id]!)
          .find((row) => row.stableKey === stableKey);
        expect(proposition, `${usps}: ${stableKey}`).toBeDefined();
        expect(
          proposition!.consequences
            ?.filter((row) => row.kind === "right-permission")
            .map((row) => row.id),
          `${usps}: ${stableKey}`,
        ).toEqual(expectedIds);
      }
    },
  );
});
