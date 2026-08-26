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

export interface SourceEvidence {
  id: string;
  source_type: string;
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

export function parseEnvironmentSceneSpec(json: string): EnvironmentSceneSpec {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error("Malformed JSON: " + (e as Error).message);
  }
  const result = validateEnvironmentSceneSpec(parsed);
  if (!result.valid) {
    throw new Error(
      "Invalid EnvironmentSceneSpec: " + result.errors.join(", "),
    );
  }
  return parsed as EnvironmentSceneSpec;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEnvironmentSceneSpec(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Input must be a JSON object."] };
  }
  const spec = input as unknown as EnvironmentSceneSpec;

  if (typeof spec.environment_id !== "string") {
    errors.push("Missing or invalid 'environment_id'");
  }
  const validFidelityTiers = ["F1", "F2", "F3", "F4"];
  if (!validFidelityTiers.includes(spec.fidelity_tier)) {
    errors.push(`Invalid fidelity_tier: '${spec.fidelity_tier}'`);
  }

  const validZones = new Set(
    ((spec.zones as unknown as Record<string, unknown>[]) || []).map(
      (z) => z.id,
    ),
  );
  const validSources = new Set(
    ((spec.sources as unknown as Record<string, unknown>[]) || []).map(
      (s) => s.id,
    ),
  );

  const ids = new Set<string>();

  const checkUniqueId = (id: string, context: string) => {
    if (ids.has(id)) {
      errors.push(`Duplicate ID found: '${id}' in ${context}`);
    } else {
      ids.add(id);
    }
  };

  // Check unique IDs for features
  const checkFeatures = (features?: unknown[], context = "features") => {
    if (!features || !Array.isArray(features)) return;
    for (const f of features as Record<string, unknown>[]) {
      if (!f || typeof f !== "object" || typeof f.id !== "string") {
        errors.push(`Invalid feature in ${context}`);
        continue;
      }
      checkUniqueId(f.id, context);

      const validGrades = ["G0", "G1", "G2", "G3", "G4", "G5"];
      if (!validGrades.includes(f.geometry_grade as string)) {
        errors.push(
          `Feature '${f.id}' has invalid geometry_grade '${f.geometry_grade}'`,
        );
      }

      // Validate dimensions if present
      if (f.dimensions && typeof f.dimensions === "object") {
        for (const [key, dim] of Object.entries(
          f.dimensions as unknown as Record<string, Record<string, unknown>>,
        )) {
          if (!dim || typeof dim !== "object") {
            errors.push(`Feature '${f.id}' dimension '${key}' is invalid`);
            continue;
          }
          if ("value" in dim) {
            // It's a KnownMeasurement
            if (typeof dim.value !== "number") {
              errors.push(
                `Feature '${f.id}' dimension '${key}' value must be a number`,
              );
            }
            if (typeof dim.unit !== "string") {
              errors.push(
                `Feature '${f.id}' dimension '${key}' is missing unit or invalid unit`,
              );
            }
            const validConfidences = [
              "exact",
              "plan-derived",
              "specified",
              "bounded-estimate",
              "visual-estimate",
            ];
            if (!validConfidences.includes(dim.confidence as string)) {
              errors.push(
                `Feature '${f.id}' dimension '${key}' has invalid confidence '${dim.confidence}'`,
              );
            }
            if (Array.isArray(dim.provenance_refs)) {
              for (const ref of dim.provenance_refs) {
                if (!validSources.has(ref as string)) {
                  errors.push(
                    `Feature '${f.id}' dimension '${key}' has broken provenance_ref '${ref}'`,
                  );
                }
              }
            }
          } else {
            // It's an UnknownMeasurement
            const validUnknowns = [
              "unknown",
              "unreadable",
              "contradictory",
              "unsupported",
            ];
            if (!validUnknowns.includes(dim.state as string)) {
              errors.push(
                `Feature '${f.id}' dimension '${key}' has invalid unknown state '${dim.state}'`,
              );
            }
          }
        }
      }
    }
  };

