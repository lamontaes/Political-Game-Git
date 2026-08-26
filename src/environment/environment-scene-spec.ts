/**
 * Runtime-safe contract for researched physical environments.
 *
 * This module deliberately remains independent of simulation behavior. It
 * records what the available evidence supports, including explicit unknowns,
 * without turning missing or unresolved measurements into numeric values.
 */

export type GeometryAuthorityGrade = "G0" | "G1" | "G2" | "G3" | "G4" | "G5";
export type FidelityTier = "F1" | "F2" | "F3" | "F4";

export type TemporalState =
  | "CURRENT_VERIFIED"
  | "STABLE_RECONCILED"
  | "PRE_CHANGE_DELTA_REQUIRED"
  | "EFFECTIVE_DATE_UNCERTAIN"
  | "HISTORICAL_VERSION_ONLY";

export interface TemporalEvidence {
  state: TemporalState;
  effective_date?: string;
  notes?: string;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface CalibrationResolved {
  state: "resolved";
  evidence_identifier: string;
  source_sheet_identifier?: string;
  pixel_points?: PixelPoint[];
  pixel_span?: number;
  reference_dimension: number;
  units: string;
  evidence_reference_linkage: string[];
  method_note?: string;
}

export interface CalibrationUnresolved {
  state: "unresolved" | "uncertain";
  reason?: string;
}

export type CalibrationEvidence = CalibrationResolved | CalibrationUnresolved;

export interface ScaleEvidence {
  printed_scale?: string;
  source_sheet?: string;
  calibration?: CalibrationEvidence;
  units?: string;
  state: "known" | "unresolved" | "conflicting" | "unsupported";
}

export type MeasurementConfidence =
  | "exact"
  | "plan-derived"
  | "specified"
  | "bounded-estimate"
  | "visual-estimate";

export interface KnownMeasurement {
  value: number;
  unit: string;
  confidence: MeasurementConfidence;
  provenance_refs?: string[];
  state?: never;
}

export interface UnknownMeasurement {
  state: "unknown" | "unreadable" | "contradictory" | "unsupported";
  reason?: string;
  value?: never;
  unit?: never;
  confidence?: never;
  provenance_refs?: never;
}

export type MeasurementValue = KnownMeasurement | UnknownMeasurement;

export type ResidualState = "PASS" | "FAIL" | "BLOCKED" | "UNRESOLVED";

export interface DimensionalResidualCheck {
  what_was_compared: string;
  expected_reference_dimension?: MeasurementValue;
  observed_derived_dimension?: MeasurementValue;
  residual_error?: number;
  units?: string;
  tolerance_basis?: string;
  state: ResidualState;
  blocking_reason?: string;
}

export interface SourceEvidence {
  id: string;
  source_type: string;
  authority_class?: string;
}

export interface SceneFeature {
  id: string;
  type: string;
  geometry_grade: GeometryAuthorityGrade;
  provenance_refs?: string[];
  dimensions?: Record<string, MeasurementValue>;
}

export interface Zone {
  id: string;
  type: string;
}

export interface Camera {
  id: string;
  target_zone_id?: string;
}

export interface Anchor {
  id: string;
  type: string;
}

export interface Occluder {
  id: string;
  type: string;
}

export interface EnvironmentSceneSpec {
  environment_id: string;
  building_id?: string;
  effective_version?: TemporalEvidence;
  coordinate_system?: string;
  units?: string;
  scale_evidence?: ScaleEvidence;
  fidelity_tier: FidelityTier;

  sources?: SourceEvidence[];
  room_outline?: SceneFeature[];
  walls?: SceneFeature[];
  doors_openings?: SceneFeature[];
  levels_steps?: SceneFeature[];
  ceiling_profile?: SceneFeature[];
  fixed_architectural_geometry?: SceneFeature[];
  fixed_furniture?: SceneFeature[];
  gallery_relationships?: SceneFeature[];
  foreground_occlusion_objects?: Occluder[];

  zones?: Zone[];
  cameras?: Camera[];
  anchors?: Anchor[];

