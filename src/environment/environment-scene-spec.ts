/**
 * Generalized environment-scene and measurement evidence contract.
 * Located in a non-simulation pure domain as requested.
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

export interface CalibrationEvidence {
  evidence_identifier: string;
  source_sheet_identifier?: string;
  pixel_points?: { x: number; y: number }[];
  pixel_span?: number;
  reference_dimension?: number;
  units?: string;
  evidence_reference_linkage?: string[];
  method_note?: string;
  state: "resolved" | "unresolved" | "uncertain";
}

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
  value: number; // A literal numeric zero is preserved here.
  unit: string;
  confidence: MeasurementConfidence;
  provenance_refs?: string[]; // Every populated known measurement must be capable of explicit source linkage.
}

export interface UnknownMeasurement {
  state: "unknown" | "unreadable" | "contradictory" | "unsupported";
  reason?: string;
}

// Represent unknown/missing explicitly, and ensure literal zero is distinct.
// If the measurement simply isn't provided at all, it's undefined (missing).
// If it's provided as unknown, it uses UnknownMeasurement.
// If it's known, even if the value is zero, it uses KnownMeasurement.
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
  blocking_reason?: string; // e.g. "required basis is unresolved"
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

export function validateEnvironmentSceneSpec(
  spec: EnvironmentSceneSpec,
): ValidationResult {
  const errors: string[] = [];

  const validZones = new Set((spec.zones || []).map((z) => z.id));
  const ids = new Set<string>();

  const checkUniqueId = (id: string, context: string) => {
    if (ids.has(id)) {
      errors.push(`Duplicate ID found: '${id}' in ${context}`);
    } else {
      ids.add(id);
    }
  };

  // Check unique IDs for features
  const checkFeatures = (features?: SceneFeature[], context = "features") => {
    if (!features) return;
    for (const f of features) {
      checkUniqueId(f.id, context);
      // Validate dimensions if present
      if (f.dimensions) {
        for (const [key, dim] of Object.entries(f.dimensions)) {
          if ("value" in dim) {
            // It's a KnownMeasurement
            if (typeof dim.value !== "number") {
              errors.push(
                `Feature '${f.id}' dimension '${key}' value must be a number`,
              );
            }
            if (!dim.unit || !dim.confidence) {
              errors.push(
                `Feature '${f.id}' dimension '${key}' is missing unit or confidence`,
              );
            }
          } else {
            // It's an UnknownMeasurement
            const validUnknowns = [
              "unknown",
              "unreadable",
              "contradictory",
              "unsupported",
            ];
            if (!validUnknowns.includes(dim.state)) {
              errors.push(
                `Feature '${f.id}' dimension '${key}' has invalid unknown state '${dim.state}'`,
              );
            }
          }
        }
      }
    }
  };

  checkFeatures(spec.room_outline, "room_outline");
  checkFeatures(spec.walls, "walls");
  checkFeatures(spec.doors_openings, "doors_openings");
  checkFeatures(spec.levels_steps, "levels_steps");
  checkFeatures(spec.ceiling_profile, "ceiling_profile");
  checkFeatures(
    spec.fixed_architectural_geometry,
    "fixed_architectural_geometry",
  );
  checkFeatures(spec.fixed_furniture, "fixed_furniture");
  checkFeatures(spec.gallery_relationships, "gallery_relationships");

  (spec.zones || []).forEach((z) => checkUniqueId(z.id, "zones"));
  (spec.cameras || []).forEach((c) => checkUniqueId(c.id, "cameras"));
  (spec.anchors || []).forEach((a) => checkUniqueId(a.id, "anchors"));
  (spec.foreground_occlusion_objects || []).forEach((o) =>
    checkUniqueId(o.id, "foreground_occlusion_objects"),
  );

  // Referential Integrity: Cameras targeting Zones
  if (spec.cameras) {
    for (const camera of spec.cameras) {
      if (camera.target_zone_id && !validZones.has(camera.target_zone_id)) {
        errors.push(
          `Camera '${camera.id}' references invalid target_zone_id '${camera.target_zone_id}'`,
        );
      }
    }
  }

  // Residual Integrity
  if (spec.residuals) {
    for (const res of spec.residuals) {
      if (
        !res.tolerance_basis &&
        res.state !== "BLOCKED" &&
        res.state !== "UNRESOLVED"
      ) {
        errors.push(
          `Residual check '${res.what_was_compared}' is missing tolerance_basis but state is '${res.state}'. Must be BLOCKED or UNRESOLVED if missing basis.`,
        );
      }
      if (res.state === "BLOCKED" && !res.blocking_reason) {
        errors.push(
          `Residual check '${res.what_was_compared}' is BLOCKED but missing blocking_reason.`,
        );
      }
    }
  }

  // Temporal Validation
  if (spec.effective_version) {
    const validTemporalStates = [
      "CURRENT_VERIFIED",
      "STABLE_RECONCILED",
      "PRE_CHANGE_DELTA_REQUIRED",
      "EFFECTIVE_DATE_UNCERTAIN",
      "HISTORICAL_VERSION_ONLY",
    ];
    if (!validTemporalStates.includes(spec.effective_version.state)) {
      errors.push(`Invalid temporal state '${spec.effective_version.state}'.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// Canonical deterministic serialization
export function serializeEnvironmentSceneSpec(
  spec: EnvironmentSceneSpec,
): string {
  // Deep sort object keys to ensure canonical serialization
  const deepSort = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(deepSort);
    } else if (obj !== null && typeof obj === "object") {
      const sortedObj: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sortedObj[key] = deepSort((obj as Record<string, unknown>)[key]);
      }
      return sortedObj;
    }
    return obj;
  };

  return JSON.stringify(deepSort(spec));
}
