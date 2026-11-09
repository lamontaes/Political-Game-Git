/** Seeded numbers for generating a world: no imports beyond hashing, so any model can use them without an import cycle. */
import { createHash } from "node:crypto";

/**
 * A number in [0, 1) fixed by the world's seed and a key: generation of who
 * existed, what happened before day one and where a world starts, never a
 * choice in play.
 */
export function seededUnit(seed: string, key: string): number {
  const hex = createHash("sha256").update(`${seed}:${key}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16) / 0x1_0000_0000;
}

/**
 * A unit draw of 52 bits, for a figure printed once for each of many records
 * where two equal values would read as a copy: the 32-bit draw above gives two
 * of 21,000 holders the same winning share about one world in twenty.
 */
export function seededFineUnit(seed: string, key: string): number {
  const hex = createHash("sha256").update(`${seed}:${key}`).digest("hex");
  return parseInt(hex.slice(0, 13), 16) / 0x10_0000_0000_0000;
}
