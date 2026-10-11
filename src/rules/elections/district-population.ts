import type { DistrictIdentity } from "../../districts/types";
export function largestPopulationShareDistrict(
  counts: Readonly<Record<string, number>> | undefined,
  candidates: readonly DistrictIdentity[],
): {
  readonly identity: DistrictIdentity;
  readonly population: number;
  readonly totalPopulation: number;
  readonly share: number | null;
} | null {
  if (!counts || candidates.length === 0) return null;
  let identity: DistrictIdentity | null = null;
  let population = -1;
  let totalPopulation = 0;
  for (const candidate of candidates) {
    const count = counts[candidate.geoid];
    if (count === undefined || !Number.isSafeInteger(count) || count < 0)
      throw new Error(`Missing recorded population for ${candidate.recordId}.`);
    totalPopulation += count;
    if (
      count > population ||
      (count === population &&
        identity !== null &&
        candidate.geoid < identity.geoid)
    ) {
      identity = candidate;
      population = count;
    }
  }
  if (!identity) return null;
  return {
    identity,
    population,
    totalPopulation,
    share: totalPopulation === 0 ? null : population / totalPopulation,
  };
}
