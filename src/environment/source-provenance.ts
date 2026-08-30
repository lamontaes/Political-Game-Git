/**
 * Pure TypeScript contract and validation foundation for source provenance.
 *
 * This package provides reusable, pure verification primitives for empirical data
 * sources, parser transformation manifests, source record locators, and record-level
 * provenance classifications.
 *
 * It is deliberately isolated from simulation state and player presentation.
 */

export type EmpiricalRecordClassification =
  "empirical" | "synthetic" | "derived";

export type ProvenanceStatus =
  "VERIFIED" | "UNRESOLVED" | "SUSPECT" | "DEPRECATED";

export interface RawSourceArtifact {
  id: string;
  provider: string;
  authoritativeUrl: string;
  retrievedAt: string;
  sourceVintage?: string;
  rawFilename: string;
  byteLength: number;
  sha256: string;
  mimeType?: string;
  licenseOrAttribution?: string;
  retrievalMethod: string;
}

export interface TransformationManifest {
  id: string;
  parserName: string;
  parserVersion: string;
  inputArtifactIds: string[];
  transformationDescription: string;
  outputArtifactHash: string;
  generatedAt: string;
  isDeterministic: boolean;
}

export interface SourceRecordLocator {
  sourceArtifactId: string;
  locator: string;
  providerNativeId?: string;
}

export interface EmpiricalRecordProvenance {
  classification: EmpiricalRecordClassification;
  sourceRecordLocator?: SourceRecordLocator;
  transformationManifestId?: string;
  status: ProvenanceStatus;
  confidence?: string;
  syntheticFixture?: boolean;
  empiricalInputs?: SourceRecordLocator[];
  derivationDescription?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;
const ISO_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const VALID_CLASSIFICATIONS = new Set<EmpiricalRecordClassification>([
  "empirical",
  "synthetic",
  "derived",
]);

const VALID_STATUSES = new Set<ProvenanceStatus>([
  "VERIFIED",
  "UNRESOLVED",
  "SUSPECT",
  "DEPRECATED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidIsoTimestamp(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  if (!ISO_TIMESTAMP_REGEX.test(value)) return false;
  const time = Date.parse(value);
  return !Number.isNaN(time);
}

function validateOptionalNonEmptyString(
  object: Record<string, unknown>,
  field: string,
  path: string,
  errors: string[],
): void {
  if (Object.hasOwn(object, field)) {
    const val = object[field];
    if (val !== undefined && val !== null && !isNonEmptyString(val)) {
      errors.push(`${path}.${field} must be a non-empty string when present.`);
    }
  }
}

/**
 * Validates a RawSourceArtifact according to repository invariants.
 */
export function validateRawSourceArtifact(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ["RawSourceArtifact must be an object."] };
  }

  if (!isNonEmptyString(input.id)) {
    errors.push("RawSourceArtifact.id must be a non-empty string.");
  }

  if (!isNonEmptyString(input.provider)) {
    errors.push("RawSourceArtifact.provider must be a non-empty string.");
  }

  if (!isNonEmptyString(input.authoritativeUrl)) {
    errors.push(
      "RawSourceArtifact.authoritativeUrl must be a non-empty URL string.",
    );
  } else {
    try {
      new URL(input.authoritativeUrl);
    } catch {
      errors.push(
        "RawSourceArtifact.authoritativeUrl must be a valid URL format.",
      );
    }
  }

  if (!isValidIsoTimestamp(input.retrievedAt)) {
    errors.push(
      "RawSourceArtifact.retrievedAt must be a valid ISO 8601 timestamp string representing actual retrieval time.",
    );
  }

  if (Object.hasOwn(input, "sourceVintage")) {
    if (
      input.sourceVintage !== undefined &&
      input.sourceVintage !== null &&
      !isNonEmptyString(input.sourceVintage)
    ) {
      errors.push(
        "RawSourceArtifact.sourceVintage must be a non-empty string if supplied; unknown version must remain unknown/undefined.",
      );
    }
  }

  if (!isNonEmptyString(input.rawFilename)) {
    errors.push("RawSourceArtifact.rawFilename must be a non-empty string.");
  }

  if (
    typeof input.byteLength !== "number" ||
    !Number.isInteger(input.byteLength) ||
    input.byteLength < 0
  ) {
    errors.push(
      "RawSourceArtifact.byteLength must be a non-negative integer number.",
    );
  }

  if (
    typeof input.sha256 !== "string" ||
    !SHA256_HEX_REGEX.test(input.sha256)
  ) {
    errors.push(
      "RawSourceArtifact.sha256 must be a valid 64-character hexadecimal SHA-256 string. Validators cannot silently manufacture a hash.",
    );
  }

  validateOptionalNonEmptyString(
    input,
    "mimeType",
    "RawSourceArtifact",
    errors,
  );
  validateOptionalNonEmptyString(
    input,
    "licenseOrAttribution",
    "RawSourceArtifact",
    errors,
  );

