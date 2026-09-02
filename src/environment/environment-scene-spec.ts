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

/**
 * PRESENTATION GEOMETRY CONVENTIONS
 *
 * Two coordinate spaces already exist in this project and both are kept:
 *
 * - Rectangles that bound the composition (`safe_area`,
 *   `essential_content_area`, UI safe zones) are expressed in PLATE UNITS,
 *   the same virtual coordinate space the camera scales.
 * - Points and regions that pin content to the picture (anchors, contacts,
 *   occluder regions, surface slots) are expressed as PERCENTAGES of the
 *   plate.
 *
 * Both are plate-relative, so cropping the camera never moves an anchor: it
 * only changes which part of the plate is on screen.
 */

/** A rectangle as percentages of the plate, 0..100 on each axis. */
export interface PercentRect {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

/** The virtual coordinate space a scene's geometry is authored in. */
export interface ScenePlate {
  width: number;
  height: number;
}

export interface SceneCameraSpec {
  minimum_aspect_ratio: number;
  maximum_aspect_ratio: number;
  horizontal_focus: number;
  vertical_focus: number;
}

export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneUiSafeZoneSpec {
  id: string;
  edge: "bottom-left" | "top-left" | "bottom-right" | "top-right";
  width: number;
  height: number;
}

/**
 * One raster in a scene's tier ladder. The runtime chooses among these by
 * viewport and device pixel ratio; the pipeline never synthesizes one.
 */
export interface SceneRasterTierSpec {
  width: number;
  height: number;
  /** Repository-relative path under art/. */
  path: string;
  hash: string;
  derivation:
    | "native-master"
    | "deterministic-downscale"
    | "upscaled-development-fixture";
  /** Real detail carried, when less than `width`. Required for an upscale. */
  native_detail_width?: number;
}

export interface SceneRasterSpec {
  asset_id: string;
  tiers: SceneRasterTierSpec[];
}

/**
 * One end of the floor depth ramp: at this floor line, a person of standard
 * stature paints at this scale multiplier.
 */
export interface SceneFloorCalibrationPoint {
  floor_y_percent: number;
  scale: number;
}

/**
 * Two calibration pairs, interpolated linearly, are the whole perspective
 * model. A linear ramp is correct for a single-vanishing-point interior at a
 * roughly horizontal camera, which is every plate this project plans. There is
 * deliberately no projective camera: the generation pipeline cannot supply
 * truthful camera intrinsics, and inventing them would be fabricated
 * measurement precision.
 */
export interface SceneFloorCalibration {
  near: SceneFloorCalibrationPoint;
  far: SceneFloorCalibrationPoint;
}

/** Where a standing person's soles must land, and how far apart they may be. */
export interface SceneFloorContact {
  floor_y_percent: number;
  /** Widest permitted distance between the two sole contacts. */
  max_foot_spread_percent?: number;
}

/**
 * Where a seated person meets the furniture. A seated person's feet are on the
 * FLOOR, not on the chair, so `floor_y_percent` is required alongside the seat
 * plane; modelling only the pelvis is precisely why hand-tuned seated sprites
 * float.
 */
export interface SceneSeatContact {
  seat_plane_y_percent: number;
  seat_front_x_percent: number;
  seat_width_percent: number;
  floor_y_percent: number;
  /** Paint order of the seat pan and of the backrest, which differ. */
  seat_z_order: number;
  backrest_z_order: number;
}

export type SceneAnchorKind = "floor-standing" | "seat" | "prop-surface";

export interface Anchor {
  id: string;
  type: string;
  kind?: SceneAnchorKind;
  /** Horizontal position of the anchor as a percentage of plate width. */
  x_percent?: number;
  floor_contact?: SceneFloorContact;
  seat_contact?: SceneSeatContact;
  /** Paint order, distinct from perspective depth. Higher draws in front. */
  z_order?: number;
  /** Widest a body may be at this anchor, as a percentage of plate width. */
  footprint_percent?: number;
  /** Interactive region within the placed body box, in body-box fractions. */
  hitbox_percent?: PercentRect;
  allowed_body_families?: string[];
  allowed_pose_families?: string[];
  permitted_facings?: string[];
}

export interface Occluder {
  id: string;
  type: string;
  /** Manifest asset supplying this region's alpha mask, when it has one. */
  asset_id?: string;
  /** Paint order relative to people and to other occluders. */
  z_order?: number;
  /** The region this occluder covers, for debug overlays and footprint checks. */
  region_percent?: PercentRect;
}

/**
 * A presentation sink for dynamic content. Surface slots do NOT decide what
 * document, seal or tally exists: the simulation owns that, and a slot only
 * says where such a thing would be painted and what class of thing may go
 * there.
 */
export interface SceneSurfaceSlot {
  slot_id: string;
  kind: string;
  rect_percent: PercentRect;
  z_order: number;
  allowed_content_classes: string[];
  /** What the slot shows when nothing canonical fills it. */
  fallback_decoration?: string;
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

