import { describe, expect, it } from "vitest";

import { RECORDED_FINDING_EFFECTS, RECORDED_REPEAT_OFFENSE } from "./findings";
import { RECORDED_SPENDING_REPORTS } from "./spending-reports";

describe("press constants say where they come from", () => {
  for (const [name, table] of [
    ["finding effects", RECORDED_FINDING_EFFECTS],
    ["repeat offense", RECORDED_REPEAT_OFFENSE],
    ["spending reports", RECORDED_SPENDING_REPORTS],
  ] as const)
    it(`${name} are a versioned recorded game rule with a named basis`, () => {
      expect(table.version).toMatch(/-recorded-v\d+$/);
      expect(table.provenance).toMatch(/^recorded-game-rule/);
    });
});
