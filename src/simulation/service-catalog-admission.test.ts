import { COVERAGE_ELIGIBILITY_ROWS } from "./law-consequences/coverage-eligibility-rows";
import { describe, expect, it } from "vitest";
import { POLICY_PACKS, loadedPolicyRegistry } from "./policy-pack-registry";
import { US_POLICY_POSITIONS_PACK } from "./policy-pack-us-policy-positions";
import { US_FEDERAL_POSITIONS_PACK } from "./policy-pack-us-federal-positions";
import { SERVICE_DELIVERED_LAW_ROWS } from "./law-consequences/service-delivered-data";
import { createProductionPolicyCatalog } from "./production-catalog";

describe("service rows join the existing policy pack", () => {
  it.each([
    { originalPack: US_POLICY_POSITIONS_PACK, expectedCount: 14 },
    { originalPack: US_FEDERAL_POSITIONS_PACK, expectedCount: 2 },
  ])(
    "preserves $originalPack.pack and admits $expectedCount service rows",
    ({ originalPack, expectedCount }) => {
      const pack = POLICY_PACKS.find(
        (entry) => entry.pack === originalPack.pack,
      )!;
      expect(pack.propositions?.map((row) => row.key)).toEqual(
        originalPack.propositions?.map((row) => row.key),
      );
      let attached = 0;
      for (const original of originalPack.propositions ?? []) {
        const row = pack.propositions!.find(
          (entry) => entry.key === original.key,
        )!;
        const key = `${pack.pack}:${original.key}`;
        const coverage = COVERAGE_ELIGIBILITY_ROWS[key];
        const service = SERVICE_DELIVERED_LAW_ROWS[key] ?? [];
        if (service.length > 0) attached++;
        if (coverage || service.length) {
          expect(row.consequences).toEqual([
            ...(original.consequences ?? []),
            ...(coverage ? [coverage] : []),
            ...service,
          ]);
        } else expect(row).toBe(original);
      }
      expect(attached).toBe(expectedCount);
      const savedCatalog = createProductionPolicyCatalog();
      for (const [key, rows] of Object.entries(SERVICE_DELIVERED_LAW_ROWS)) {
        if (!key.startsWith(`${pack.pack}:`)) continue;
        const loaded = loadedPolicyRegistry().propositions.find(
          (row) => row.stableKey === key,
        );
        expect(loaded).toBeDefined();
        for (const row of rows)
          expect(loaded!.consequences).toContainEqual(row);
        const saved = Object.values(savedCatalog.propositions).find(
          (row) => row.stableKey === key,
        );
        expect(saved).toBeDefined();
        for (const row of rows) expect(saved!.consequences).toContainEqual(row);
      }
    },
  );
});
