import { createProductionPolicyCatalog } from "./production-catalog";
import { describe, expect, it } from "vitest";
import { POLICY_PACKS, loadedPolicyRegistry } from "./policy-pack-registry";
import { US_POLICY_POSITIONS_PACK } from "./policy-pack-us-policy-positions";
import { COVERAGE_ELIGIBILITY_ROWS } from "./law-consequences/coverage-eligibility-rows";

describe("coverage rows join the existing policy pack", () => {
  it("preserves proposition order and existing consequences while admitting both reviewed rows", () => {
    const pack = POLICY_PACKS.find(
      (entry) => entry.pack === US_POLICY_POSITIONS_PACK.pack,
    )!;
    expect(pack.propositions?.map((row) => row.key)).toEqual(
      US_POLICY_POSITIONS_PACK.propositions?.map((row) => row.key),
    );
    let attached = 0;
    for (const original of US_POLICY_POSITIONS_PACK.propositions ?? []) {
      const row = pack.propositions!.find(
        (entry) => entry.key === original.key,
      )!;
      const consequence = COVERAGE_ELIGIBILITY_ROWS[`${pack.pack}:${row.key}`];
      if (consequence) {
        attached++;
        expect(row.consequences).toEqual([
          ...(original.consequences ?? []),
          consequence,
        ]);
      } else expect(row).toBe(original);
    }
    expect(attached).toBe(2);
    const loaded = loadedPolicyRegistry();
    const savedCatalog = createProductionPolicyCatalog();
    for (const [stableKey, consequence] of Object.entries(
      COVERAGE_ELIGIBILITY_ROWS,
    )) {
      const loadedProposition = loaded.propositions.find(
        (entry) => entry.stableKey === stableKey,
      );
      expect(loadedProposition, stableKey).toBeDefined();
      expect(loadedProposition!.consequences).toContainEqual(consequence);
      const savedProposition = Object.values(savedCatalog.propositions).find(
        (entry) => entry.stableKey === stableKey,
      );
      expect(savedProposition, stableKey).toBeDefined();
      expect(savedProposition!.consequences).toContainEqual(consequence);
    }
  });
});
