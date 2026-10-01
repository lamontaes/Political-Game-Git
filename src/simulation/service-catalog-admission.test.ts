import { describe, expect, it } from "vitest";
import { POLICY_PACKS, loadedPolicyRegistry } from "./policy-pack-registry";
import { US_POLICY_POSITIONS_PACK } from "./policy-pack-us-policy-positions";
import { SERVICE_DELIVERED_LAW_ROWS } from "./law-consequences/service-delivered-data";
import { createProductionPolicyCatalog } from "./production-catalog";

describe("service rows join the existing policy pack", () => {
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
      const consequence = SERVICE_DELIVERED_LAW_ROWS[`${pack.pack}:${row.key}`];
      if (consequence) {
        attached++;
        expect(row.consequences).toEqual([
          ...(original.consequences ?? []),
          ...consequence,
        ]);
      } else expect(row).toBe(original);
    }
    expect(attached).toBe(2);
    const savedCatalog = createProductionPolicyCatalog();
    for (const [key, rows] of Object.entries(SERVICE_DELIVERED_LAW_ROWS)) {
      const loaded = loadedPolicyRegistry().propositions.find(
        (row) => row.stableKey === key,
      );
      expect(loaded).toBeDefined();
      for (const row of rows) expect(loaded!.consequences).toContainEqual(row);
      const saved = Object.values(savedCatalog.propositions).find(
        (row) => row.stableKey === key,
      );
      expect(saved).toBeDefined();
      for (const row of rows) expect(saved!.consequences).toContainEqual(row);
    }
  });
});
