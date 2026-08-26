import { describe, it, expect } from "vitest";

import {
  type EnvironmentSceneSpec,
  validateEnvironmentSceneSpec,
  serializeEnvironmentSceneSpec,
} from "./environment-scene-spec";

describe("Environment Scene Spec", () => {
  it("should validate a known measurement round trip", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-1",
      sources: [{ id: "source-1", source_type: "drawing" }],
      fidelity_tier: "F3",
      walls: [
        {
          id: "wall-1",
          type: "wall",
          geometry_grade: "G4",
          dimensions: {
            length: {
              value: 120,
              unit: "inches",
              confidence: "exact",
              provenance_refs: ["source-1"],
            },
          },
        },
      ],
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("should validate a missing measurement correctly", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-2",
      fidelity_tier: "F3",
      walls: [
        {
          id: "wall-missing",
          type: "wall",
          geometry_grade: "G1",
          dimensions: {
            length: {
              state: "unknown",
              reason: "not measured",
            },
          },
        },
      ],
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("should preserve literal zero measurement as valid", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-3",
      fidelity_tier: "F3",
      levels_steps: [
        {
          id: "step-1",
          type: "step",
          geometry_grade: "G5",
          dimensions: {
            dais_height: {
              value: 0,
              unit: "inches",
              confidence: "exact",
            },
          },
        },
      ],
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    // Explicitly check zero survived
    expect(
      (spec.levels_steps![0].dimensions!.dais_height as { value: number })
        .value,
    ).toBe(0);
  });

  it("should enforce deterministic canonical serialization", () => {
    const spec1: EnvironmentSceneSpec = {
      fidelity_tier: "F2",
      environment_id: "env-4",
      anchors: [{ id: "a1", type: "interaction" }],
    };
    const spec2: EnvironmentSceneSpec = {
      environment_id: "env-4",
      anchors: [{ type: "interaction", id: "a1" }],
      fidelity_tier: "F2",
    };

    const s1 = serializeEnvironmentSceneSpec(spec1);
    const s2 = serializeEnvironmentSceneSpec(spec2);
    expect(s1).toEqual(s2);
  });

  it("should reject duplicate IDs", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-dup",
      fidelity_tier: "F2",
      walls: [
        { id: "wall-same", type: "wall", geometry_grade: "G2" },
        { id: "wall-same", type: "wall", geometry_grade: "G1" },
      ],
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Duplicate ID");
  });

  it("should reject broken reference for camera to zone", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-cam-ref",
      fidelity_tier: "F1",
      zones: [{ id: "zone-1", type: "public" }],
      cameras: [{ id: "cam-1", target_zone_id: "zone-unknown" }],
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("invalid target_zone_id");
  });

  it("should validate structured calibration evidence", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-calib",
      fidelity_tier: "F4",
      sources: [{ id: "sheet-A", source_type: "drawing" }],
      scale_evidence: {
        state: "known",
        calibration: {
          evidence_identifier: "sheet-A",
          pixel_span: 1200,
          reference_dimension: 20,
          units: "feet",
          state: "resolved",
        },
      },
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("should enforce residual state checking logic", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-res",
      fidelity_tier: "F3",
      residuals: [
        {
          what_was_compared: "desk_length",
          state: "FAIL", // FAIL requires a tolerance_basis
        },
      ],
    };
    let result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("missing tolerance_basis");

    spec.residuals![0].state = "BLOCKED";
    spec.residuals![0].blocking_reason = "missing reference dimension";
    result = validateEnvironmentSceneSpec(spec);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("should reject invalid temporal states", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-temp",
      fidelity_tier: "F4",
      sources: [{ id: "sheet-A", source_type: "drawing" }],
      effective_version: {
        state: "SOME_MADE_UP_STATE" as "CURRENT_VERIFIED",
      },
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid temporal state");
  });

  it("should reject duplicate IDs", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-dup",
      fidelity_tier: "F2",
      walls: [
        { id: "wall-same", type: "wall", geometry_grade: "G2" },
        { id: "wall-same", type: "wall", geometry_grade: "G1" },
      ],
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Duplicate ID");
  });

  it("should reject broken reference for camera to zone", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-cam-ref",
      fidelity_tier: "F1",
      zones: [{ id: "zone-1", type: "public" }],
      cameras: [{ id: "cam-1", target_zone_id: "zone-unknown" }],
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("invalid target_zone_id");
  });

  it("should validate structured calibration evidence", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-calib",
      fidelity_tier: "F4",
      sources: [{ id: "sheet-A", source_type: "drawing" }],
      sources: [{ id: "sheet-A", source_type: "drawing" }],
      scale_evidence: {
        state: "known",
        calibration: {
          evidence_identifier: "sheet-A",
          pixel_span: 1200,
          reference_dimension: 20,
          units: "feet",
          state: "resolved",
        },
      },
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("should enforce residual state checking logic", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-res",
      fidelity_tier: "F3",
      residuals: [
        {
          what_was_compared: "desk_length",
          state: "FAIL", // FAIL requires a tolerance_basis
        },
      ],
    };
    let result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("missing tolerance_basis");

    spec.residuals![0].state = "BLOCKED";
    spec.residuals![0].blocking_reason = "missing reference dimension";
    result = validateEnvironmentSceneSpec(spec);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("should reject invalid temporal states", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "env-temp",
      fidelity_tier: "F4",
      sources: [{ id: "sheet-A", source_type: "drawing" }],
      effective_version: {
        state: "SOME_MADE_UP_STATE" as "CURRENT_VERIFIED",
      },
    };
    const result = validateEnvironmentSceneSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid temporal state");
  });
});
