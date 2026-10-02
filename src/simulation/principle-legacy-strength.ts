import type { BeliefConviction, World } from "./types";

/** Before continuous strength, these four weights governed principle scores.
 * The readers now multiply strength by four, so this translation preserves
 * an old record's score; it does not form a new principle or draw a value. */
const LEGACY_STRENGTH: Readonly<Record<BeliefConviction, number>> = {
  tentative: 0.25,
  moderate: 0.5,
  strong: 0.75,
  settled: 1,
};

/** Normalize only the absent field in saved principles. Current writers and
 * present-but-invalid values still pass through the strict integrity guard. */
export function restoreLegacyPrincipleStrengths(world: World): World {
  let changed = false;
  const principles = world.history.principles.map((record) => {
    if (
      record === null ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      Object.hasOwn(record, "strength")
    )
      return record;
    if (!Object.hasOwn(LEGACY_STRENGTH, record.conviction)) {
      throw new Error("Legacy principle has an unrecognized conviction.");
    }
    changed = true;
    return { ...record, strength: LEGACY_STRENGTH[record.conviction] };
  });
  return changed
    ? { ...world, history: { ...world.history, principles } }
    : world;
}
