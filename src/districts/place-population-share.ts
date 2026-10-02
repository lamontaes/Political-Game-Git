/** Census-tabulated population, not a home coordinate or land-area proxy. */
import generated from "./place-district-population.generated.json" with { type: "json" };
import type { DistrictChamber, DistrictIdentity } from "./types";

interface PopulationCatalog {
  readonly format: string;
  readonly tiePartLandAreas?: Readonly<
    Record<
      string,
      Readonly<
        Record<
          string,
          {
            readonly squareMeters: number;
            readonly sourcePath: string;
            readonly sourceSha256: string;
            readonly sourceRow: number;
            readonly sourceUrl: string;
          }
        >
      >
    >
  >;
  readonly populations: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
}

const catalog = generated as unknown as PopulationCatalog;
if (catalog.format !== "ocd-place-district-population/v1") {
  throw new Error("Unrecognized place-district population source format.");
}

/** Largest recorded population share; ties use recorded place-part land area. */
export function largestPopulationShareDistrict(
  placeGeoid: string,
  chamber: DistrictChamber,
  candidates: readonly DistrictIdentity[],
): {
  readonly identity: DistrictIdentity;
  readonly population: number;
  readonly totalPopulation: number;
  readonly share: number | null;
  readonly tieBreak?: {
    readonly kind: "recorded-part-land-area";
    readonly parts: readonly {
      readonly districtGeoid: string;
      readonly squareMeters: number;
      readonly sourcePath: string;
      readonly sourceSha256: string;
      readonly sourceRow: number;
      readonly sourceUrl: string;
    }[];
  };
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
    if (count > population) {
      identity = candidate;
      population = count;
    }
  }
  if (!identity) return null;
  const tied = candidates.filter(
    (candidate) => counts[candidate.geoid] === population,
  );
  let tieBreak:
    | {
        kind: "recorded-part-land-area";
        parts: {
          districtGeoid: string;
          squareMeters: number;
          sourcePath: string;
          sourceSha256: string;
          sourceRow: number;
          sourceUrl: string;
        }[];
      }
    | undefined;
  if (tied.length > 1) {
    const recordedAreas =
      catalog.tiePartLandAreas?.[`${placeGeoid}:${chamber}`];
    const parts = tied.map((candidate) => ({
      districtGeoid: candidate.geoid,
      ...recordedAreas?.[candidate.geoid],
    }));
    if (
      !parts.every(
        (part) =>
          Number.isSafeInteger(part.squareMeters) &&
          part.squareMeters! >= 0 &&
          part.sourceSha256 &&
          part.sourcePath &&
          part.sourceRow &&
          part.sourceUrl,
      )
    )
      return null;
    const ranked = parts.sort((a, b) => b.squareMeters! - a.squareMeters!);
    if (ranked[0]!.squareMeters === ranked[1]!.squareMeters) return null;
    identity = tied.find(
      (candidate) => candidate.geoid === ranked[0]!.districtGeoid,
    )!;
    tieBreak = {
      kind: "recorded-part-land-area",
      parts: ranked as NonNullable<typeof tieBreak>["parts"],
    };
  }
  return {
    identity,
    population,
    totalPopulation,
    share: totalPopulation === 0 ? 0 : population / totalPopulation,
    ...(tieBreak ? { tieBreak } : {}),
  };
}
