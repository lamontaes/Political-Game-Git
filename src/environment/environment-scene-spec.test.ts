import { describe, it, expect } from "vitest";
import {
  parseEnvironmentSceneSpec,
  serializeEnvironmentSceneSpec,
} from "./environment-scene-spec";

describe("Environment Scene Spec", () => {
  it("should perform true round-trip parse and canonical stringification for a known measurement", () => {
    const rawJSON = JSON.stringify({
      environment_id: "env-rt-1",
      fidelity_tier: "F3",
      sources: [
        { id: "source-b", source_type: "drawing" },
        { id: "source-a", source_type: "drawing" },
      ],
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
              provenance_refs: ["source-a"],
            },
          },
        },
      ],
    });

    const parsed = parseEnvironmentSceneSpec(rawJSON);
    expect(parsed.environment_id).toBe("env-rt-1");
    expect(
      (parsed.walls![0].dimensions!.length as { value: number }).value,
    ).toBe(120);

    const reSerialized = serializeEnvironmentSceneSpec(parsed);
    const reparsedRoundTrip = parseEnvironmentSceneSpec(reSerialized);

    // Check array deterministic order
    expect(reparsedRoundTrip.sources![0].id).toBe("source-a");
    expect(reparsedRoundTrip.sources![1].id).toBe("source-b");
  });

  it("should preserve explicitly missing vs unknown vs literal zero values", () => {
    const rawJSON = JSON.stringify({
      environment_id: "env-zero-test",
      fidelity_tier: "F2",
      walls: [
        {
          id: "wall-zero",
          type: "wall",
          geometry_grade: "G5",
          dimensions: {
            length: { value: 0, unit: "feet", confidence: "exact" },
            height: { state: "unknown", reason: "Illegible" },
            // width is strictly missing
          },
        },
      ],
    });

    const parsed = parseEnvironmentSceneSpec(rawJSON);
    const lengthDim = parsed.walls![0].dimensions!.length as { value: number };
    const heightDim = parsed.walls![0].dimensions!.height as { state: string };
    const widthDim = parsed.walls![0].dimensions!.width;

    expect(lengthDim.value).toBe(0);
    expect(heightDim.state).toBe("unknown");
    expect(widthDim).toBeUndefined();

    const serialized = serializeEnvironmentSceneSpec(parsed);
    const reparsed = parseEnvironmentSceneSpec(serialized);

    expect(
      (reparsed.walls![0].dimensions!.length as { value: number }).value,
    ).toBe(0);
  });

  it("should cleanly reject malformed JSON", () => {
    expect(() => parseEnvironmentSceneSpec("not valid json")).toThrow(
      "Malformed JSON",
    );
  });

  it("should safely reject malformed object schema shapes", () => {
    expect(() =>
      parseEnvironmentSceneSpec(JSON.stringify(["array_instead_of_obj"])),
    ).toThrow("Input must be a JSON object");
    expect(() =>
      parseEnvironmentSceneSpec(JSON.stringify({ fidelity_tier: "F1" })),
    ).toThrow("Missing or invalid 'environment_id'");
  });

  it("should catch closed-vocabulary errors outside TS boundaries", () => {
    expect(() =>
      parseEnvironmentSceneSpec(
        JSON.stringify({
          environment_id: "test",
          fidelity_tier: "F99_MADE_UP",
        }),
      ),
    ).toThrow("Invalid fidelity_tier");
  });

  it("should reject duplicate IDs and broken camera references", () => {
    const json = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      zones: [{ id: "zone-1", type: "staff" }],
      cameras: [{ id: "cam-1", target_zone_id: "fake-zone" }],
      walls: [
        { id: "wall-dup", type: "wall", geometry_grade: "G0" },
        { id: "wall-dup", type: "wall", geometry_grade: "G0" },
      ],
    });
    expect(() => parseEnvironmentSceneSpec(json)).toThrow(
      "Duplicate ID found: 'wall-dup'",
    );

    const json2 = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      zones: [{ id: "zone-1", type: "staff" }],
      cameras: [{ id: "cam-1", target_zone_id: "fake-zone" }],
    });
    expect(() => parseEnvironmentSceneSpec(json2)).toThrow(
      "invalid target_zone_id",
    );
  });

  it("should enforce broken source/evidence references for measurement provenance", () => {
    const json = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      sources: [{ id: "src-1", source_type: "drawing" }],
      walls: [
        {
          id: "wall-1",
          type: "wall",
          geometry_grade: "G2",
          dimensions: {
            length: {
              value: 10,
              unit: "ft",
              confidence: "exact",
              provenance_refs: ["fake-src"],
            },
          },
        },
      ],
    });
    expect(() => parseEnvironmentSceneSpec(json)).toThrow(
      "broken provenance_ref 'fake-src'",
    );
  });

  it("should enforce valid, malformed, and unresolved calibration evidence constraints", () => {
    // Valid Resolved
    const validJson = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      sources: [{ id: "sheet-A", source_type: "blueprint" }],
      scale_evidence: {
        state: "known",
        calibration: {
          state: "resolved",
          evidence_identifier: "sheet-A",
          reference_dimension: 10,
          units: "ft",
          pixel_span: 100,
        },
      },
    });
    expect(parseEnvironmentSceneSpec(validJson).environment_id).toBe("env");

    // Invalid Resolved (missing pixel basis)
    const invalidJson = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      sources: [{ id: "sheet-A", source_type: "blueprint" }],
      scale_evidence: {
        state: "known",
        calibration: {
          state: "resolved",
          evidence_identifier: "sheet-A",
          reference_dimension: 10,
          units: "ft",
        },
      },
    });
    expect(() => parseEnvironmentSceneSpec(invalidJson)).toThrow(
      "Resolved calibration requires either 'pixel_span' or 'pixel_points'",
    );

    // Unresolved Calibration (requires no fake numbers)
    const unresolvedJson = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      scale_evidence: {
        state: "unresolved",
        calibration: {
          state: "unresolved",
        },
      },
    });
    expect(parseEnvironmentSceneSpec(unresolvedJson).environment_id).toBe(
      "env",
    );
  });

  it("should process multiple valid temporal states properly", () => {
    const validJson = JSON.stringify({
      environment_id: "env-temp",
      fidelity_tier: "F1",
      effective_version: {
        state: "HISTORICAL_VERSION_ONLY",
      },
    });
    expect(parseEnvironmentSceneSpec(validJson).effective_version!.state).toBe(
      "HISTORICAL_VERSION_ONLY",
    );

    const invalidJson = JSON.stringify({
      environment_id: "env-temp",
      fidelity_tier: "F1",
      effective_version: {
        state: "SOME_MADE_UP_STATE",
      },
    });
    expect(() => parseEnvironmentSceneSpec(invalidJson)).toThrow(
      "Invalid temporal state",
    );
  });

  it("should allow mixed source authority to coexist legitimately", () => {
    // Contract supports features containing geometry_grades from G0-G5 seamlessly across different elements
    const json = JSON.stringify({
      environment_id: "env-auth",
      fidelity_tier: "F2",
      sources: [
        { id: "verified-cad", source_type: "cad" },
        { id: "old-photo", source_type: "photo" },
      ],
      walls: [
        { id: "wall-1", type: "wall", geometry_grade: "G5" },
        { id: "wall-2", type: "wall", geometry_grade: "G1" },
      ],
    });
    const parsed = parseEnvironmentSceneSpec(json);
    expect(parsed.walls![0].geometry_grade).toBe("G5");
    expect(parsed.walls![1].geometry_grade).toBe("G1");
  });
});