  residuals?: DimensionalResidualCheck[];
  unresolved_conflicts?: string[];
  explicit_unknowns?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const GEOMETRY_AUTHORITY_GRADES = new Set<GeometryAuthorityGrade>([
  "G0",
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
]);
const FIDELITY_TIERS = new Set<FidelityTier>(["F1", "F2", "F3", "F4"]);
const MEASUREMENT_CONFIDENCES = new Set<MeasurementConfidence>([
  "exact",
  "plan-derived",
  "specified",
  "bounded-estimate",
  "visual-estimate",
]);
const UNKNOWN_MEASUREMENT_STATES = new Set<UnknownMeasurement["state"]>([
  "unknown",
  "unreadable",
  "contradictory",
  "unsupported",
]);
const TEMPORAL_STATES = new Set<TemporalState>([
  "CURRENT_VERIFIED",
  "STABLE_RECONCILED",
  "PRE_CHANGE_DELTA_REQUIRED",
  "EFFECTIVE_DATE_UNCERTAIN",
  "HISTORICAL_VERSION_ONLY",
]);
const SCALE_STATES = new Set<ScaleEvidence["state"]>([
  "known",
  "unresolved",
  "conflicting",
  "unsupported",
]);
const CALIBRATION_STATES = new Set<CalibrationEvidence["state"]>([
  "resolved",
  "unresolved",
  "uncertain",
]);
const RESIDUAL_STATES = new Set<ResidualState>([
  "PASS",
  "FAIL",
  "BLOCKED",
  "UNRESOLVED",
]);

const FEATURE_ARRAY_FIELDS = [
  "room_outline",
  "walls",
  "doors_openings",
  "levels_steps",
  "ceiling_profile",
  "fixed_architectural_geometry",
  "fixed_furniture",
  "gallery_relationships",
] as const;

const TOP_LEVEL_IDENTITY_ARRAY_FIELDS = new Set([
  "sources",
  "zones",
  "cameras",
  "anchors",
  "foreground_occlusion_objects",
]);

const UNORDERED_REFERENCE_ARRAY_FIELDS = new Set([
  "provenance_refs",
  "evidence_reference_linkage",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function describeValue(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number")
    return Number.isNaN(value) ? "NaN" : `${value}`;
  if (typeof value === "boolean" || typeof value === "undefined") {
    return `${value}`;
  }
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return "symbol";
  if (typeof value === "function") return "function";
  return "object";
}

function validateOptionalNonEmptyString(
  object: Record<string, unknown>,
  field: string,
  path: string,
  errors: string[],
): void {
  if (object[field] !== undefined && !isNonEmptyString(object[field])) {
    errors.push(`${path}.${field} must be a non-empty string when present.`);
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  errors: string[],
  options: { sourceIds?: ReadonlySet<string>; requireNonEmpty?: boolean } = {},
): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  if (options.requireNonEmpty && value.length === 0) {
    errors.push(`${path} must contain at least one reference.`);
  }
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isNonEmptyString(entry)) {
      errors.push(`${entryPath} must be a non-empty string.`);
    } else if (options.sourceIds && !options.sourceIds.has(entry)) {
      errors.push(`${entryPath} references unknown source ID '${entry}'.`);
    }
  });
}

function validateMeasurement(
  value: unknown,
  path: string,
  sourceIds: ReadonlySet<string>,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be a measurement object.`);
    return;
  }

  const hasKnownDiscriminator = Object.hasOwn(value, "value");
  const hasUnknownDiscriminator = Object.hasOwn(value, "state");
  if (hasKnownDiscriminator && hasUnknownDiscriminator) {
    errors.push(
      `${path} cannot contain both known 'value' and unknown 'state' discriminators.`,
    );
    return;
  }

  if (hasKnownDiscriminator) {
    if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
      errors.push(`${path}.value must be a finite number.`);
    }
    if (!isNonEmptyString(value.unit)) {
      errors.push(`${path}.unit must be a non-empty string.`);
    }
    if (
      typeof value.confidence !== "string" ||
      !MEASUREMENT_CONFIDENCES.has(value.confidence as MeasurementConfidence)
    ) {
      errors.push(
        `${path}.confidence has invalid value ${describeValue(value.confidence)}.`,
      );
    }
    if (value.provenance_refs !== undefined) {
      validateStringArray(
        value.provenance_refs,
        `${path}.provenance_refs`,
        errors,
        {
          sourceIds,
        },
      );
    }
    return;
  }

  if (hasUnknownDiscriminator) {
    if (
      typeof value.state !== "string" ||
      !UNKNOWN_MEASUREMENT_STATES.has(
        value.state as UnknownMeasurement["state"],
      )
    ) {
      errors.push(
        `${path}.state has invalid value ${describeValue(value.state)}.`,
      );
    }
    for (const forbiddenField of [
      "value",
      "unit",
      "confidence",
      "provenance_refs",
    ]) {
      if (Object.hasOwn(value, forbiddenField)) {
        errors.push(
          `${path} unknown measurement cannot contain '${forbiddenField}'.`,
        );
      }
    }
    validateOptionalNonEmptyString(value, "reason", path, errors);
    return;
  }

  errors.push(
    `${path} must contain either a known 'value' or an explicit unknown 'state'.`,
  );
}

function validateSourceReferences(
  value: unknown,
  path: string,
  sourceIds: ReadonlySet<string>,
  errors: string[],
): void {
  validateStringArray(value, path, errors, { sourceIds });
}

function validateSources(
  value: unknown,
  sourceIds: Set<string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push("sources must be an array when present.");
    return;
  }

  value.forEach((entry, index) => {
    const path = `sources[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!isNonEmptyString(entry.id)) {
      errors.push(`${path}.id must be a non-empty string.`);
    } else if (sourceIds.has(entry.id)) {
      errors.push(`Duplicate source ID '${entry.id}'.`);
    } else {
      sourceIds.add(entry.id);
    }
    if (!isNonEmptyString(entry.source_type)) {
      errors.push(`${path}.source_type must be a non-empty string.`);
    }
    validateOptionalNonEmptyString(entry, "authority_class", path, errors);
  });
}

