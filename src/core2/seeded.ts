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