  if (!isNonEmptyString(input.retrievalMethod)) {
    errors.push(
      "RawSourceArtifact.retrievalMethod must be a non-empty string.",
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a TransformationManifest.
 */
export function validateTransformationManifest(
  input: unknown,
): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["TransformationManifest must be an object."],
    };
  }

  if (!isNonEmptyString(input.id)) {
    errors.push("TransformationManifest.id must be a non-empty string.");
  }

  if (!isNonEmptyString(input.parserName)) {
    errors.push(
      "TransformationManifest.parserName must be a non-empty string.",
    );
  }

  if (!isNonEmptyString(input.parserVersion)) {
    errors.push(
      "TransformationManifest.parserVersion must be a non-empty string.",
    );
  }

  if (!Array.isArray(input.inputArtifactIds)) {
    errors.push("TransformationManifest.inputArtifactIds must be an array.");
  } else {
    if (input.inputArtifactIds.length === 0) {
      errors.push(
        "TransformationManifest.inputArtifactIds must contain at least one input artifact ID.",
      );
    }
    input.inputArtifactIds.forEach((id, index) => {
      if (!isNonEmptyString(id)) {
        errors.push(
          `TransformationManifest.inputArtifactIds[${index}] must be a non-empty string.`,
        );
      }
    });
  }

  if (!isNonEmptyString(input.transformationDescription)) {
    errors.push(
      "TransformationManifest.transformationDescription must be a non-empty string.",
    );
  }

  if (!isNonEmptyString(input.outputArtifactHash)) {
    errors.push(
      "TransformationManifest.outputArtifactHash must be a non-empty string.",
    );
  } else if (!SHA256_HEX_REGEX.test(input.outputArtifactHash)) {
    errors.push(
      "TransformationManifest.outputArtifactHash must be a valid 64-character hexadecimal SHA-256 string.",
    );
  }

  if (!isValidIsoTimestamp(input.generatedAt)) {
    errors.push(
      "TransformationManifest.generatedAt must be a valid ISO 8601 timestamp string.",
    );
  }

