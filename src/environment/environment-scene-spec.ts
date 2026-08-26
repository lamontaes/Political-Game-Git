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

export interface CalibrationResolved {
  state: "resolved";
  evidence_identifier: string;
  source_sheet_identifier?: string;
  pixel_points?: { x: number; y: number }[];
  pixel_span?: number;
  reference_dimension: number;
  units: string;
  evidence_reference_linkage?: string[];
  method_note?: string;
}

export interface CalibrationUnresolved {
  state: "unresolved" | "uncertain";
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
  value: number; // A literal numeric zero is preserved here.
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

  // Safe iteration with runtime type checks
  const validZones = new Set<string>();
  if (Array.isArray(spec.zones)) {
    for (const z of spec.zones) {
      if (
        z &&
        typeof z === "object" &&
        typeof (z as Record<string, unknown>).id === "string"
      ) {
        validZones.add((z as Record<string, unknown>).id as string);
      } else {
        errors.push("Malformed zone entry");
      }
    }
  }

  const validSources = new Set<string>();
  if (Array.isArray(spec.sources)) {
    for (const s of spec.sources) {
      if (
        s &&
        typeof s === "object" &&
        typeof (s as Record<string, unknown>).id === "string" &&
        typeof (s as Record<string, unknown>).source_type === "string"
      ) {
        const sid = (s as Record<string, unknown>).id as string;
        if (validSources.has(sid)) {
          errors.push(`Duplicate source ID: '${sid}'`);
        }
        validSources.add(sid);
      } else {
        errors.push("Malformed source entry");
      }
    }
  }

  const ids = new Set<string>();
  const checkUniqueId = (id: string, context: string) => {
    if (ids.has(id)) {
      errors.push(`Duplicate ID found: '${id}' in ${context}`);
    } else {
      ids.add(id);
    }
  };

