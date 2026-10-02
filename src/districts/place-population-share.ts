/** Census-tabulated population, not a home coordinate or land-area proxy. */
import generated from "./place-district-population.generated.json" with { type: "json" };
import type { DistrictChamber, DistrictIdentity } from "./types";

interface PopulationCatalog {
  readonly format: string;
  readonly populations: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
}

const catalog = generated as unknown as PopulationCatalog;
if (catalog.format !== "ocd-place-district-population/v1") {
  throw new Error("Unrecognized place-district population source format.");
}

/** Largest recorded population share; equal counts use the district GEOID. */
export function largestPopulationShareDistrict(
  placeGeoid: string,
  chamber: DistrictChamber,
  candidates: readonly DistrictIdentity[],
): {
  readonly identity: DistrictIdentity;
  readonly population: number;
  readonly totalPopulation: number;
  readonly share: number | null;
} | null {
  const counts = catalog.populations[`${placeGeoid}:${chamber}`];
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
