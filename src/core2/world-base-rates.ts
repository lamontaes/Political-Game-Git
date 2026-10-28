/**
 * Each world's base-rate tables (owner, Oct 27: realistic, not real): one
 * factor per published table (deaths, births, moves), drawn once from the
 * world's seed, that scales the whole table. A base rate checks totals and
 * never picks one actor's outcome; the factor only makes the world's own
 * rates differ from the published ones.
 */
import rates from "./data/world/base-rates.json" with { type: "json" };
import { seededUnit } from "./seeded";

export type BaseRateTable = keyof typeof rates.tables;

const factors = new Map<string, number>();

/** The world's factor for a published base-rate table: between the floor share of its spread and the whole spread away from one. */
export function worldRateFactor(seed: string, table: BaseRateTable): number {
  const key = `${seed}:${table}`;
  let factor = factors.get(key);
  if (factor === undefined) {
    const at = (part: string) =>
      seededUnit(seed, `world-base-rate:${table}:${part}`);
    const floor = rates.floorShare.value;
    const size = floor + (1 - floor) * at("size");
    factor = 1 + (at("sign") < 0.5 ? -1 : 1) * size * rates.tables[table].value;
    factors.set(key, factor);
  }
  return factor;
}