  if (typeof input.isDeterministic !== "boolean") {
    errors.push(
      "TransformationManifest.isDeterministic must be a boolean flag.",
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a SourceRecordLocator.
 */
export function validateSourceRecordLocator(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ["SourceRecordLocator must be an object."] };
  }

  if (!isNonEmptyString(input.sourceArtifactId)) {
    errors.push(
      "SourceRecordLocator.sourceArtifactId must be a non-empty string.",
    );
  }

  if (!isNonEmptyString(input.locator)) {
    errors.push("SourceRecordLocator.locator must be a non-empty string.");
  }

  validateOptionalNonEmptyString(
    input,
    "providerNativeId",
    "SourceRecordLocator",
    errors,
  );

  return { valid: errors.length === 0, errors };
}

export interface EmpiricalProvenanceValidationContext {
  knownArtifactIds?: ReadonlySet<string>;
  knownManifestIds?: ReadonlySet<string>;
}

/**
 * Validates EmpiricalRecordProvenance and enforces repository invariants:
 * - A record classified `empirical` cannot reference no source artifact.
 * - Synthetic fixtures must be explicitly synthetic (`syntheticFixture === true`).
 * - Derived records must identify their empirical inputs and derivation description.
 * - Source URL alone is not enough to prove a row (must have SourceRecordLocator).
 * - Missing values must remain missing (not coerced to zero/empty).
 */
export function validateEmpiricalRecordProvenance(
  input: unknown,
  context?: EmpiricalProvenanceValidationContext,
): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["EmpiricalRecordProvenance must be an object."],
    };
  }

  if (
    typeof input.classification !== "string" ||
    !VALID_CLASSIFICATIONS.has(
      input.classification as EmpiricalRecordClassification,
    )
  ) {
    errors.push(
      "EmpiricalRecordProvenance.classification must be 'empirical', 'synthetic', or 'derived'.",
    );
    return { valid: false, errors };
  }

  const classification = input.classification as EmpiricalRecordClassification;

  if (
    typeof input.status !== "string" ||
    !VALID_STATUSES.has(input.status as ProvenanceStatus)
  ) {
    errors.push(
      "EmpiricalRecordProvenance.status must be 'VERIFIED', 'UNRESOLVED', 'SUSPECT', or 'DEPRECATED'.",
    );
  }

  validateOptionalNonEmptyString(
    input,
    "confidence",
    "EmpiricalRecordProvenance",
    errors,
  );

  if (input.transformationManifestId !== undefined) {
    if (!isNonEmptyString(input.transformationManifestId)) {
      errors.push(
        "EmpiricalRecordProvenance.transformationManifestId must be a non-empty string when present.",
      );
    } else if (
      context?.knownManifestIds &&
      !context.knownManifestIds.has(input.transformationManifestId)
    ) {
      errors.push(
        `EmpiricalRecordProvenance.transformationManifestId references unknown manifest ID '${input.transformationManifestId}'.`,
      );
    }
  }

  if (classification === "empirical") {
    if (
      input.sourceRecordLocator === undefined ||
      input.sourceRecordLocator === null
    ) {
      errors.push(
        "Invariant Violation: A record classified 'empirical' cannot reference no source artifact. A source record locator is required.",
      );
    } else {
      const locatorResult = validateSourceRecordLocator(
        input.sourceRecordLocator,
      );
      if (!locatorResult.valid) {
        errors.push(
          ...locatorResult.errors.map(
            (err) => `EmpiricalRecordProvenance.sourceRecordLocator: ${err}`,
          ),
        );
      } else {
        const locator = input.sourceRecordLocator as SourceRecordLocator;
        if (
          context?.knownArtifactIds &&
          !context.knownArtifactIds.has(locator.sourceArtifactId)
        ) {
          errors.push(
            `Invariant Violation: Empirical record source artifact ID '${locator.sourceArtifactId}' is not found in known artifact registry.`,
          );
        }
      }
    }

    if (input.syntheticFixture === true) {
      errors.push(
        "Invariant Violation: A record classified 'empirical' cannot be marked syntheticFixture.",
      );
    }
  } else if (classification === "synthetic") {
    if (input.syntheticFixture !== true) {
      errors.push(
        "Invariant Violation: Synthetic fixtures must be explicitly synthetic (syntheticFixture must be true).",
      );
    }
  } else if (classification === "derived") {
    if (
      input.derivationDescription === undefined ||
      !isNonEmptyString(input.derivationDescription)
    ) {
      errors.push(
        "Invariant Violation: Derived records must identify their derivation description (non-empty string required).",
      );
    }

    if (!Array.isArray(input.empiricalInputs)) {
      errors.push(
        "Invariant Violation: Derived records must identify their empirical inputs (non-empty array required).",
      );
    } else if (input.empiricalInputs.length === 0) {
      errors.push(
        "Invariant Violation: Derived records must contain at least one empirical input locator.",
      );
    } else {
      input.empiricalInputs.forEach((item, index) => {
        const itemResult = validateSourceRecordLocator(item);
        if (!itemResult.valid) {
          errors.push(
            ...itemResult.errors.map(
              (err) =>
                `EmpiricalRecordProvenance.empiricalInputs[${index}]: ${err}`,
            ),
          );
        } else if (context?.knownArtifactIds) {
          const loc = item as SourceRecordLocator;
          if (!context.knownArtifactIds.has(loc.sourceArtifactId)) {
            errors.push(
              `Invariant Violation: Derived input[${index}] references unknown source artifact ID '${loc.sourceArtifactId}'.`,
            );
          }
        }
      });
    }

    if (input.syntheticFixture === true) {
      errors.push(
        "Invariant Violation: A record classified 'derived' cannot be marked syntheticFixture.",
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parses and validates a RawSourceArtifact from JSON string or object.
 * Throws an Error with detailed validation messages if invalid.
 */
export function parseRawSourceArtifact(input: unknown): RawSourceArtifact {
  const value =
    typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const validation = validateRawSourceArtifact(value);
  if (!validation.valid) {
    throw new Error(
      `Invalid RawSourceArtifact: ${validation.errors.join("; ")}`,
    );
  }
  return value as RawSourceArtifact;
}

/**
 * Parses and validates a TransformationManifest from JSON string or object.
 */
export function parseTransformationManifest(
  input: unknown,
): TransformationManifest {
  const value =
    typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const validation = validateTransformationManifest(value);
  if (!validation.valid) {
    throw new Error(
      `Invalid TransformationManifest: ${validation.errors.join("; ")}`,
    );
  }
  return value as TransformationManifest;
}

/**
 * Parses and validates a SourceRecordLocator from JSON string or object.
 */
export function parseSourceRecordLocator(input: unknown): SourceRecordLocator {
  const value =
    typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const validation = validateSourceRecordLocator(value);
  if (!validation.valid) {
    throw new Error(
      `Invalid SourceRecordLocator: ${validation.errors.join("; ")}`,
    );
  }
  return value as SourceRecordLocator;
}

/**
 * Parses and validates an EmpiricalRecordProvenance object or JSON string.
 */
export function parseEmpiricalRecordProvenance(
  input: unknown,
  context?: EmpiricalProvenanceValidationContext,
): EmpiricalRecordProvenance {
  const value =
    typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const validation = validateEmpiricalRecordProvenance(value, context);
  if (!validation.valid) {
    throw new Error(
      `Invalid EmpiricalRecordProvenance: ${validation.errors.join("; ")}`,
    );
  }
  return value as EmpiricalRecordProvenance;
}
