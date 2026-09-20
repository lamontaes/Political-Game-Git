import {
  selectOpeningRegionalPlate,
  type OpeningRegionalPlateCandidate,
  type OpeningRegionalSceneContext,
} from "./opening-regional-plate";

/** A home town in a state snapshot does not grant statewide image coverage. */
export function selectOpeningRegionalPreview<
  T extends OpeningRegionalPlateCandidate,
>(
  context: OpeningRegionalSceneContext | null,
  beat: "local" | "district" | "state" | null,
  candidates: readonly T[],
): T | null {
  if (!beat) return null;
  const eligible =
    beat === "state"
      ? candidates.filter(
          (candidate) =>
            candidate.coverage.generic === true ||
            (context?.stateJurisdictionKey &&
              candidate.coverage.stateJurisdictionKeys?.includes(
                context.stateJurisdictionKey,
              )),
        )
      : candidates;
  return selectOpeningRegionalPlate(context, eligible);
}

/** A state introduction may illustrate the saved home's region without asserting
 * that the image covers every part of the state. Return all compatible cards in
 * the canonical selector's stable order, preserving its date/geography rules. */
export function openingHomeRegionPreviews<
  T extends OpeningRegionalPlateCandidate,
>(
  context: OpeningRegionalSceneContext | null,
  candidates: readonly T[],
): readonly T[] {
  const remaining = [
    ...new Map(
      candidates.map((candidate) => [candidate.assetId, candidate]),
    ).values(),
  ];
  const result: T[] = [];
  while (remaining.length) {
    const next = selectOpeningRegionalPlate(context, remaining);
    if (!next) break;
    result.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }
  return result;
}

/** Encoded dimensions of an exact owner return, not a native-detail claim.
 * This metadata is available only to the candidate preview consumer. */
export interface OpeningRegionalPreviewCandidate extends OpeningRegionalPlateCandidate {
  readonly previewRaster: {
    readonly width: number;
    readonly height: number;
    readonly hash: string;
    readonly nativeDetailState: "unverified";
  };
}

/** Reviewed geographic eligibility does not grant owner art approval or release. */
export const BANKED_OPENING_REGIONAL_CANDIDATES: readonly OpeningRegionalPreviewCandidate[] =
  [
    {
      assetId: "env_playtest65_pikeville_valley_street_434644_r1",
      coverage: { placeKeys: ["2160852"] },
      months: [5, 6, 7, 8, 9],
      previewRaster: {
        width: 2496,
        height: 1664,
        hash: "2cfa09f644d30749d8a129d7441f9bbde46b0b5875c1e9e8c6a253cd85e5377f",
        nativeDetailState: "unverified",
      },
    },
  ];

/** Exact regional returns received for private review. Native detail remains
 * unverified; the town image is a declared edited derivative in provenance.
 * These eligibility declarations do not assert a particular home or venue. */
export const REGIONAL_TYPE_REVIEW_CANDIDATES: readonly OpeningRegionalPreviewCandidate[] =
  [
    {
      assetId: "env_playtest65_wooded_valley_town_street_cleanup_r2",
      coverage: { regionTypes: ["appalachian-coal-region-town"] },
      months: [5, 6, 7, 8, 9],
      previewRaster: {
        width: 1536,
        height: 1024,
        hash: "85720edf325911f8bbc741c2c88fa8b23cb40ba237e455390f6e4e1341515af0",
        nativeDetailState: "unverified",
      },
    },
    {
      assetId: "env_playtest65_great_plains_pond_r1",
      coverage: { regionTypes: ["great-plains-grassland"] },
      months: [5, 6, 7, 8, 9],
      previewRaster: {
        width: 2496,
        height: 1664,
        hash: "0df680c304a6ae6d0d7a1e7d8dfe43f35a8236ef19f696e191ba3207e98d5814",
        nativeDetailState: "unverified",
      },
    },
  ];

/** Verified private review selection. The consumer still refuses production art. */
export const OPENING_REGIONAL_CANDIDATES: readonly OpeningRegionalPreviewCandidate[] =
  REGIONAL_TYPE_REVIEW_CANDIDATES;