function registerSceneId(
  id: unknown,
  path: string,
  sceneIds: Map<string, string>,
  errors: string[],
): id is string {
  if (!isNonEmptyString(id)) {
    errors.push(`${path}.id must be a non-empty string.`);
    return false;
  }
  const priorPath = sceneIds.get(id);
  if (priorPath) {
    errors.push(
      `Duplicate scene ID '${id}' at ${path}; first used at ${priorPath}.`,
    );
    return false;
  }
  sceneIds.set(id, path);
  return true;
}

function validateFeatures(
  value: unknown,
  field: (typeof FEATURE_ARRAY_FIELDS)[number],
  sceneIds: Map<string, string>,
  sourceIds: ReadonlySet<string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array when present.`);
    return;
  }

  value.forEach((entry, index) => {
    const path = `${field}[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    registerSceneId(entry.id, path, sceneIds, errors);
    validateOptionalNonEmptyString(entry, "type", path, errors);
    if (entry.type === undefined) {
      errors.push(`${path}.type is required.`);
    }
    if (
      typeof entry.geometry_grade !== "string" ||
      !GEOMETRY_AUTHORITY_GRADES.has(
        entry.geometry_grade as GeometryAuthorityGrade,
      )
    ) {
      errors.push(
        `${path}.geometry_grade has invalid value ${describeValue(entry.geometry_grade)}.`,
      );
    }
    if (entry.provenance_refs !== undefined) {
      validateSourceReferences(
        entry.provenance_refs,
        `${path}.provenance_refs`,
        sourceIds,
        errors,
      );
    }
    if (entry.dimensions !== undefined) {
      if (!isRecord(entry.dimensions)) {
        errors.push(`${path}.dimensions must be an object when present.`);
      } else {
        for (const [dimensionName, measurement] of Object.entries(
          entry.dimensions,
        )) {
          if (dimensionName.trim().length === 0) {
            errors.push(`${path}.dimensions contains an empty dimension name.`);
          }
          validateMeasurement(
            measurement,
            `${path}.dimensions.${dimensionName}`,
            sourceIds,
            errors,
          );
        }
      }
    }
  });
}

