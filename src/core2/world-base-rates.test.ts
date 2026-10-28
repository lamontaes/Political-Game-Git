/**
 * Each world's base-rate tables (owner, Oct 27: "realistic not real"): the
 * death, birth and moving tables are scaled once per world by a factor drawn
 * from its seed, never one, never another world's, and inside its spread.
 */
import { describe, expect, it } from "vitest";
import rates from "./data/world/base-rates.json" with { type: "json" };
import { worldRateFactor, type BaseRateTable } from "./world-base-rates";

const tables = Object.keys(rates.tables) as BaseRateTable[];

describe("each world's base-rate tables", () => {
  it("scales every table off the published one and off another world's, inside its spread", () => {
    for (const table of tables)
      for (let i = 0; i < 50; i++) {
        const a = worldRateFactor(`world-${i}`, table);
        const b = worldRateFactor(`other-${i}`, table);
        const spread = rates.tables[table].value;
        expect(a, `${table} ${i}`).not.toBe(1);
        expect(a, `${table} ${i}`).not.toBe(b);
        expect(Math.abs(a - 1), table).toBeGreaterThanOrEqual(
          rates.floorShare.value * spread - 1e-12,
        );
        expect(Math.abs(a - 1), table).toBeLessThanOrEqual(spread + 1e-12);
      }
  });
  it("gives a world the same factor every time it asks", () => {
    for (const table of tables)
      expect(worldRateFactor("world-a", table)).toBe(
        worldRateFactor("world-a", table),
      );
  });
});
