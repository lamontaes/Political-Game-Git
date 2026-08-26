/**
 * Generalized environment-scene and measurement evidence contract.
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
  provenance_refs?: string[];
}

export interface UnknownMeasurement {
  state: "unknown" | "unreadable" | "contradictory" | "unsupported";
  reason?: string;
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

export function validateEnvironmentSceneSpec(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Input must be a JSON object."] };
  }

  const spec = input as Record<string, unknown>;

  if (typeof spec.environment_id !== "string") {
    errors.push("Missing or invalid 'environment_id'");
  }

  const validFidelityTiers = ["F1", "F2", "F3", "F4"];
  if (
    typeof spec.fidelity_tier !== "string" ||
    !validFidelityTiers.includes(spec.fidelity_tier)
  ) {
    errors.push(`Invalid fidelity_tier: '${spec.fidelity_tier}'`);
  }

  const zonesArr = (spec.zones as Record<string, unknown>[]) || [];
  const validZones = new Set(
    zonesArr.map((z) => (typeof z?.id === "string" ? z.id : "")),
  );

  const sourcesArr = (spec.sources as Record<string, unknown>[]) || [];
  const validSources = new Set(
    sourcesArr.map((s) => (typeof s?.id === "string" ? s.id : "")),
  );

  const ids = new Set<string>();
  const checkUniqueId = (id: string, context: string) => {
    if (ids.has(id)) {
      errors.push(`Duplicate ID found: '${id}' in ${context}`);
    } else {
      ids.add(id);
    }
  };

  const checkFeatures = (features?: unknown, context = "features") => {
    if (!features) return;
    if (!Array.isArray(features)) {
      errors.push(`Expected array for ${context}`);
      return;
    }
    for (const f of features) {
      if (
        !f ||
        typeof f !== "object" ||
        typeof (f as Record<string, unknown>).id !== "string"
      ) {
        errors.push(`Invalid feature in ${context}`);
        continue;
      }
      checkUniqueId((f as Record<string, unknown>).id as string, context);

      const validGrades = ["G0", "G1", "G2", "G3", "G4", "G5"];
      if (
        !validGrades.includes(
          (f as Record<string, unknown>).geometry_grade as string,
        )
      ) {
        errors.push(
          `Feature '${(f as Record<string, unknown>).id}' has invalid geometry_grade '${(f as Record<string, unknown>).geometry_grade}'`,
        );
      }

      const dimensions = (f as Record<string, unknown>).dimensions;
      if (dimensions && typeof dimensions === "object") {
        for (const [key, dim] of Object.entries(
          dimensions as Record<string, unknown>,
        )) {
          if (!dim || typeof dim !== "object") {
            errors.push(
              `Feature '${(f as Record<string, unknown>).id}' dimension '${key}' is invalid`,
            );
            continue;
          }
          if ("value" in dim) {
            // KnownMeasurement
            if (typeof (dim as Record<string, unknown>).value !== "number") {
              errors.push(
                `Feature '${(f as Record<string, unknown>).id}' dimension '${key}' value must be a number`,
              );
            }
            if (typeof (dim as Record<string, unknown>).unit !== "string") {
              errors.push(
                `Feature '${(f as Record<string, unknown>).id}' dimension '${key}' is missing unit`,
              );
            }
            const validConfidences = [
              "exact",
              "plan-derived",
              "specified",
              "bounded-estimate",
              "visual-estimate",
            ];
            if (
              !validConfidences.includes(
                (dim as Record<string, unknown>).confidence as string,
              )
            ) {
              errors.push(
                `Feature '${(f as Record<string, unknown>).id}' dimension '${key}' has invalid confidence '${(dim as Record<string, unknown>).confidence}'`,
              );
            }
            const refs = (dim as Record<string, unknown>).provenance_refs;
            if (Array.isArray(refs)) {
              for (const ref of refs) {
                if (typeof ref !== "string" || !validSources.has(ref)) {
                  errors.push(
                    `Feature '${(f as Record<string, unknown>).id}' dimension '${key}' has broken provenance_ref '${ref}'`,
                  );
                }
              }
            }
          } else {
            // UnknownMeasurement
            const validUnknowns = [
              "unknown",
              "unreadable",
              "contradictory",
              "unsupported",
            ];
            if (
              !validUnknowns.includes(
                (dim as Record<string, unknown>).state as string,
              )
            ) {
              errors.push(
                `Feature '${(f as Record<string, unknown>).id}' dimension '${key}' has invalid unknown state '${(dim as Record<string, unknown>).state}'`,
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

  zonesArr.forEach((z) => checkUniqueId(z.id as string, "zones"));
  const camerasArr = (spec.cameras as Record<string, unknown>[]) || [];
  camerasArr.forEach((c) => checkUniqueId(c.id as string, "cameras"));
  const anchorsArr = (spec.anchors as Record<string, unknown>[]) || [];
  anchorsArr.forEach((a) => checkUniqueId(a.id as string, "anchors"));
  const occArr =
    (spec.foreground_occlusion_objects as Record<string, unknown>[]) || [];
  occArr.forEach((o) =>
    checkUniqueId(o.id as string, "foreground_occlusion_objects"),
  );

  if (Array.isArray(spec.cameras)) {
    for (const camera of spec.cameras) {
      if (camera && typeof camera === "object" && camera.target_zone_id) {
        if (
          typeof camera.target_zone_id !== "string" ||
          !validZones.has(camera.target_zone_id)
        ) {
          errors.push(
            `Camera '${camera.id}' references invalid target_zone_id '${camera.target_zone_id}'`,
          );
        }
      }
    }
  }

  if (spec.scale_evidence && typeof spec.scale_evidence === "object") {
    const scaleEv = spec.scale_evidence as Record<string, unknown>;
    const validScaleStates = [
      "known",
      "unresolved",
      "conflicting",
      "unsupported",
    ];
    if (!validScaleStates.includes(scaleEv.state as string)) {
      errors.push(`Invalid scale state '${scaleEv.state}'`);
    }

    if (scaleEv.calibration && typeof scaleEv.calibration === "object") {
      const cal = scaleEv.calibration as Record<string, unknown>;
      const validCalStates = ["resolved", "unresolved", "uncertain"];
      if (!validCalStates.includes(cal.state as string)) {
        errors.push(`Invalid calibration state '${cal.state}'`);
      }

      if (cal.state === "resolved") {
        if (typeof cal.evidence_identifier !== "string") {
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

      if (Array.isArray(cal.evidence_reference_linkage)) {
        for (const ref of cal.evidence_reference_linkage) {
          if (typeof ref !== "string" || !validSources.has(ref)) {
            errors.push(
              `Calibration evidence_reference_linkage '${ref}' is broken`,
            );
          }
        }
      }
    }
  }

  if (spec.residuals) {
    if (!Array.isArray(spec.residuals)) {
      errors.push("Invalid residuals type");
    } else {
      for (const res of spec.residuals) {
        if (!res || typeof res !== "object") {
          errors.push("Invalid residual entry");
          continue;
        }
        const validResStates = ["PASS", "FAIL", "BLOCKED", "UNRESOLVED"];
        if (!validResStates.includes(res.state as string)) {
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
            `Residual check '${res.what_was_compared}' is missing tolerance_basis but state is '${res.state}'.`,
          );
        }
        if (res.state === "BLOCKED" && !res.blocking_reason) {
          errors.push(
            `Residual check '${res.what_was_compared}' is BLOCKED but missing blocking_reason.`,
          );
        }
      }
    }
  }

  if (spec.effective_version && typeof spec.effective_version === "object") {
    const ev = spec.effective_version as Record<string, unknown>;
    const validTemporalStates = [
      "CURRENT_VERIFIED",
      "STABLE_RECONCILED",
      "PRE_CHANGE_DELTA_REQUIRED",
      "EFFECTIVE_DATE_UNCERTAIN",
      "HISTORICAL_VERSION_ONLY",
    ];
    if (!validTemporalStates.includes(ev.state as string)) {
      errors.push(`Invalid temporal state '${ev.state}'.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function serializeEnvironmentSceneSpec(
  spec: EnvironmentSceneSpec,
): string {
  const deepSort = (obj: unknown, path: string = ""): unknown => {
    if (Array.isArray(obj)) {
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
        const sortedArray = [...obj].sort((a, b) => {
          const aId =
            typeof (a as Record<string, unknown>).id === "string"
              ? (a as Record<string, unknown>).id
              : "";
          const bId =
            typeof (b as Record<string, unknown>).id === "string"
              ? (b as Record<string, unknown>).id
              : "";
          return (aId as string).localeCompare(bId as string);
        });
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