function validateZones(
  value: unknown,
  sceneIds: Map<string, string>,
  zoneIds: Set<string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push("zones must be an array when present.");
    return;
  }
  value.forEach((entry, index) => {
    const path = `zones[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (registerSceneId(entry.id, path, sceneIds, errors)) {
      zoneIds.add(entry.id);
    }
    validateOptionalNonEmptyString(entry, "type", path, errors);
    if (entry.type === undefined) errors.push(`${path}.type is required.`);
  });
}

function validateCameras(
  value: unknown,
  sceneIds: Map<string, string>,
  zoneIds: ReadonlySet<string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push("cameras must be an array when present.");
    return;
  }
  value.forEach((entry, index) => {
    const path = `cameras[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    registerSceneId(entry.id, path, sceneIds, errors);
    if (entry.target_zone_id !== undefined) {
      if (!isNonEmptyString(entry.target_zone_id)) {
        errors.push(`${path}.target_zone_id must be a non-empty string.`);
      } else if (!zoneIds.has(entry.target_zone_id)) {
        errors.push(
          `${path}.target_zone_id references unknown zone ID '${entry.target_zone_id}'.`,
        );
      }
    }
  });
}

function validateTypedIdentityArray(
  value: unknown,
  field: "anchors" | "foreground_occlusion_objects",
  sceneIds: Map<string, string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array when present.`);
    return;
  }
  value.forEach((entry, index) => {
    const path = `${field}[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    registerSceneId(entry.id, path, sceneIds, errors);
    validateOptionalNonEmptyString(entry, "type", path, errors);
    if (entry.type === undefined) errors.push(`${path}.type is required.`);
  });
}

function validateCalibration(
  value: unknown,
  sourceIds: ReadonlySet<string>,
  errors: string[],
): void {
  const path = "scale_evidence.calibration";
  if (!isRecord(value)) {
    errors.push(`${path} must be an object when present.`);
    return;
  }
  if (
    typeof value.state !== "string" ||
    !CALIBRATION_STATES.has(value.state as CalibrationEvidence["state"])
  ) {
    errors.push(
      `${path}.state has invalid value ${describeValue(value.state)}.`,
    );
    return;
  }

  if (value.state !== "resolved") {
    validateOptionalNonEmptyString(value, "reason", path, errors);
    for (const resolvedOnlyField of [
      "evidence_identifier",
      "source_sheet_identifier",
      "pixel_points",
      "pixel_span",
      "reference_dimension",
      "units",
      "evidence_reference_linkage",
      "method_note",
    ]) {
      if (Object.hasOwn(value, resolvedOnlyField)) {
        errors.push(
          `${path} in state '${value.state}' cannot contain resolved-only field '${resolvedOnlyField}'.`,
        );
      }
    }
    return;
  }

  if (!isNonEmptyString(value.evidence_identifier)) {
    errors.push(`${path}.evidence_identifier must be a non-empty source ID.`);
  } else if (!sourceIds.has(value.evidence_identifier)) {
    errors.push(
      `${path}.evidence_identifier references unknown source ID '${value.evidence_identifier}'.`,
    );
  }
  validateOptionalNonEmptyString(
    value,
    "source_sheet_identifier",
    path,
    errors,
  );
  validateOptionalNonEmptyString(value, "method_note", path, errors);

  if (
    typeof value.reference_dimension !== "number" ||
    !Number.isFinite(value.reference_dimension) ||
    value.reference_dimension <= 0
  ) {
    errors.push(
      `${path}.reference_dimension must be a finite positive number.`,
    );
  }
  if (!isNonEmptyString(value.units)) {
    errors.push(`${path}.units must be a non-empty string.`);
  }

  if (value.evidence_reference_linkage === undefined) {
    errors.push(`${path}.evidence_reference_linkage is required.`);
  } else {
    validateStringArray(
      value.evidence_reference_linkage,
      `${path}.evidence_reference_linkage`,
      errors,
      { sourceIds, requireNonEmpty: true },
    );
  }

  let hasUsablePixelBasis = false;
  if (value.pixel_span !== undefined) {
    if (
      typeof value.pixel_span !== "number" ||
      !Number.isFinite(value.pixel_span) ||
      value.pixel_span <= 0
    ) {
      errors.push(`${path}.pixel_span must be a finite positive number.`);
    } else {
      hasUsablePixelBasis = true;
    }
  }

  if (value.pixel_points !== undefined) {
    if (!Array.isArray(value.pixel_points)) {
      errors.push(`${path}.pixel_points must be an array when present.`);
    } else {
      if (value.pixel_points.length < 2) {
        errors.push(`${path}.pixel_points must contain at least two points.`);
      }
      let pointsAreValid = value.pixel_points.length >= 2;
      value.pixel_points.forEach((point, index) => {
        const pointPath = `${path}.pixel_points[${index}]`;
        if (!isRecord(point)) {
          errors.push(`${pointPath} must be an object.`);
          pointsAreValid = false;
        } else if (
          typeof point.x !== "number" ||
          !Number.isFinite(point.x) ||
          typeof point.y !== "number" ||
          !Number.isFinite(point.y)
        ) {
          errors.push(
            `${pointPath} must contain finite numeric x and y values.`,
          );
          pointsAreValid = false;
        }
      });
      if (pointsAreValid) hasUsablePixelBasis = true;
    }
  }

  if (!hasUsablePixelBasis) {
    errors.push(
      `${path} requires a positive pixel_span or at least two valid pixel_points.`,
    );
  }
}

