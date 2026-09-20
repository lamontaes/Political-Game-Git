import type { EntityId, IsoDate } from "../simulation/types";
import { stableHash } from "../simulation/ids";
import { makeIsoDate } from "../simulation/dates";

/** Saved home geography for an illustrative regional beat, not player presence. */
export interface OpeningRegionalSceneContext {
  readonly jurisdictionId: EntityId;
  readonly placeKey: string;
  readonly sourceGeoid: string | null;
  readonly stateJurisdictionKey: string | null;
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
  if (candidate.coverage.placeKeys?.includes(context.placeKey)) return 3;
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
