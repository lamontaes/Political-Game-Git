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
        { id: "source-b", source_type: "drawing", authority_class: "historic" },
        { id: "source-a", source_type: "drawing", authority_class: "verified" },
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

    // Check array deterministic canonical sorting (sources is unordered, so must sort id a then b)
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

  it("should cleanly reject malformed JSON and runtime types safely", () => {
    expect(() => parseEnvironmentSceneSpec("not valid json")).toThrow(
      "Malformed JSON",
    );
    expect(() => parseEnvironmentSceneSpec("null")).toThrow(
      "Input must be a JSON object",
    );
    expect(() => parseEnvironmentSceneSpec("[]")).toThrow(
      "Input must be a JSON object",
    );
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

  it("should safely reject malformed optional array/object shapes without crashing", () => {
    expect(() =>
      parseEnvironmentSceneSpec(
        JSON.stringify({
          environment_id: "env",
          fidelity_tier: "F1",
          zones: "this_should_be_an_array",
        }),
      ),
    ).not.toThrow("map is not a function"); // should just fail gracefully or skip if validation ignores non-arrays that aren't critical

    expect(() =>
      parseEnvironmentSceneSpec(
        JSON.stringify({
          environment_id: "env",
          fidelity_tier: "F1",
          walls: [null, 42, "string_in_array"],
        }),
      ),
    ).toThrow("Invalid feature in walls");
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
    const invalidJson1 = JSON.stringify({
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
    expect(() => parseEnvironmentSceneSpec(invalidJson1)).toThrow(
      "Resolved calibration requires finite positive 'pixel_span' or non-empty valid 'pixel_points'",
    );

    // Invalid Resolved (invalid reference_dimension zero/negative)
    const invalidJson2 = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      sources: [{ id: "sheet-A", source_type: "blueprint" }],
      scale_evidence: {
        state: "known",
        calibration: {
          state: "resolved",
          evidence_identifier: "sheet-A",
          reference_dimension: 0,
          units: "ft",
          pixel_span: 100,
        },
      },
    });
    expect(() => parseEnvironmentSceneSpec(invalidJson2)).toThrow(
      "Resolved calibration requires finite positive 'reference_dimension'",
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

  it("should process all five valid temporal states properly", () => {
    const states = [
      "CURRENT_VERIFIED",
      "STABLE_RECONCILED",
      "PRE_CHANGE_DELTA_REQUIRED",
      "EFFECTIVE_DATE_UNCERTAIN",
      "HISTORICAL_VERSION_ONLY",
    ];

    for (const state of states) {
      const validJson = JSON.stringify({
        environment_id: "env-temp",
        fidelity_tier: "F1",
        effective_version: { state },
      });
      expect(
        parseEnvironmentSceneSpec(validJson).effective_version!.state,
      ).toBe(state);
    }

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
    const json = JSON.stringify({
      environment_id: "env-auth",
      fidelity_tier: "F2",
      sources: [
        { id: "verified-cad", source_type: "cad", authority_class: "high" },
        { id: "old-photo", source_type: "photo", authority_class: "low" },
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

  it("should reject duplicate feature and source IDs", () => {
    const json = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      sources: [
        { id: "dup", source_type: "cad" },
        { id: "dup", source_type: "cad" },
      ],
    });
    expect(() => parseEnvironmentSceneSpec(json)).toThrow(
      "Duplicate source ID: 'dup'",
    );
  });

  it("should reject broken camera and measurement provenance references", () => {
    const json = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      zones: [{ id: "zone-1", type: "staff" }],
      cameras: [{ id: "cam-1", target_zone_id: "fake-zone" }],
    });
    expect(() => parseEnvironmentSceneSpec(json)).toThrow(
      "invalid target_zone_id",
    );

    const json2 = JSON.stringify({
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
    expect(() => parseEnvironmentSceneSpec(json2)).toThrow(
      "broken provenance_ref 'fake-src'",
    );
  });

  it("should reject objects that mix KnownMeasurement and UnknownMeasurement", () => {
    const json = JSON.stringify({
      environment_id: "env",
      fidelity_tier: "F1",
      walls: [
        {
          id: "wall-1",
          type: "wall",
          geometry_grade: "G2",
          dimensions: {
            length: {
              value: 10,
              state: "unknown", // Invalid: mixed
            },
          },
        },
      ],
    });
    expect(() => parseEnvironmentSceneSpec(json)).toThrow(
      "mixes KnownMeasurement and UnknownMeasurement",
    );
  });
});
