/**
 * Each world's base-rate tables (owner, Oct 27: "realistic not real"): the
 * death, birth, moving, chronic-condition and time-use tables are scaled once
 * per world by a factor drawn from its seed, never one, never another world's,
 * and inside its spread.
 */
import { describe, expect, it } from "vitest";
import { parameter as p } from "./parameters";
import {
  BASE_RATE_TABLES,
  baseRateSpreadRow,
  worldRateFactor,
} from "./world-base-rates";

describe("each world's base-rate tables", () => {
  it("scales every table off the published one and off another world's, inside its spread", () => {
    for (const table of BASE_RATE_TABLES)
      for (let i = 0; i < 50; i++) {
        const a = worldRateFactor(`world-${i}`, table);
        const b = worldRateFactor(`other-${i}`, table);
        const spread = p(baseRateSpreadRow(table));
        expect(a, `${table} ${i}`).not.toBe(1);
        expect(a, `${table} ${i}`).not.toBe(b);
        expect(Math.abs(a - 1), table).toBeGreaterThanOrEqual(
          p("worldDrawOffsetFloorShare") * spread - 1e-12,
        );
        expect(Math.abs(a - 1), table).toBeLessThanOrEqual(spread + 1e-12);
      }
  });
  it("gives a world the same factor every time it asks", () => {
    for (const table of BASE_RATE_TABLES)
      expect(worldRateFactor("world-a", table)).toBe(
        worldRateFactor("world-a", table),
      );
  });
});