  // --- Runtime presentation contract -------------------------------------
  /** Registry key. Required for a scene the runtime compositor may register. */
  scene_id?: string;
  family_id?: string;
  /** Human label used by developer surfaces. Never player-facing copy. */
  label?: string;
  /**
   * Whether this scene's art is held to the production plate contract or is
   * frozen development fixture art. Fixture scenes are legitimate regression
   * subjects and are never presented as production masters.
   */
  presentation_status?: "development-fixture" | "production";
  plate?: ScenePlate;
  camera_policy?: SceneCameraSpec;
  safe_area?: SceneRect;
  essential_content_area?: SceneRect;
  ui_safe_zones?: SceneUiSafeZoneSpec[];
  raster?: SceneRasterSpec;
  floor_calibration?: SceneFloorCalibration;
  /**
   * How wide a normalized modular body canvas paints on this plate at scale
   * 1.0, as a percentage of plate width. Perspective then multiplies it by the
   * scale derived from the anchor's floor line.
   *
   * This is the one number a scene must state to place modular people at all,
   * because a normalized body canvas has no inherent size on a picture. It is a
   * visual estimate per scene, not a measurement.
   */
  standard_body_width_percent?: number;
  surface_slots?: SceneSurfaceSlot[];

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
  "ui_safe_zones",
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
    if (field === "anchors") {
      validateAnchorPresentation(entry, path, errors);
    } else {
      validateOccluderPresentation(entry, path, errors);
    }
  });
}

// ---------------------------------------------------------------------------
// Runtime presentation contract
// ---------------------------------------------------------------------------

const ANCHOR_KINDS = new Set<SceneAnchorKind>([
  "floor-standing",
  "seat",
  "prop-surface",
]);

const RASTER_DERIVATIONS = new Set<SceneRasterTierSpec["derivation"]>([
  "native-master",
  "deterministic-downscale",
  "upscaled-development-fixture",
]);

const UI_SAFE_ZONE_EDGES = new Set<SceneUiSafeZoneSpec["edge"]>([
  "bottom-left",
  "top-left",
  "bottom-right",
  "top-right",
]);

const PRESENTATION_STATUSES = new Set(["development-fixture", "production"]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPercent(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function validatePercentField(
  object: Record<string, unknown>,
  field: string,
  path: string,
  errors: string[],
  required: boolean,
): void {
  const value = object[field];
  if (value === undefined) {
    if (required) errors.push(`${path}.${field} is required.`);
    return;
  }
  if (!isPercent(value)) {
    errors.push(`${path}.${field} must be a percentage between 0 and 100.`);
  }
}

function validatePercentRect(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object of plate percentages.`);
    return;
  }
  for (const field of [
    "x_percent",
    "y_percent",
    "width_percent",
    "height_percent",
  ]) {
    validatePercentField(value, field, path, errors, true);
  }
}

function validateSceneRectField(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be a plate-unit rectangle.`);
    return;
  }
  for (const field of ["x", "y"]) {
    if (!isFiniteNumber(value[field])) {
      errors.push(`${path}.${field} must be a finite number.`);
    }
  }
  for (const field of ["width", "height"]) {
    if (!isPositiveNumber(value[field])) {
      errors.push(`${path}.${field} must be a finite positive number.`);
    }
  }
}