function validateScaleEvidence(
  value: unknown,
  sourceIds: ReadonlySet<string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push("scale_evidence must be an object when present.");
    return;
  }
  if (
    typeof value.state !== "string" ||
    !SCALE_STATES.has(value.state as ScaleEvidence["state"])
  ) {
    errors.push(
      `scale_evidence.state has invalid value ${describeValue(value.state)}.`,
    );
  }
  validateOptionalNonEmptyString(
    value,
    "printed_scale",
    "scale_evidence",
    errors,
  );
  validateOptionalNonEmptyString(
    value,
    "source_sheet",
    "scale_evidence",
    errors,
  );
  validateOptionalNonEmptyString(value, "units", "scale_evidence", errors);
  if (value.calibration !== undefined) {
    validateCalibration(value.calibration, sourceIds, errors);
  }
}

function validateTemporalEvidence(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push("effective_version must be an object when present.");
    return;
  }
  if (
    typeof value.state !== "string" ||
    !TEMPORAL_STATES.has(value.state as TemporalState)
  ) {
    errors.push(
      `effective_version.state has invalid value ${describeValue(value.state)}.`,
    );
  }
  validateOptionalNonEmptyString(
    value,
    "effective_date",
    "effective_version",
    errors,
  );
  validateOptionalNonEmptyString(value, "notes", "effective_version", errors);
}

