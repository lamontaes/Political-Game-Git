import type { EntityId, IsoDate } from "../simulation/types";
import { stableHash } from "../simulation/ids";
import { makeIsoDate } from "../simulation/dates";

/** Authored illustrative scene taxonomy, not economic or ecological World state. */
export const OPENING_REGION_TYPES = [
  "great-plains-grassland",
  "appalachian-coal-region-town",
  "fishing-coast",
  "beach-coast",
  "northern-california-oak-woodland",
  "southern-california-inland-bungalow",
  "southern-high-plains",
  "trans-pecos-desert-mountain",
  "southern-pine-hardwood",
  "cross-timbers-oak-prairie",
  "northwoods-lake-forest",
  "upper-midwest-tallgrass-prairie",
  "green-mountain-forest",
  "champlain-lake-lowland",
  "pacific-temperate-rainforest",
  "sonoran-desert",
  "colorado-plateau-redrock",
  "rocky-mountain-montane",
  "subtropical-mangrove-wetland",
  "north-atlantic-granite-coast",
  "lower-mississippi-delta-marsh",
  "basalt-coulee-steppe",
] as const;
export type OpeningRegionType = (typeof OPENING_REGION_TYPES)[number];

/** Saved home geography for an illustrative regional beat, not player presence. */
export interface OpeningRegionalSceneContext {
  readonly jurisdictionId: EntityId;
  readonly placeKey: string;
  readonly sourceGeoid: string | null;
  readonly stateJurisdictionKey: string | null;
  /** Explicit reviewed presentation associations; absent means unclassified. */
  readonly regionTypes?: readonly OpeningRegionType[];
  readonly asOf: IsoDate;
  /** Person + beat + place identity. Never history revision or wall-clock time. */
  readonly presentationKey: string;
}

/** Explicit reuse eligibility supplied with art metadata. Reference locations and
 * descriptive/search tags do not grant coverage. Missing coverage is ineligible.
 * Callers pass available candidates; this selector grants no art approval. */
export interface OpeningRegionalPlateCandidate {
  readonly assetId: string;
  readonly coverage: {
    /** Canonical LifePlace keys, not inferred names or nearby counties. */
    readonly placeKeys?: readonly string[];
    readonly stateJurisdictionKeys?: readonly string[];
    readonly regionTypes?: readonly OpeningRegionType[];
    readonly generic?: true;
  };
  /** Omitted means usable year-round; an empty list admits no month. */
  readonly months?: readonly number[];
}

function specificity(
  context: OpeningRegionalSceneContext,
  candidate: OpeningRegionalPlateCandidate,
): number {
  if (!candidate.assetId || !candidate.coverage) return 0;
  const month = Number(context.asOf.slice(5, 7));
  if (
    candidate.months &&
    (candidate.months.some(
      (value) => !Number.isInteger(value) || value < 1 || value > 12,
    ) ||
      !candidate.months.includes(month))
  )
    return 0;
  if (candidate.coverage.placeKeys?.includes(context.placeKey)) return 4;
  if (
    context.regionTypes?.some(
      (type) =>
        OPENING_REGION_TYPES.includes(type) &&
        candidate.coverage.regionTypes?.includes(type),
    )
  )
    return 3;
  if (
    context.stateJurisdictionKey &&
    candidate.coverage.stateJurisdictionKeys?.includes(
      context.stateJurisdictionKey,
    )
  )
    return 2;
  return candidate.coverage.generic === true ? 1 : 0;
}

/** Specific compatible imagery first, a declared generic fallback last. Reordering
 * the same candidate bank or reopening a saved life cannot reroll its choice.
 * A season change may change eligibility, but does not change the identity key. */
export function selectOpeningRegionalPlate<
  T extends OpeningRegionalPlateCandidate,
>(
  context: OpeningRegionalSceneContext | null,
  candidates: readonly T[],
): T | null {
  if (!context) return null;
  try {
    makeIsoDate(context.asOf);
  } catch {
    return null;
  }
  const eligible = candidates.flatMap((candidate) => {
    const rank = specificity(context, candidate);
    return rank
      ? [
          {
            candidate,
            rank,
            tie: stableHash(
              JSON.stringify([context.presentationKey, candidate.assetId]),
            ),
          },
        ]
      : [];
  });
  eligible.sort(
    (a, b) =>
      b.rank - a.rank ||
      (a.tie < b.tie ? -1 : a.tie > b.tie ? 1 : 0) ||
      (a.candidate.assetId < b.candidate.assetId
        ? -1
        : a.candidate.assetId > b.candidate.assetId
          ? 1
          : 0),
  );
  return eligible[0]?.candidate ?? null;
}