function validateAnchorPresentation(
  entry: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (
    entry.kind !== undefined &&
    !ANCHOR_KINDS.has(entry.kind as SceneAnchorKind)
  ) {
    errors.push(`${path}.kind has invalid value ${describeValue(entry.kind)}.`);
  }
  validatePercentField(entry, "x_percent", path, errors, false);
  validatePercentField(entry, "footprint_percent", path, errors, false);
  if (entry.z_order !== undefined && !isFiniteNumber(entry.z_order)) {
    errors.push(`${path}.z_order must be a finite number when present.`);
  }
  if (entry.hitbox_percent !== undefined) {
    validatePercentRect(entry.hitbox_percent, `${path}.hitbox_percent`, errors);
  }

  if (entry.floor_contact !== undefined) {
    const contact = entry.floor_contact;
    if (!isRecord(contact)) {
      errors.push(`${path}.floor_contact must be an object.`);
    } else {
      validatePercentField(
        contact,
        "floor_y_percent",
        `${path}.floor_contact`,
        errors,
        true,
      );
      validatePercentField(
        contact,
        "max_foot_spread_percent",
        `${path}.floor_contact`,
        errors,
        false,
      );
    }
  }

  if (entry.seat_contact !== undefined) {
    const contact = entry.seat_contact;
    if (!isRecord(contact)) {
      errors.push(`${path}.seat_contact must be an object.`);
    } else {
      for (const field of [
        "seat_plane_y_percent",
        "seat_front_x_percent",
        "seat_width_percent",
        "floor_y_percent",
      ]) {
        validatePercentField(
          contact,
          field,
          `${path}.seat_contact`,
          errors,
          true,
        );
      }
      for (const field of ["seat_z_order", "backrest_z_order"]) {
        if (!isFiniteNumber(contact[field])) {
          errors.push(`${path}.seat_contact.${field} must be a finite number.`);
        }
      }
      if (
        isPercent(contact.seat_plane_y_percent) &&
        isPercent(contact.floor_y_percent) &&
        contact.floor_y_percent < contact.seat_plane_y_percent
      ) {
        errors.push(
          `${path}.seat_contact places the floor above the seat plane; a seated person's feet rest below the seat.`,
        );
      }
    }
  }

  if (entry.kind === "seat" && entry.seat_contact === undefined) {
    errors.push(`${path} is a seat anchor and must declare 'seat_contact'.`);
  }
  if (entry.kind === "floor-standing" && entry.floor_contact === undefined) {
    errors.push(
      `${path} is a floor-standing anchor and must declare 'floor_contact'.`,
    );
  }

  for (const field of [
    "allowed_body_families",
    "allowed_pose_families",
    "permitted_facings",
  ]) {
    if (entry[field] !== undefined) {
      validateStringArray(entry[field], `${path}.${field}`, errors, {
        requireNonEmpty: true,
      });
    }
  }
}

function validateOccluderPresentation(
  entry: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  validateOptionalNonEmptyString(entry, "asset_id", path, errors);
  if (entry.z_order !== undefined && !isFiniteNumber(entry.z_order)) {
    errors.push(`${path}.z_order must be a finite number when present.`);
  }
  if (entry.region_percent !== undefined) {
    validatePercentRect(entry.region_percent, `${path}.region_percent`, errors);
  }
}

function validateSurfaceSlots(
  value: unknown,
  sceneIds: Map<string, string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push("surface_slots must be an array when present.");
    return;
  }
  value.forEach((entry, index) => {
    const path = `surface_slots[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    registerSceneId(entry.slot_id, path, sceneIds, errors);
    if (!isNonEmptyString(entry.kind)) {
      errors.push(`${path}.kind must be a non-empty string.`);
    }
    validatePercentRect(entry.rect_percent, `${path}.rect_percent`, errors);
    if (!isFiniteNumber(entry.z_order)) {
      errors.push(`${path}.z_order must be a finite number.`);
    }
    validateStringArray(
      entry.allowed_content_classes,
      `${path}.allowed_content_classes`,
      errors,
      { requireNonEmpty: true },
    );
    validateOptionalNonEmptyString(entry, "fallback_decoration", path, errors);
  });
}

function validateRaster(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push("raster must be an object when present.");
    return;
  }
  if (!isNonEmptyString(value.asset_id)) {
    errors.push("raster.asset_id must be a non-empty string.");
  }
  if (!Array.isArray(value.tiers) || value.tiers.length === 0) {
    errors.push("raster.tiers must be a non-empty array.");
    return;
  }
  let previousWidth = 0;
  let previousAspect: number | null = null;
  value.tiers.forEach((tier, index) => {
    const path = `raster.tiers[${index}]`;
    if (!isRecord(tier)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!isPositiveNumber(tier.width) || !isPositiveNumber(tier.height)) {
      errors.push(`${path} must declare positive width and height.`);
      return;
    }
    if (tier.width <= previousWidth) {
      errors.push(`${path} must be wider than the tier before it.`);
    }
    previousWidth = tier.width;
    const aspect = tier.width / tier.height;
    if (previousAspect !== null && Math.abs(aspect - previousAspect) > 0.005) {
      errors.push(`${path} does not preserve the ladder's source aspect.`);
    }
    previousAspect = aspect;
    if (!isNonEmptyString(tier.path)) {
      errors.push(`${path}.path must be a non-empty string.`);
    }
    if (!isNonEmptyString(tier.hash)) {
      errors.push(`${path}.hash must be a non-empty string.`);
    }
    if (
      typeof tier.derivation !== "string" ||
      !RASTER_DERIVATIONS.has(
        tier.derivation as SceneRasterTierSpec["derivation"],
      )
    ) {
      errors.push(
        `${path}.derivation has invalid value ${describeValue(tier.derivation)}.`,
      );
    }
    const isUpscale = tier.derivation === "upscaled-development-fixture";
    if (isUpscale) {
      if (
        !isPositiveNumber(tier.native_detail_width) ||
        tier.native_detail_width > tier.width
      ) {
        errors.push(
          `${path} is an upscale and must declare the native_detail_width it was enlarged from.`,
        );
      }
    } else if (tier.native_detail_width !== undefined) {
      errors.push(
        `${path} declares native_detail_width but is not an upscale.`,
      );
    }
  });
}