  checkFeatures(
    spec.room_outline as unknown as Record<string, unknown>[],
    "room_outline",
  );
  checkFeatures(spec.walls as unknown as Record<string, unknown>[], "walls");
  checkFeatures(
    spec.doors_openings as unknown as Record<string, unknown>[],
    "doors_openings",
  );
  checkFeatures(
    spec.levels_steps as unknown as Record<string, unknown>[],
    "levels_steps",
  );
  checkFeatures(
    spec.ceiling_profile as unknown as Record<string, unknown>[],
    "ceiling_profile",
  );
  checkFeatures(
    spec.fixed_architectural_geometry as unknown as Record<string, unknown>[],
    "fixed_architectural_geometry",
  );
  checkFeatures(
    spec.fixed_furniture as unknown as Record<string, unknown>[],
    "fixed_furniture",
  );
  checkFeatures(
    spec.gallery_relationships as unknown as Record<string, unknown>[],
    "gallery_relationships",
  );

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

  if (spec.scale_evidence && typeof spec.scale_evidence === "object") {
    const validScaleStates = [
      "known",
      "unresolved",
      "conflicting",
      "unsupported",
    ];
    if (!validScaleStates.includes(spec.scale_evidence.state)) {
      errors.push(`Invalid scale state '${spec.scale_evidence.state}'`);
    }
    if (
      spec.scale_evidence.calibration &&
      typeof spec.scale_evidence.calibration === "object"
    ) {
      const cal = spec.scale_evidence.calibration as unknown as Record<
        string,
        unknown
      >;
      const validCalStates = ["resolved", "unresolved", "uncertain"];
      if (!validCalStates.includes(cal.state as string)) {
        errors.push(`Invalid calibration state '${cal.state}'`);
      }

      if (cal.state === "resolved") {
        if (
          !cal.evidence_identifier ||
          typeof cal.evidence_identifier !== "string"
        ) {
          errors.push(`Resolved calibration requires 'evidence_identifier'`);
        }
        if (typeof cal.reference_dimension !== "number") {
          errors.push(
            `Resolved calibration requires numeric 'reference_dimension'`,
          );
        }
        if (typeof cal.units !== "string") {
          errors.push(`Resolved calibration requires 'units'`);
        }
        if (
          typeof cal.pixel_span !== "number" &&
          !Array.isArray(cal.pixel_points)
        ) {
          errors.push(
            `Resolved calibration requires either 'pixel_span' or 'pixel_points'`,
          );
        }
      }

      if (
        cal.evidence_identifier &&
        typeof cal.evidence_identifier === "string"
      ) {
        if (!validSources.has(cal.evidence_identifier)) {
          errors.push(
            `Calibration evidence_identifier '${cal.evidence_identifier}' is broken/unresolved`,
          );
        }
      }
      if (
        cal.evidence_reference_linkage &&
        Array.isArray(cal.evidence_reference_linkage)
      ) {
        for (const ref of cal.evidence_reference_linkage) {
          if (!validSources.has(ref)) {
            errors.push(
              `Calibration evidence_reference_linkage '${ref}' is broken`,
            );
          }
        }
      }
    }
  }

  // Residual Integrity
  if (Array.isArray(spec.residuals)) {
    for (const res of spec.residuals) {
      if (!res || typeof res !== "object") {
        errors.push("Invalid residual entry");
        continue;
      }
      const validResStates = ["PASS", "FAIL", "BLOCKED", "UNRESOLVED"];
      if (!validResStates.includes(res.state)) {
        errors.push(
          `Invalid residual state '${res.state}' for '${res.what_was_compared}'`,
        );
      }
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
  const deepSort = (obj: unknown, path: string = ""): unknown => {
    if (Array.isArray(obj)) {
      // For semantically unordered collections, sort by 'id'
      const unorderedPaths = [
        "zones",
        "anchors",
        "cameras",
        "foreground_occlusion_objects",
        "sources",
      ];
      if (
        unorderedPaths.includes(path) &&
        obj.length > 0 &&
        typeof obj[0] === "object" &&
        obj[0] !== null &&
        "id" in obj[0]
      ) {
        const sortedArray = [...obj].sort((a, b) =>
          (a as { id: string }).id.localeCompare((b as { id: string }).id),
        );
        return sortedArray.map((item) => deepSort(item, path));
      }
      return obj.map((item) => deepSort(item, path));
    } else if (obj !== null && typeof obj === "object") {
      const sortedObj: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sortedObj[key] = deepSort((obj as Record<string, unknown>)[key], key);
      }
      return sortedObj;
    }
    return obj;
  };

  return JSON.stringify(deepSort(spec));
}
