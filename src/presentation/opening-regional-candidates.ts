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
export const OPENING_REGIONAL_CANDIDATES: readonly OpeningRegionalPreviewCandidate[] =
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
