import { makeIsoDate } from "./dates";
import type { LawInForce } from "./governing/law-in-force";
import type {
  LawConsequenceKind,
  LegacyEffectKind,
  LawTermApplicability,
  LawTermScope,
  LawTermResolutionProvenance,
  StandingProgramAuthority,
} from "./law-consequence-types";
import {
  LAW_AMOUNT_UNITS,
  comparableAmountApplicabilityKey,
  lawTermScopeKey,
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
  /** Present only for a real enacted rule with no policy question. */
  readonly ruleAuthority?: {
    readonly ruleChangeProvisionId: EntityId;
    readonly enactmentId: EntityId;
    readonly field: string;
  };
  /** The jurisdiction where the consequence applies, including federal effects. */
  readonly jurisdictionId: EntityId;
  readonly operativeAt: IsoDate;
  readonly appliedAt: IsoDate;
  /** Actual saved chain IDs; names and amounts stay on their existing records. */
  readonly sourceRecordIds?: readonly EntityId[];
  /** Term-level source/model resolution, kept in developer trace fields. */
  readonly termResolution?: LawTermResolutionProvenance;
}

export interface LawEffectContext {
  readonly effectKind: LawConsequenceKind | LegacyEffectKind;
  readonly questionKey: string | null;
  /** Present only for a real enacted rule with no policy question. */
  readonly ruleAuthority?: {
    readonly ruleChangeProvisionId: EntityId;
    readonly enactmentId: EntityId;
    readonly field: string;
  };
  readonly jurisdictionId: EntityId;
  readonly appliedAt: IsoDate;
  readonly sourceRecordIds?: readonly EntityId[];
  readonly termResolution?: LawTermResolutionProvenance;
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
    ...(context.ruleAuthority
      ? { ruleAuthority: { ...context.ruleAuthority } }
      : {}),
    jurisdictionId: context.jurisdictionId,
    operativeAt: standing ? standing.availableFrom : measure!.operativeAt,
    appliedAt: context.appliedAt,
    ...(context.sourceRecordIds === undefined
      ? {}
      : { sourceRecordIds: [...context.sourceRecordIds] }),
    ...(context.termResolution === undefined
      ? {}
      : { termResolution: cloneTermResolution(context.termResolution) }),
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
    row.operativeAt > row.appliedAt ||
    (row.termResolution !== undefined &&
      !isLawTermResolutionProvenance(row.termResolution))
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

/** Deep clone the shared saved term trace; no consumer-specific wrapper type. */
export function cloneTermResolution(
  resolution: LawTermResolutionProvenance,
): LawTermResolutionProvenance {
  if (resolution.kind === "source")
    return {
      ...resolution,
      ...(resolution.scope ? { scope: structuredClone(resolution.scope) } : {}),
      ...(resolution.applicability
        ? { applicability: structuredClone(resolution.applicability) }
        : {}),
    };
  return {
    ...resolution,
    ...(resolution.scope ? { scope: structuredClone(resolution.scope) } : {}),
    ...(resolution.applicability
      ? { applicability: structuredClone(resolution.applicability) }
      : {}),
    estimate: {
      ...resolution.estimate,
      donors: resolution.estimate.donors.map((donor) => ({
        ...donor,
        sourceRecordIds: [...donor.sourceRecordIds],
      })),
      donorReferences: [...resolution.estimate.donorReferences],
    },
  };
}

export function isLawTermResolutionProvenance(
  value: unknown,
): value is LawTermResolutionProvenance {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const nonempty = (item: unknown): item is string =>
    typeof item === "string" && item.trim().length > 0;
  const finite = (item: unknown): item is number =>
    typeof item === "number" && Number.isFinite(item);
  if (
    !nonempty(row.termKey) ||
    !finite(row.value) ||
    !validDate(row.requestedAt) ||
    !LAW_AMOUNT_UNITS.includes(row.unit as (typeof LAW_AMOUNT_UNITS)[number]) ||
    (row.scope !== undefined &&
      lawTermScopeKey(row.scope as LawTermScope) === null) ||
    (row.applicability !== undefined &&
      comparableAmountApplicabilityKey(
        row.applicability as LawTermApplicability,
      ) === null)
  )
    return false;
  if (row.kind === "source")
    return (
      Object.keys(row).every((key) =>
        [
          "kind",
          "termKey",
          "value",
          "unit",
          "requestedAt",
          "lawMeasureId",
          "sourceRecordIds",
          "scope",
          "applicability",
        ].includes(key),
      ) &&
      nonempty(row.lawMeasureId) &&
      Array.isArray(row.sourceRecordIds) &&
      row.sourceRecordIds.every(nonempty)
    );
  if (
    row.kind !== "modeled" ||
    !row.estimate ||
    typeof row.estimate !== "object"
  )
    return false;
  const estimate = row.estimate as Record<string, unknown>;
  if (
    !Object.keys(row).every((key) =>
      [
        "kind",
        "termKey",
        "value",
        "unit",
        "requestedAt",
        "scope",
        "applicability",
        "estimate",
      ].includes(key),
    ) ||
    !Object.keys(estimate).every((key) =>
      [
        "methodKey",
        "mean",
        "spread",
        "selectedDonorValue",
        "selectionKey",
        "worldSeed",
        "donors",
        "donorReferences",
      ].includes(key),
    ) ||
    !nonempty(estimate.methodKey) ||
    !finite(estimate.mean) ||
    !(
      estimate.spread === null ||
      (finite(estimate.spread) && estimate.spread >= 0)
    ) ||
    !finite(estimate.selectedDonorValue) ||
    !(estimate.selectionKey === null || nonempty(estimate.selectionKey)) ||
    !(estimate.worldSeed === null || nonempty(estimate.worldSeed)) ||
    !Array.isArray(estimate.donors) ||
    !Array.isArray(estimate.donorReferences) ||
    estimate.donorReferences.some((reference) => !nonempty(reference)) ||
    (estimate.donors.length === 0 && estimate.donorReferences.length === 0)
  )
    return false;
  return estimate.donors.every((candidate) => {
    if (candidate === null || typeof candidate !== "object") return false;
    const donor = candidate as Record<string, unknown>;
    return (
      Object.keys(donor).every((key) =>
        [
          "placeKey",
          "lawMeasureId",
          "sourceRecordIds",
          "value",
          "unit",
          "region",
        ].includes(key),
      ) &&
      nonempty(donor.placeKey) &&
      nonempty(donor.lawMeasureId) &&
      Array.isArray(donor.sourceRecordIds) &&
      donor.sourceRecordIds.every(nonempty) &&
      finite(donor.value) &&
      donor.unit === row.unit &&
      ["northeast", "midwest", "south", "west"].includes(donor.region as string)
    );
  });
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
  if (nonempty(row.questionKey)) return row.ruleAuthority === undefined;
  if (
    row.questionKey !== null ||
    row.source !== "enacted" ||
    row.effectKind !== "pay"
  )
    return false;
  const authority = row.ruleAuthority;
  if (!authority || typeof authority !== "object") return false;
  const ref = authority as Record<string, unknown>;
  return (
    nonempty(ref.ruleChangeProvisionId) &&
    nonempty(ref.enactmentId) &&
    nonempty(ref.field) &&
    Array.isArray(row.sourceRecordIds) &&
    row.sourceRecordIds.includes(ref.ruleChangeProvisionId) &&
    row.sourceRecordIds.includes(ref.enactmentId)
  );
}
