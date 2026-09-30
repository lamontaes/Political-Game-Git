import { makeIsoDate } from "./dates";
import type { LawInForce } from "./governing/law-in-force";
import type { EntityId, IsoDate } from "./types";

/** Attribution on an actual saved consequence, not a claim that it occurred. */
export interface LawEffectStamp {
  readonly version: "law-effect-stamp/v1";
  /** Exact enacted measure ID or canonical starting-law key; never a new ID. */
  readonly governingLawKey: EntityId;
  readonly source: LawInForce["origin"];
  readonly effectKind: string;
  readonly questionKey: string;
  /** The jurisdiction where the consequence applies, including federal effects. */
  readonly jurisdictionId: EntityId;
  readonly operativeAt: IsoDate;
  readonly appliedAt: IsoDate;
  /** Actual saved chain IDs; names and amounts stay on their existing records. */
  readonly sourceRecordIds?: readonly EntityId[];
}

export interface LawEffectContext {
  readonly effectKind: string;
  readonly questionKey: string;
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
  law: LawInForce | null,
  context: LawEffectContext,
): LawEffectStamp | null {
  if (!law) return null;
  const stamp: LawEffectStamp = {
    version: "law-effect-stamp/v1",
    governingLawKey: law.measureId,
    source: law.origin,
    effectKind: context.effectKind,
    questionKey: context.questionKey,
    jurisdictionId: context.jurisdictionId,
    operativeAt: law.operativeAt,
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
    (row.source !== "enacted" && row.source !== "in-force-at-start") ||
    !nonempty(row.effectKind) ||
    !nonempty(row.questionKey) ||
    !nonempty(row.jurisdictionId) ||
    !validDate(row.operativeAt) ||
    !validDate(row.appliedAt) ||
    row.operativeAt > row.appliedAt
  )
    return false;
  const startingKey = row.governingLawKey.startsWith("starting-law:");
  if (startingKey !== (row.source === "in-force-at-start")) return false;
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
