import { makeIsoDate } from "./dates";
import type { LawInForce } from "./governing/law-in-force";
import type {
  LawConsequenceKind,
  LegacyEffectKind,
  StandingProgramAuthority,
} from "./law-consequence-types";
import type { EntityId, IsoDate } from "./types";

/** Attribution on an actual saved consequence, not a claim that it occurred. */
export interface LawEffectStamp {
  readonly version: "law-effect-stamp/v1";
  /** Exact enacted measure ID or canonical starting-law key; never a new ID. */
  readonly governingLawKey: EntityId;
  readonly source: LawInForce["origin"] | "standing-appropriation";
  readonly standingAuthority?: StandingProgramAuthority;
  readonly effectKind: string;
  readonly questionKey: string | null;
  /** The jurisdiction where the consequence applies, including federal effects. */
  readonly jurisdictionId: EntityId;
  readonly operativeAt: IsoDate;
  readonly appliedAt: IsoDate;
  /** Actual saved chain IDs; names and amounts stay on their existing records. */
  readonly sourceRecordIds?: readonly EntityId[];
}

export interface LawEffectContext {
  readonly effectKind: LawConsequenceKind | LegacyEffectKind;
  readonly questionKey: string | null;
  readonly jurisdictionId: EntityId;
  readonly appliedAt: IsoDate;
  readonly sourceRecordIds?: readonly EntityId[];
}

/** Optional for old saves. Writers own adding this field to their record types. */
export interface LawEffectStampedRecord {
  readonly lawEffectStamps?: readonly LawEffectStamp[];
}

/**
 * Call with the law returned by the existing canonical reader for this place,
 * question and application date. This helper never selects or authorizes a law.
 * Preserve all actor, enrollment, appropriation, payment and service IDs on the
 * saved consequence. Unknown or not-yet-operative law produces no stamp.
 */
export function lawEffectStamp(
  law:
    | Pick<LawInForce, "measureId" | "origin" | "operativeAt">
    | StandingProgramAuthority
    | null,
  context: LawEffectContext,
): LawEffectStamp | null {
  if (!law) return null;
  const standing = "kind" in law ? law : null;
  const measure = "measureId" in law ? law : null;
  const stamp: LawEffectStamp = {
    version: "law-effect-stamp/v1",
    governingLawKey: standing ? standing.appropriationId : measure!.measureId,
    source: standing ? "standing-appropriation" : measure!.origin,
    ...(standing
      ? {
          standingAuthority: {
            ...standing,
            sourceBasis: { ...standing.sourceBasis },
            ...(standing.publicGovernmentIdentity
              ? {
                  publicGovernmentIdentity: {
                    ...standing.publicGovernmentIdentity,
                  },
                }
              : {}),
          },
        }
      : {}),
    effectKind: context.effectKind,
    questionKey: context.questionKey,
    jurisdictionId: context.jurisdictionId,
    operativeAt: standing ? standing.availableFrom : measure!.operativeAt,
    appliedAt: context.appliedAt,
    ...(context.sourceRecordIds === undefined
      ? {}
      : { sourceRecordIds: [...context.sourceRecordIds] }),
  };
  return isLawEffectStamp(stamp) ? stamp : null;
}

/** Shape/date guard for saved records, not evidence that a consequence fired. */
export function isLawEffectStamp(value: unknown): value is LawEffectStamp {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (
    row.version !== "law-effect-stamp/v1" ||
    !nonempty(row.governingLawKey) ||
    (row.source !== "enacted" &&
      row.source !== "in-force-at-start" &&
      row.source !== "standing-appropriation") ||
    !nonempty(row.effectKind) ||
    !validSubject(row) ||
    !nonempty(row.jurisdictionId) ||
    !validDate(row.operativeAt) ||
    !validDate(row.appliedAt) ||
    row.operativeAt > row.appliedAt
  )
    return false;
  const startingKey = row.governingLawKey.startsWith("starting-law:");
  if (startingKey !== (row.source === "in-force-at-start")) return false;
  if (
    row.source !== "standing-appropriation" &&
    row.standingAuthority !== undefined
  )
    return false;
  return (
    row.sourceRecordIds === undefined ||
    (Array.isArray(row.sourceRecordIds) && row.sourceRecordIds.every(nonempty))
  );
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  try {
    makeIsoDate(value);
    return true;
  } catch {
    return false;
  }
}

function validSubject(row: Record<string, unknown>): boolean {
  if (row.source === "standing-appropriation") {
    if (
      row.questionKey !== null ||
      row.ruleAuthority !== undefined ||
      row.effectKind !== "service-delivered"
    )
      return false;
    const authority = row.standingAuthority;
    if (!authority || typeof authority !== "object") return false;
    const ref = authority as Record<string, unknown>;
    const basis = ref.sourceBasis as Record<string, unknown> | undefined;
    return (
      ref.kind === "standing-program-appropriation" &&
      nonempty(ref.appropriationId) &&
      ref.appropriationId === row.governingLawKey &&
      nonempty(ref.programKey) &&
      nonempty(ref.accountOrganizationId) &&
      ref.jurisdictionId === row.jurisdictionId &&
      validDate(ref.availableFrom) &&
      validDate(ref.availableThrough) &&
      ref.availableFrom === row.operativeAt &&
      ref.availableFrom <= ref.availableThrough &&
      validDate(row.appliedAt) &&
      row.appliedAt <= ref.availableThrough &&
      !!basis &&
      basis.kind === "sourced" &&
      nonempty(basis.note) &&
      Array.isArray(row.sourceRecordIds) &&
      row.sourceRecordIds.includes(ref.appropriationId)
    );
  }
  return nonempty(row.questionKey);
}