function validateResiduals(
  value: unknown,
  sourceIds: ReadonlySet<string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push("residuals must be an array when present.");
    return;
  }
  value.forEach((entry, index) => {
    const path = `residuals[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!isNonEmptyString(entry.what_was_compared)) {
      errors.push(`${path}.what_was_compared must be a non-empty string.`);
    }
    if (
      typeof entry.state !== "string" ||
      !RESIDUAL_STATES.has(entry.state as ResidualState)
    ) {
      errors.push(
        `${path}.state has invalid value ${describeValue(entry.state)}.`,
      );
    }
    if (entry.expected_reference_dimension !== undefined) {
      validateMeasurement(
        entry.expected_reference_dimension,
        `${path}.expected_reference_dimension`,
        sourceIds,
        errors,
      );
    }
    if (entry.observed_derived_dimension !== undefined) {
      validateMeasurement(
        entry.observed_derived_dimension,
        `${path}.observed_derived_dimension`,
        sourceIds,
        errors,
      );
    }
    if (
      entry.residual_error !== undefined &&
      (typeof entry.residual_error !== "number" ||
        !Number.isFinite(entry.residual_error))
    ) {
      errors.push(
        `${path}.residual_error must be a finite number when present.`,
      );
    }
    validateOptionalNonEmptyString(entry, "units", path, errors);
    validateOptionalNonEmptyString(entry, "tolerance_basis", path, errors);
    validateOptionalNonEmptyString(entry, "blocking_reason", path, errors);
    if (
      (entry.state === "PASS" || entry.state === "FAIL") &&
      !isNonEmptyString(entry.tolerance_basis)
    ) {
      errors.push(`${path}.tolerance_basis is required for ${entry.state}.`);
    }
    if (entry.state === "BLOCKED" && !isNonEmptyString(entry.blocking_reason)) {
      errors.push(`${path}.blocking_reason is required for BLOCKED.`);
    }
  });
}

function validateEnvironmentSceneSpecInternal(
  input: unknown,
): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ["Input must be a JSON object."] };
  }

  if (!isNonEmptyString(input.environment_id)) {
    errors.push("environment_id must be a non-empty string.");
  }
  if (
    typeof input.fidelity_tier !== "string" ||
    !FIDELITY_TIERS.has(input.fidelity_tier as FidelityTier)
  ) {
    errors.push(
      `fidelity_tier has invalid value ${describeValue(input.fidelity_tier)}.`,
    );
  }
  for (const field of ["building_id", "coordinate_system", "units"]) {
    validateOptionalNonEmptyString(input, field, "spec", errors);
  }

  const sourceIds = new Set<string>();
  validateSources(input.sources, sourceIds, errors);

  const sceneIds = new Map<string, string>();
  const zoneIds = new Set<string>();
  for (const field of FEATURE_ARRAY_FIELDS) {
    validateFeatures(input[field], field, sceneIds, sourceIds, errors);
  }
  validateZones(input.zones, sceneIds, zoneIds, errors);
  validateCameras(input.cameras, sceneIds, zoneIds, errors);
  validateTypedIdentityArray(input.anchors, "anchors", sceneIds, errors);
  validateTypedIdentityArray(
    input.foreground_occlusion_objects,
    "foreground_occlusion_objects",
    sceneIds,
    errors,
  );

  validateScaleEvidence(input.scale_evidence, sourceIds, errors);
  validateTemporalEvidence(input.effective_version, errors);
  validateResiduals(input.residuals, sourceIds, errors);

  if (input.unresolved_conflicts !== undefined) {
    validateStringArray(
      input.unresolved_conflicts,
      "unresolved_conflicts",
      errors,
    );
  }
  if (input.explicit_unknowns !== undefined) {
    validateStringArray(input.explicit_unknowns, "explicit_unknowns", errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateEnvironmentSceneSpec(input: unknown): ValidationResult {
  try {
    return validateEnvironmentSceneSpecInternal(input);
  } catch {
    return {
      valid: false,
      errors: [
        "Input could not be inspected safely as an EnvironmentSceneSpec.",
      ],
    };
  }
}

export function parseEnvironmentSceneSpec(json: string): EnvironmentSceneSpec {
  if (typeof json !== "string") {
    throw new Error("Malformed JSON: input must be a string.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Malformed JSON: ${message}`);
  }

  const result = validateEnvironmentSceneSpec(parsed);
  if (!result.valid) {
    throw new Error(`Invalid EnvironmentSceneSpec: ${result.errors.join(" ")}`);
  }
  return parsed as EnvironmentSceneSpec;
}

function compareCanonicalStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function canonicalize(value: unknown, path: readonly string[]): unknown {
  if (Array.isArray(value)) {
    const field = path.at(-1);
    let ordered = value;
    if (
      path.length === 1 &&
      field &&
      TOP_LEVEL_IDENTITY_ARRAY_FIELDS.has(field)
    ) {
      ordered = [...value].sort((left, right) => {
        const leftId =
          isRecord(left) && typeof left.id === "string" ? left.id : "";
        const rightId =
          isRecord(right) && typeof right.id === "string" ? right.id : "";
        return compareCanonicalStrings(leftId, rightId);
      });
    } else if (field && UNORDERED_REFERENCE_ARRAY_FIELDS.has(field)) {
      ordered = [...value].sort((left, right) =>
        compareCanonicalStrings(String(left), String(right)),
      );
    }
    return ordered.map((entry) => canonicalize(entry, path));
  }

  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort(compareCanonicalStrings)) {
      result[key] = canonicalize(value[key], [...path, key]);
    }
    return result;
  }
  return value;
}

export function serializeEnvironmentSceneSpec(
  spec: EnvironmentSceneSpec,
): string {
  const validation = validateEnvironmentSceneSpec(spec);
  if (!validation.valid) {
    throw new Error(
      `Cannot serialize invalid EnvironmentSceneSpec: ${validation.errors.join(" ")}`,
    );
  }
  return JSON.stringify(canonicalize(spec, []));
}
