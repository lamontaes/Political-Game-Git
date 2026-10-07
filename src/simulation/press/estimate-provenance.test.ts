import { describe, expect, it } from "vitest";

import { FINDING_EFFECTS_ESTIMATE, REPEAT_OFFENSE_ESTIMATE } from "./findings";
import { SPENDING_REPORTS_ESTIMATE } from "./spending-reports";

describe("press constants say where they come from", () => {
  for (const [name, table] of [
    ["finding effects", FINDING_EFFECTS_ESTIMATE],
    ["repeat offense", REPEAT_OFFENSE_ESTIMATE],
    ["spending reports", SPENDING_REPORTS_ESTIMATE],
  ] as const)
    it(`${name} are marked estimated with a source`, () => {
      expect(table.provenance).toBe("estimated-from-average");
      expect(table.estimated).toBe(true);
      expect(table.estimatedFrom.length).toBeGreaterThan(10);
    });
});
