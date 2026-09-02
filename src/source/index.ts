/**
 * The shared source substrate.
 *
 * Every source domain in this repository converges on one flow:
 *
 *   OFFICIAL/RAW SOURCE
 *     -> VERSIONED PROVENANCE      (provenance.ts: artifacts, transforms, hashes)
 *     -> NORMALIZED SOURCE RECORD  (per-domain normalizers)
 *     -> DOMAIN QUERY/ADAPTER      (per-domain query modules)
 *     -> OPTIONAL GAMEPLAY CONSUMER
 *
 * Two rules hold across every domain that imports from here:
 *
 *   1. Provider status is not gameplay truth. A bill the provider marks
 *      "passed" is a fact about the provider's record, not an outcome in a
 *      `World`. Nothing in this layer may import simulation state.
 *   2. Missing is not zero. UNKNOWN, NONE, NOT_APPLICABLE, CONFLICTING and
 *      HISTORICAL are distinct and must not be flattened — see
 *      `SourcedValue<T>`.
 */

export {
  parseEmpiricalRecordProvenance,
  parseRawSourceArtifact,
  parseSourceRecordLocator,
  parseTransformationManifest,
  validateEmpiricalRecordProvenance,
  validateRawSourceArtifact,
  validateSourceRecordLocator,
  validateTransformationManifest,
  type EmpiricalProvenanceValidationContext,
  type EmpiricalRecordClassification,
  type EmpiricalRecordProvenance,
  type ProvenanceStatus,
  type RawSourceArtifact,
  type SourceRecordLocator,
  type TransformationManifest,
  type ValidationResult,
} from "./provenance.js";

export { canonicalJsonStringify, computeSha256, sha256Hex } from "./hashing.js";

export {
  assertNotSyntheticPayload,
  assertProductionInputPath,
  isQuarantinedPath,
  QUARANTINED_PATH_SEGMENTS,
  SyntheticInputError,
} from "./production-input-guard.js";

export {
  conflicting,
  isKnown,
  isUnresolved,
  isValidSourceIsoDate,
  known,
  knownValue,
  notApplicable,
  unknown,
  type ConflictingSourceClaim,
  type ConflictingValue,
  type HistoricalValue,
  type KnownValue,
  type NotApplicableValue,
  type ProvenanceRecord,
  type SourceClassification,
  type SourceEntityId,
  type SourceIsoDate,
  type SourcedValue,
  type UnknownValue,
  type ValueState,
} from "./sourced-value.js";