function validateFloorCalibration(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push("floor_calibration must be an object when present.");
    return;
  }
  for (const end of ["near", "far"] as const) {
    const point = value[end];
    const path = `floor_calibration.${end}`;
    if (!isRecord(point)) {
      errors.push(`${path} must be an object.`);
      continue;
    }
    validatePercentField(point, "floor_y_percent", path, errors, true);
    if (!isPositiveNumber(point.scale)) {
      errors.push(`${path}.scale must be a finite positive number.`);
    }
  }
  const near = value.near;
  const far = value.far;
  if (isRecord(near) && isRecord(far)) {
    if (
      isPercent(near.floor_y_percent) &&
      isPercent(far.floor_y_percent) &&
      near.floor_y_percent <= far.floor_y_percent
    ) {
      errors.push(
        "floor_calibration.near must sit lower in the plate than floor_calibration.far; nearer floor is further down the picture.",
      );
    }
    if (
      isPositiveNumber(near.scale) &&
      isPositiveNumber(far.scale) &&
      near.scale <= far.scale
    ) {
      errors.push(
        "floor_calibration.near must paint larger than floor_calibration.far.",
      );
    }
  }
}

function validatePresentation(
  input: Record<string, unknown>,
  sceneIds: Map<string, string>,
  errors: string[],
): void {
  for (const field of ["scene_id", "family_id", "label"]) {
    validateOptionalNonEmptyString(input, field, "spec", errors);
  }
  if (
    input.presentation_status !== undefined &&
    !PRESENTATION_STATUSES.has(input.presentation_status as string)
  ) {
    errors.push(
      `presentation_status has invalid value ${describeValue(input.presentation_status)}.`,
    );
  }
  if (input.plate !== undefined) {
    if (
      !isRecord(input.plate) ||
      !isPositiveNumber(input.plate.width) ||
      !isPositiveNumber(input.plate.height)
    ) {
      errors.push("plate must declare positive width and height.");
    }
  }
  if (input.camera_policy !== undefined) {
    const policy = input.camera_policy;
    if (!isRecord(policy)) {
      errors.push("camera_policy must be an object when present.");
    } else {
      for (const field of ["minimum_aspect_ratio", "maximum_aspect_ratio"]) {
        if (!isPositiveNumber(policy[field])) {
          errors.push(`camera_policy.${field} must be a positive number.`);
        }
      }
      for (const field of ["horizontal_focus", "vertical_focus"]) {
        const value = policy[field];
        if (!isFiniteNumber(value) || value < 0 || value > 1) {
          errors.push(`camera_policy.${field} must be between 0 and 1.`);
        }
      }
      if (
        isPositiveNumber(policy.minimum_aspect_ratio) &&
        isPositiveNumber(policy.maximum_aspect_ratio) &&
        policy.maximum_aspect_ratio < policy.minimum_aspect_ratio
      ) {
        errors.push(
          "camera_policy.maximum_aspect_ratio must not be below minimum_aspect_ratio.",
        );
      }
    }
  }
  if (input.safe_area !== undefined) {
    validateSceneRectField(input.safe_area, "safe_area", errors);
  }
  if (input.essential_content_area !== undefined) {
    validateSceneRectField(
      input.essential_content_area,
      "essential_content_area",
      errors,
    );
  }
  if (input.ui_safe_zones !== undefined) {
    if (!Array.isArray(input.ui_safe_zones)) {
      errors.push("ui_safe_zones must be an array when present.");
    } else {
      input.ui_safe_zones.forEach((zone, index) => {
        const path = `ui_safe_zones[${index}]`;
        if (!isRecord(zone)) {
          errors.push(`${path} must be an object.`);
          return;
        }
        registerSceneId(zone.id, path, sceneIds, errors);
        if (!UI_SAFE_ZONE_EDGES.has(zone.edge as SceneUiSafeZoneSpec["edge"])) {
          errors.push(
            `${path}.edge has invalid value ${describeValue(zone.edge)}.`,
          );
        }
        for (const field of ["width", "height"]) {
          if (!isPositiveNumber(zone[field])) {
            errors.push(`${path}.${field} must be a positive number.`);
          }
        }
      });
    }
  }
  validateRaster(input.raster, errors);
  validateFloorCalibration(input.floor_calibration, errors);
  if (
    input.standard_body_width_percent !== undefined &&
    (!isPositiveNumber(input.standard_body_width_percent) ||
      (input.standard_body_width_percent as number) > 100)
  ) {
    errors.push(
      "standard_body_width_percent must be a positive percentage of plate width.",
    );
  }
  validateSurfaceSlots(input.surface_slots, sceneIds, errors);
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

  validatePresentation(input, sceneIds, errors);

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
