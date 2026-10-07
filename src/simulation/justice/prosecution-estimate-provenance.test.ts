import { describe, expect, it } from "vitest";

import { JAIL_EFFECTS_ESTIMATE, PROSECUTION_ESTIMATE } from "./prosecution";

describe("prosecution values say where they come from", () => {
  for (const [name, table] of [
    ["case timings", PROSECUTION_ESTIMATE],
    ["jail effects", JAIL_EFFECTS_ESTIMATE],
  ] as const)
    it(`the ${name} are marked estimated with a source`, () => {
      expect(table.provenance).toBe("estimated-from-average");
      expect(table.estimated).toBe(true);
      expect(table.estimatedFrom.length).toBeGreaterThan(10);
    });
});
