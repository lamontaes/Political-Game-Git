import type { HazardMagnitude } from "./types";

const MAGNITUDE_RANK: Record<HazardMagnitude, number> = {
  minor: 0,
  moderate: 1,
  major: 2,
  catastrophic: 3,
};

/**
 * Whether damage warranted asking for a federal declaration. This is the
 * game's own standard, the one every governor the player does not control
 * already follows (`disaster.ts`): a major or worse event, or a moderate one
 * that destroyed homes.
 */
export function stateRequestWarranted(
  magnitude: HazardMagnitude,
  destroyedHomes: number,
): boolean {
  return (
    MAGNITUDE_RANK[magnitude] >= MAGNITUDE_RANK.major ||
    (magnitude === "moderate" && destroyedHomes > 0)
  );
}

/** The standard a President the player does not control follows. */
export function federalDeclarationWarranted(
  magnitude: HazardMagnitude,
): boolean {
  return MAGNITUDE_RANK[magnitude] >= MAGNITUDE_RANK.major;
}