  const checkFeatures = (features: unknown, context: string) => {
    if (features === undefined || features === null) return;
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
      const fid = (f as Record<string, unknown>).id as string;
      checkUniqueId(fid, context);

      const validGrades = ["G0", "G1", "G2", "G3", "G4", "G5"];
      const grade = (f as Record<string, unknown>).geometry_grade;
      if (typeof grade !== "string" || !validGrades.includes(grade)) {
        errors.push(`Feature '${fid}' has invalid geometry_grade '${grade}'`);
      }

      const dimensions = (f as Record<string, unknown>).dimensions;
      if (
        dimensions &&
        typeof dimensions === "object" &&
        !Array.isArray(dimensions)
      ) {
        for (const [key, dim] of Object.entries(
          dimensions as Record<string, unknown>,
        )) {
          if (!dim || typeof dim !== "object" || Array.isArray(dim)) {
            errors.push(`Feature '${fid}' dimension '${key}' is invalid`);
            continue;
          }

          const dimObj = dim as Record<string, unknown>;

          if ("value" in dimObj && "state" in dimObj) {
            errors.push(
              `Feature '${fid}' dimension '${key}' mixes KnownMeasurement and UnknownMeasurement fields`,
            );
            continue;
          }

          if ("value" in dimObj) {
            // KnownMeasurement
            if (
              typeof dimObj.value !== "number" ||
              !Number.isFinite(dimObj.value)
            ) {
              errors.push(
                `Feature '${fid}' dimension '${key}' value must be a finite number`,
              );
            }
            if (typeof dimObj.unit !== "string" || dimObj.unit.trim() === "") {
              errors.push(
                `Feature '${fid}' dimension '${key}' is missing unit or invalid unit`,
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
              typeof dimObj.confidence !== "string" ||
              !validConfidences.includes(dimObj.confidence)
            ) {
              errors.push(
                `Feature '${fid}' dimension '${key}' has invalid confidence '${dimObj.confidence}'`,
              );
            }
            if (Array.isArray(dimObj.provenance_refs)) {
              for (const ref of dimObj.provenance_refs) {
                if (typeof ref !== "string" || !validSources.has(ref)) {
                  errors.push(
                    `Feature '${fid}' dimension '${key}' has broken provenance_ref '${ref}'`,
                  );
                }
              }
            }
          } else if ("state" in dimObj) {
            // UnknownMeasurement
            const validUnknowns = [
              "unknown",
              "unreadable",
              "contradictory",
              "unsupported",
            ];
            if (
              typeof dimObj.state !== "string" ||
              !validUnknowns.includes(dimObj.state)
            ) {
              errors.push(
                `Feature '${fid}' dimension '${key}' has invalid unknown state '${dimObj.state}'`,
              );
            }
          } else {
            errors.push(
              `Feature '${fid}' dimension '${key}' is neither a valid KnownMeasurement nor UnknownMeasurement`,
            );
          }
        }
      } else if (dimensions !== undefined) {
        errors.push(`Feature '${fid}' dimensions must be an object`);
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

  for (const z of validZones) checkUniqueId(z, "zones");

  if (Array.isArray(spec.cameras)) {
    for (const c of spec.cameras) {
      if (
        c &&
        typeof c === "object" &&
        typeof (c as Record<string, unknown>).id === "string"
      ) {
        checkUniqueId((c as Record<string, unknown>).id as string, "cameras");
      } else {
        errors.push("Malformed camera entry");
      }
    }
  }

  if (Array.isArray(spec.anchors)) {
    for (const a of spec.anchors) {
      if (
        a &&
        typeof a === "object" &&
        typeof (a as Record<string, unknown>).id === "string"
      ) {
        checkUniqueId((a as Record<string, unknown>).id as string, "anchors");
      } else {
        errors.push("Malformed anchor entry");
      }
    }
  }

  if (Array.isArray(spec.foreground_occlusion_objects)) {
    for (const o of spec.foreground_occlusion_objects) {
      if (
        o &&
        typeof o === "object" &&
        typeof (o as Record<string, unknown>).id === "string"
      ) {
        checkUniqueId(
          (o as Record<string, unknown>).id as string,
          "foreground_occlusion_objects",
        );
      } else {
        errors.push("Malformed occlusion object entry");
      }
    }
  }

  if (Array.isArray(spec.cameras)) {
    for (const camera of spec.cameras) {
      if (camera && typeof camera === "object" && "target_zone_id" in camera) {
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
    if (
      typeof scaleEv.state !== "string" ||
      !validScaleStates.includes(scaleEv.state)
    ) {
      errors.push(`Invalid scale state '${scaleEv.state}'`);
    }

    if (scaleEv.calibration && typeof scaleEv.calibration === "object") {
      const cal = scaleEv.calibration as Record<string, unknown>;
      const validCalStates = ["resolved", "unresolved", "uncertain"];
      if (
        typeof cal.state !== "string" ||
        !validCalStates.includes(cal.state)
      ) {
        errors.push(`Invalid calibration state '${cal.state}'`);
      }

      if (cal.state === "resolved") {
        if (
          typeof cal.evidence_identifier !== "string" ||
          !validSources.has(cal.evidence_identifier)
        ) {
          errors.push(
            `Resolved calibration requires valid 'evidence_identifier'`,
          );
        }
        if (
          typeof cal.reference_dimension !== "number" ||
          cal.reference_dimension <= 0 ||
          !Number.isFinite(cal.reference_dimension)
        ) {
          errors.push(
            `Resolved calibration requires finite positive 'reference_dimension'`,
          );
        }
        if (typeof cal.units !== "string" || cal.units.trim() === "") {
          errors.push(`Resolved calibration requires non-empty 'units'`);
        }

        let hasValidPixelBasis = false;
        if (
          typeof cal.pixel_span === "number" &&
          cal.pixel_span > 0 &&
          Number.isFinite(cal.pixel_span)
        ) {
          hasValidPixelBasis = true;
        }
        if (Array.isArray(cal.pixel_points) && cal.pixel_points.length > 0) {
          let validPoints = true;
          for (const p of cal.pixel_points) {
            if (
              !p ||
              typeof p !== "object" ||
              typeof p.x !== "number" ||
              typeof p.y !== "number" ||
              !Number.isFinite(p.x) ||
              !Number.isFinite(p.y)
            ) {
              validPoints = false;
              break;
            }
          }
          if (validPoints) hasValidPixelBasis = true;
        }
        if (!hasValidPixelBasis) {
          errors.push(
            `Resolved calibration requires finite positive 'pixel_span' or non-empty valid 'pixel_points' array`,
          );
        }
      }

      if (cal.evidence_reference_linkage) {
        if (!Array.isArray(cal.evidence_reference_linkage)) {
          errors.push(
            `Calibration evidence_reference_linkage must be an array`,
          );
        } else {
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
  }

  if (spec.residuals !== undefined) {
    if (!Array.isArray(spec.residuals)) {
      errors.push("Invalid residuals type");
    } else {
      for (const res of spec.residuals) {
        if (!res || typeof res !== "object") {
          errors.push("Invalid residual entry");
          continue;
        }
        const validResStates = ["PASS", "FAIL", "BLOCKED", "UNRESOLVED"];
        if (
          typeof res.state !== "string" ||
          !validResStates.includes(res.state)
        ) {
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

  if (spec.effective_version !== undefined) {
    if (!spec.effective_version || typeof spec.effective_version !== "object") {
      errors.push("Invalid effective_version object");
    } else {
      const ev = spec.effective_version as Record<string, unknown>;
      const validTemporalStates = [
        "CURRENT_VERIFIED",
        "STABLE_RECONCILED",
        "PRE_CHANGE_DELTA_REQUIRED",
        "EFFECTIVE_DATE_UNCERTAIN",
        "HISTORICAL_VERSION_ONLY",
      ];
      if (
        typeof ev.state !== "string" ||
        !validTemporalStates.includes(ev.state)
      ) {
        errors.push(`Invalid temporal state '${ev.state}'.`);
      }
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
              ? ((a as Record<string, unknown>).id as string)
              : "";
          const bId =
            typeof (b as Record<string, unknown>).id === "string"
              ? ((b as Record<string, unknown>).id as string)
              : "";
          return aId.localeCompare(bId);
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
