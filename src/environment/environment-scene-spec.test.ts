import { describe, expect, it } from "vitest";
import {
  parseEnvironmentSceneSpec,
  serializeEnvironmentSceneSpec,
  validateEnvironmentSceneSpec,
  type EnvironmentSceneSpec,
} from "./environment-scene-spec";

function baseSpec(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    environment_id: "environment:test",
    fidelity_tier: "F2",
    ...overrides,
  };
}

function expectInvalid(input: unknown, messageFragment?: string): string {
  const result = validateEnvironmentSceneSpec(input);
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
  const messages = result.errors.join("\n");
  if (messageFragment) expect(messages).toContain(messageFragment);
  return messages;
}

function roundTrip(spec: EnvironmentSceneSpec): EnvironmentSceneSpec {
  const parsed = parseEnvironmentSceneSpec(JSON.stringify(spec));
  const canonical = serializeEnvironmentSceneSpec(parsed);
  const reconstructed = parseEnvironmentSceneSpec(canonical);
  expect(validateEnvironmentSceneSpec(reconstructed)).toEqual({
    valid: true,
    errors: [],
  });
  return reconstructed;
}

function specWithMeasurement(measurement: unknown): Record<string, unknown> {
  return baseSpec({
    sources: [{ id: "source:plan", source_type: "measured-drawing" }],
    walls: [
      {
        id: "feature:wall",
        type: "wall",
        geometry_grade: "G4",
        dimensions: { length: measurement },
      },
    ],
  });
}

function resolvedCalibrationSpec(
  calibrationOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return baseSpec({
    sources: [
      { id: "source:sheet-a", source_type: "measured-drawing" },
      { id: "source:sheet-b", source_type: "survey-note" },
    ],
    scale_evidence: {
      state: "known",
      calibration: {
        state: "resolved",
        evidence_identifier: "source:sheet-a",
        evidence_reference_linkage: ["source:sheet-a"],
        reference_dimension: 12,
        units: "feet",
        pixel_span: 240,
        ...calibrationOverrides,
      },
    },
  });
}

describe("environment scene measurements", () => {
  it("round-trips a known measurement through parse, canonical serialization, parse, and validation", () => {
    const reconstructed = roundTrip({
      environment_id: "environment:known",
      fidelity_tier: "F3",
      sources: [{ id: "source:survey", source_type: "survey" }],
      walls: [
        {
          id: "feature:north-wall",
          type: "wall",
          geometry_grade: "G5",
          dimensions: {
            length: {
              value: 42.5,
              unit: "feet",
              confidence: "exact",
              provenance_refs: ["source:survey"],
            },
          },
        },
      ],
    });

    expect(reconstructed.walls?.[0]?.dimensions?.length).toEqual({
      value: 42.5,
      unit: "feet",
      confidence: "exact",
      provenance_refs: ["source:survey"],
    });
  });

  it("round-trips an explicit unknown measurement without inventing a number", () => {
    const reconstructed = roundTrip({
      environment_id: "environment:unknown",
      fidelity_tier: "F2",
      walls: [
        {
          id: "feature:obscured-wall",
          type: "wall",
          geometry_grade: "G1",
          dimensions: {
            height: { state: "unreadable", reason: "Drawing is damaged." },
          },
        },
      ],
    });

    expect(reconstructed.walls?.[0]?.dimensions?.height).toEqual({
      state: "unreadable",
      reason: "Drawing is damaged.",
    });
    expect(reconstructed.walls?.[0]?.dimensions?.height).not.toHaveProperty(
      "value",
    );
  });

  it("round-trips literal zero as a known measurement", () => {
    const reconstructed = roundTrip({
      environment_id: "environment:zero",
      fidelity_tier: "F1",
      levels_steps: [
        {
          id: "feature:datum",
          type: "level-datum",
          geometry_grade: "G4",
          dimensions: {
            elevation: { value: 0, unit: "feet", confidence: "specified" },
          },
        },
      ],
    });

    expect(reconstructed.levels_steps?.[0]?.dimensions?.elevation).toEqual({
      value: 0,
      unit: "feet",
      confidence: "specified",
    });
  });

  it("keeps missing, explicit unknown, and literal zero distinct after the full round trip", () => {
    const reconstructed = roundTrip({
      environment_id: "environment:three-states",
      fidelity_tier: "F2",
      fixed_furniture: [
        {
          id: "feature:dais-desk",
          type: "desk",
          geometry_grade: "G2",
          dimensions: {
            offset: { value: 0, unit: "inches", confidence: "exact" },
            depth: { state: "unknown" },
          },
        },
      ],
    });

    const dimensions = reconstructed.fixed_furniture?.[0]?.dimensions;
    expect(dimensions?.offset).toMatchObject({ value: 0 });
    expect(dimensions?.depth).toEqual({ state: "unknown" });
    expect(Object.hasOwn(dimensions ?? {}, "width")).toBe(false);
  });

  it("rejects invalid confidence and unknown-state vocabulary", () => {
    expectInvalid(
      specWithMeasurement({ value: 2, unit: "feet", confidence: "guessed" }),
      "confidence has invalid value",
    );
    expectInvalid(
      specWithMeasurement({ state: "probably-unknown" }),
      "state has invalid value",
    );
  });

  it("rejects nonfinite known measurements supplied through direct unknown validation", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -Infinity]) {
      expectInvalid(
        specWithMeasurement({ value, unit: "feet", confidence: "exact" }),
        ".value must be a finite number",
      );
    }
  });

  it("rejects known measurements missing a unit or confidence", () => {
    expectInvalid(
      specWithMeasurement({ value: 10, confidence: "exact" }),
      ".unit must be a non-empty string",
    );
    expectInvalid(
      specWithMeasurement({ value: 10, unit: "feet" }),
      ".confidence has invalid value",
    );
  });

  it("rejects hybrid known and unknown measurement discriminators", () => {
    expectInvalid(
      specWithMeasurement({
        value: 10,
        state: "unknown",
        unit: "feet",
        confidence: "exact",
      }),
      "cannot contain both known 'value' and unknown 'state'",
    );
  });

  it("rejects non-array measurement provenance and empty or broken references", () => {
    expectInvalid(
      specWithMeasurement({
        value: 10,
        unit: "feet",
        confidence: "exact",
        provenance_refs: "source:plan",
      }),
      "provenance_refs must be an array",
    );
    expectInvalid(
      specWithMeasurement({
        value: 10,
        unit: "feet",
        confidence: "exact",
        provenance_refs: [""],
      }),
      "must be a non-empty string",
    );
    expectInvalid(
      specWithMeasurement({
        value: 10,
        unit: "feet",
        confidence: "exact",
        provenance_refs: ["source:missing"],
      }),
      "references unknown source ID 'source:missing'",
    );
  });
});

describe("runtime input and shape validation", () => {
  it("explicitly rejects malformed JSON", () => {
    expect(() => parseEnvironmentSceneSpec("{not-json")).toThrowError(
      /Malformed JSON:/,
    );
  });

  it("rejects null and array top levels with structured validation errors", () => {
    expect(validateEnvironmentSceneSpec(null)).toEqual({
      valid: false,
      errors: ["Input must be a JSON object."],
    });
    expect(validateEnvironmentSceneSpec([])).toEqual({
      valid: false,
      errors: ["Input must be a JSON object."],
    });
  });

  it("rejects missing and empty environment IDs", () => {
    expectInvalid({ fidelity_tier: "F1" }, "environment_id");
    expectInvalid(baseSpec({ environment_id: "   " }), "environment_id");
  });

  it("rejects missing and invalid fidelity tiers", () => {
    expectInvalid({ environment_id: "environment:x" }, "fidelity_tier");
    expectInvalid(baseSpec({ fidelity_tier: "F5" }), "fidelity_tier");
  });

  it.each([
    "sources",
    "zones",
    "cameras",
    "anchors",
    "foreground_occlusion_objects",
    "residuals",
  ])("rejects a wrong runtime shape for optional array field %s", (field) => {
    expectInvalid(
      baseSpec({ [field]: { not: "an array" } }),
      "must be an array",
    );
  });

  it.each([
    "room_outline",
    "walls",
    "doors_openings",
    "levels_steps",
    "ceiling_profile",
    "fixed_architectural_geometry",
    "fixed_furniture",
    "gallery_relationships",
  ])("rejects a wrong runtime shape for feature array %s", (field) => {
    expectInvalid(baseSpec({ [field]: "not-an-array" }), "must be an array");
  });

  it("rejects malformed entries instead of silently accepting them", () => {
    expectInvalid(
      baseSpec({ sources: [null] }),
      "sources[0] must be an object",
    );
    expectInvalid(baseSpec({ zones: [42] }), "zones[0] must be an object");
    expectInvalid(baseSpec({ cameras: [[]] }), "cameras[0] must be an object");
    expectInvalid(
      baseSpec({ anchors: ["anchor"] }),
      "anchors[0] must be an object",
    );
    expectInvalid(
      baseSpec({ foreground_occlusion_objects: [false] }),
      "foreground_occlusion_objects[0] must be an object",
    );
    expectInvalid(baseSpec({ walls: [null] }), "walls[0] must be an object");
    expectInvalid(
      baseSpec({ residuals: [0] }),
      "residuals[0] must be an object",
    );
  });

  it("returns a structured error when hostile runtime property access throws", () => {
    const hostileInput = new Proxy<Record<string, unknown>>(
      {},
      {
        get() {
          throw new TypeError("property access failed");
        },
      },
    );

    expect(validateEnvironmentSceneSpec(hostileInput)).toEqual({
      valid: false,
      errors: [
        "Input could not be inspected safely as an EnvironmentSceneSpec.",
      ],
    });
  });

  it("rejects array and scalar values for object fields", () => {
    expectInvalid(
      baseSpec({ scale_evidence: [] }),
      "scale_evidence must be an object",
    );
    expectInvalid(
      baseSpec({ effective_version: [] }),
      "effective_version must be an object",
    );
    expectInvalid(
      baseSpec({ scale_evidence: { state: "known", calibration: [] } }),
      "calibration must be an object",
    );
    expectInvalid(
      baseSpec({
        walls: [
          {
            id: "feature:wall",
            type: "wall",
            geometry_grade: "G3",
            dimensions: [],
          },
        ],
      }),
      "dimensions must be an object",
    );
  });

  it("rejects invalid geometry, scale, calibration, and residual vocabularies", () => {
    expectInvalid(
      baseSpec({
        walls: [{ id: "feature:wall", type: "wall", geometry_grade: "G6" }],
      }),
      "geometry_grade has invalid value",
    );
    expectInvalid(
      baseSpec({ scale_evidence: { state: "estimated" } }),
      "scale_evidence.state has invalid value",
    );
    expectInvalid(
      baseSpec({
        scale_evidence: { state: "known", calibration: { state: "maybe" } },
      }),
      "calibration.state has invalid value",
    );
    expectInvalid(
      baseSpec({
        residuals: [{ what_was_compared: "wall closure", state: "PENDING" }],
      }),
      "residuals[0].state has invalid value",
    );
  });

  it("rejects malformed residual measurements and nonfinite residual errors", () => {
    expectInvalid(
      baseSpec({
        residuals: [
          {
            what_was_compared: "wall closure",
            state: "UNRESOLVED",
            expected_reference_dimension: [],
          },
        ],
      }),
      "expected_reference_dimension must be a measurement object",
    );
    expectInvalid(
      baseSpec({
        residuals: [
          {
            what_was_compared: "wall closure",
            state: "UNRESOLVED",
            residual_error: Number.NaN,
          },
        ],
      }),
      "residual_error must be a finite number",
    );
  });
});

describe("raster tier lineage", () => {
  function withTiers(tiers: unknown): Record<string, unknown> {
    return baseSpec({ raster: { asset_id: "env_test_plate", tiers } });
  }

  const tier = (
    width: number,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    width,
    height: Math.round((width * 9) / 16),
    path: `art/generated/env_test_plate-${width}.png`,
    hash: `${width}`.padStart(64, "0"),
    derivation: "deterministic-downscale",
    ...extra,
  });

  it("accepts a plain downscale ladder", () => {
    expect(
      validateEnvironmentSceneSpec(withTiers([tier(1_024), tier(2_048)])),
    ).toEqual({ valid: true, errors: [] });
  });

  it("accepts an external upscale derivative that declares where detail stops", () => {
    expect(
      validateEnvironmentSceneSpec(
        withTiers([
          tier(1_024),
          tier(2_048, {
            derivation: "external-upscale-derivative",
            native_detail_width: 1_024,
          }),
        ]),
      ),
    ).toEqual({ valid: true, errors: [] });
  });

  it("rejects enlarged lineage that will not say where detail stops", () => {
    expectInvalid(
      withTiers([tier(2_048, { derivation: "external-upscale-derivative" })]),
      "must declare the native_detail_width",
    );
    expectInvalid(
      withTiers([tier(2_048, { derivation: "upscaled-development-fixture" })]),
      "must declare the native_detail_width",
    );
  });

  it("rejects a declared detail width above the tier's own pixels", () => {
    expectInvalid(
      withTiers([
        tier(2_048, {
          derivation: "external-upscale-derivative",
          native_detail_width: 4_096,
        }),
      ]),
      "must declare the native_detail_width",
    );
  });

  it("rejects a detail width on a derivation whose pixels are the truth", () => {
    expectInvalid(
      withTiers([tier(2_048, { native_detail_width: 1_024 })]),
      "claims full native detail",
    );
    expectInvalid(
      withTiers([
        tier(2_048, {
          derivation: "native-master",
          native_detail_width: 1_024,
        }),
      ]),
      "claims full native detail",
    );
  });

  it("rejects an unrecognised derivation", () => {
    expectInvalid(
      withTiers([tier(2_048, { derivation: "vibes" })]),
      "derivation has invalid value",
    );
  });
});

describe("source and scene reference integrity", () => {
  it("rejects empty source IDs and source types", () => {
    expectInvalid(
      baseSpec({ sources: [{ id: "", source_type: "drawing" }] }),
      "sources[0].id must be a non-empty string",
    );
    expectInvalid(
      baseSpec({ sources: [{ id: "source:a", source_type: " " }] }),
      "sources[0].source_type must be a non-empty string",
    );
  });

  it("rejects duplicate source IDs", () => {
    expectInvalid(
      baseSpec({
        sources: [
          { id: "source:a", source_type: "drawing" },
          { id: "source:a", source_type: "photograph" },
        ],
      }),
      "Duplicate source ID 'source:a'",
    );
  });

  it("accepts multiple legitimate authority classes without manufacturing a conflict", () => {
    const spec = baseSpec({
      sources: [
        {
          id: "source:survey",
          source_type: "survey",
          authority_class: "primary-measurement",
        },
        {
          id: "source:photo",
          source_type: "photograph",
          authority_class: "visual-corroboration",
        },
      ],
    });
    expect(validateEnvironmentSceneSpec(spec)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects duplicate IDs within or across scene identity collections", () => {
    expectInvalid(
      baseSpec({
        walls: [{ id: "scene:duplicate", type: "wall", geometry_grade: "G3" }],
        doors_openings: [
          { id: "scene:duplicate", type: "door", geometry_grade: "G3" },
        ],
      }),
      "Duplicate scene ID 'scene:duplicate'",
    );
    expectInvalid(
      baseSpec({
        zones: [{ id: "scene:duplicate", type: "public" }],
        anchors: [{ id: "scene:duplicate", type: "datum" }],
      }),
      "Duplicate scene ID 'scene:duplicate'",
    );
  });

  it("rejects broken camera-to-zone references", () => {
    expectInvalid(
      baseSpec({
        zones: [{ id: "zone:floor", type: "floor" }],
        cameras: [{ id: "camera:wide", target_zone_id: "zone:missing" }],
      }),
      "references unknown zone ID 'zone:missing'",
    );
  });

  it("rejects malformed feature-level provenance references", () => {
    expectInvalid(
      baseSpec({
        sources: [{ id: "source:a", source_type: "drawing" }],
        walls: [
          {
            id: "feature:wall",
            type: "wall",
            geometry_grade: "G3",
            provenance_refs: "source:a",
          },
        ],
      }),
      "walls[0].provenance_refs must be an array",
    );
  });
});

describe("calibration and scale evidence", () => {
  it("accepts resolved calibration with a positive pixel span", () => {
    expect(validateEnvironmentSceneSpec(resolvedCalibrationSpec())).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("accepts resolved calibration with at least two finite pixel points", () => {
    const spec = resolvedCalibrationSpec({
      pixel_span: undefined,
      pixel_points: [
        { x: 0, y: 10 },
        { x: 200, y: 10 },
      ],
    });
    expect(validateEnvironmentSceneSpec(spec)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects missing and broken calibration evidence sources", () => {
    expectInvalid(
      resolvedCalibrationSpec({ evidence_identifier: undefined }),
      "evidence_identifier must be a non-empty source ID",
    );
    expectInvalid(
      resolvedCalibrationSpec({ evidence_identifier: "source:missing" }),
      "evidence_identifier references unknown source ID 'source:missing'",
    );
  });

  it("rejects missing, empty, non-array, and broken evidence linkage", () => {
    expectInvalid(
      resolvedCalibrationSpec({ evidence_reference_linkage: undefined }),
      "evidence_reference_linkage is required",
    );
    expectInvalid(
      resolvedCalibrationSpec({ evidence_reference_linkage: [] }),
      "must contain at least one reference",
    );
    expectInvalid(
      resolvedCalibrationSpec({ evidence_reference_linkage: "source:sheet-a" }),
      "evidence_reference_linkage must be an array",
    );
    expectInvalid(
      resolvedCalibrationSpec({
        evidence_reference_linkage: ["source:missing"],
      }),
      "references unknown source ID 'source:missing'",
    );
  });

  it("rejects zero, negative, and nonfinite pixel spans", () => {
    for (const pixelSpan of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectInvalid(
        resolvedCalibrationSpec({ pixel_span: pixelSpan }),
        "pixel_span must be a finite positive number",
      );
    }
  });

  it("rejects empty and one-point calibration arrays", () => {
    expectInvalid(
      resolvedCalibrationSpec({ pixel_span: undefined, pixel_points: [] }),
      "pixel_points must contain at least two points",
    );
    expectInvalid(
      resolvedCalibrationSpec({
        pixel_span: undefined,
        pixel_points: [{ x: 0, y: 0 }],
      }),
      "pixel_points must contain at least two points",
    );
  });

  it("rejects non-array and malformed pixel points", () => {
    expectInvalid(
      resolvedCalibrationSpec({
        pixel_span: undefined,
        pixel_points: { x: 0, y: 0 },
      }),
      "pixel_points must be an array",
    );
    expectInvalid(
      resolvedCalibrationSpec({
        pixel_span: undefined,
        pixel_points: [
          { x: 0, y: 0 },
          { x: Number.NaN, y: 2 },
        ],
      }),
      "must contain finite numeric x and y values",
    );
    expectInvalid(
      resolvedCalibrationSpec({
        pixel_span: undefined,
        pixel_points: [{ x: 0, y: 0 }, null],
      }),
      "pixel_points[1] must be an object",
    );
  });

  it("rejects zero, negative, and nonfinite reference dimensions", () => {
    for (const referenceDimension of [
      0,
      -12,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expectInvalid(
        resolvedCalibrationSpec({ reference_dimension: referenceDimension }),
        "reference_dimension must be a finite positive number",
      );
    }
  });

  it.each(["unresolved", "uncertain"])(
    "accepts %s calibration without fabricated evidence or numbers",
    (state) => {
      const spec = baseSpec({
        scale_evidence: { state: "unresolved", calibration: { state } },
      });
      expect(validateEnvironmentSceneSpec(spec)).toEqual({
        valid: true,
        errors: [],
      });
    },
  );

  it("rejects resolved-only evidence fields on unresolved calibration", () => {
    expectInvalid(
      baseSpec({
        scale_evidence: {
          state: "unresolved",
          calibration: { state: "unresolved", pixel_span: 100 },
        },
      }),
      "cannot contain resolved-only field 'pixel_span'",
    );
  });

  it("accepts unresolved scale without calibration", () => {
    expect(
      validateEnvironmentSceneSpec(
        baseSpec({ scale_evidence: { state: "unresolved" } }),
      ),
    ).toEqual({ valid: true, errors: [] });
  });
});

describe("temporal and residual states", () => {
  it.each([
    "CURRENT_VERIFIED",
    "STABLE_RECONCILED",
    "PRE_CHANGE_DELTA_REQUIRED",
    "EFFECTIVE_DATE_UNCERTAIN",
    "HISTORICAL_VERSION_ONLY",
  ])("preserves temporal state %s without promotion", (state) => {
    const parsed = parseEnvironmentSceneSpec(
      JSON.stringify(baseSpec({ effective_version: { state } })),
    );
    expect(parsed.effective_version?.state).toBe(state);
  });

  it("rejects an invalid temporal state", () => {
    expectInvalid(
      baseSpec({ effective_version: { state: "CURRENT_ASSUMED" } }),
      "effective_version.state has invalid value",
    );
  });

  it.each([
    { state: "PASS", tolerance_basis: "within one inch" },
    { state: "FAIL", tolerance_basis: "within one inch" },
    { state: "BLOCKED", blocking_reason: "Scale is unresolved." },
    { state: "UNRESOLVED" },
  ])(
    "accepts residual state $state without manufacturing measurements",
    (residual) => {
      const spec = baseSpec({
        residuals: [{ what_was_compared: "wall closure", ...residual }],
      });
      expect(validateEnvironmentSceneSpec(spec)).toEqual({
        valid: true,
        errors: [],
      });
    },
  );

  it("requires an explanation for a blocked residual", () => {
    expectInvalid(
      baseSpec({
        residuals: [{ what_was_compared: "wall closure", state: "BLOCKED" }],
      }),
      "blocking_reason is required for BLOCKED",
    );
  });
});

describe("canonical serialization", () => {
  it("produces identical canonical JSON for equivalent unordered identities and references", () => {
    const specA: EnvironmentSceneSpec = {
      environment_id: "environment:canonical",
      fidelity_tier: "F4",
      sources: [
        { id: "source:b", source_type: "photo" },
        { id: "source:a", source_type: "drawing" },
      ],
      zones: [
        { id: "zone:b", type: "public" },
        { id: "zone:a", type: "members" },
      ],
      cameras: [
        { id: "camera:b", target_zone_id: "zone:b" },
        { id: "camera:a", target_zone_id: "zone:a" },
      ],
      anchors: [
        { id: "anchor:b", type: "column" },
        { id: "anchor:a", type: "datum" },
      ],
      foreground_occlusion_objects: [
        { id: "occluder:b", type: "rail" },
        { id: "occluder:a", type: "desk" },
      ],
      walls: [
        {
          id: "wall:z",
          type: "wall",
          geometry_grade: "G4",
          dimensions: {
            length: {
              value: 20,
              unit: "feet",
              confidence: "plan-derived",
              provenance_refs: ["source:b", "source:a"],
            },
          },
        },
        { id: "wall:a", type: "wall", geometry_grade: "G2" },
      ],
      scale_evidence: {
        state: "known",
        calibration: {
          state: "resolved",
          evidence_identifier: "source:a",
          evidence_reference_linkage: ["source:b", "source:a"],
          reference_dimension: 20,
          units: "feet",
          pixel_span: 400,
        },
      },
    };

    const specB: EnvironmentSceneSpec = {
      scale_evidence: {
        calibration: {
          pixel_span: 400,
          units: "feet",
          reference_dimension: 20,
          evidence_reference_linkage: ["source:a", "source:b"],
          evidence_identifier: "source:a",
          state: "resolved",
        },
        state: "known",
      },
      walls: [
        {
          dimensions: {
            length: {
              provenance_refs: ["source:a", "source:b"],
              confidence: "plan-derived",
              unit: "feet",
              value: 20,
            },
          },
          geometry_grade: "G4",
          type: "wall",
          id: "wall:z",
        },
        { geometry_grade: "G2", type: "wall", id: "wall:a" },
      ],
      foreground_occlusion_objects: [
        { type: "desk", id: "occluder:a" },
        { type: "rail", id: "occluder:b" },
      ],
      anchors: [
        { type: "datum", id: "anchor:a" },
        { type: "column", id: "anchor:b" },
      ],
      cameras: [
        { target_zone_id: "zone:a", id: "camera:a" },
        { target_zone_id: "zone:b", id: "camera:b" },
      ],
      zones: [
        { type: "members", id: "zone:a" },
        { type: "public", id: "zone:b" },
      ],
      sources: [
        { source_type: "drawing", id: "source:a" },
        { source_type: "photo", id: "source:b" },
      ],
      fidelity_tier: "F4",
      environment_id: "environment:canonical",
    };

    const canonicalA = serializeEnvironmentSceneSpec(specA);
    const canonicalB = serializeEnvironmentSceneSpec(specB);
    expect(canonicalA).toBe(canonicalB);

    const reconstructed = parseEnvironmentSceneSpec(canonicalA);
    expect(reconstructed.sources?.map(({ id }) => id)).toEqual([
      "source:a",
      "source:b",
    ]);
    expect(reconstructed.zones?.map(({ id }) => id)).toEqual([
      "zone:a",
      "zone:b",
    ]);
    expect(reconstructed.walls?.[0]?.dimensions?.length).toMatchObject({
      provenance_refs: ["source:a", "source:b"],
    });
    expect(
      reconstructed.scale_evidence?.calibration?.state === "resolved"
        ? reconstructed.scale_evidence.calibration.evidence_reference_linkage
        : undefined,
    ).toEqual(["source:a", "source:b"]);
    expect(validateEnvironmentSceneSpec(reconstructed)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("preserves meaningful scene-feature order instead of sorting it by ID", () => {
    const spec: EnvironmentSceneSpec = {
      environment_id: "environment:ordered-scene",
      fidelity_tier: "F2",
      walls: [
        { id: "wall:z-first", type: "wall", geometry_grade: "G2" },
        { id: "wall:a-second", type: "wall", geometry_grade: "G2" },
      ],
    };
    const reconstructed = parseEnvironmentSceneSpec(
      serializeEnvironmentSceneSpec(spec),
    );
    expect(reconstructed.walls?.map(({ id }) => id)).toEqual([
      "wall:z-first",
      "wall:a-second",
    ]);
  });

  it("refuses to serialize a runtime-invalid object", () => {
    expect(() =>
      serializeEnvironmentSceneSpec(
        baseSpec({ zones: "not-an-array" }) as unknown as EnvironmentSceneSpec,
      ),
    ).toThrowError(/Cannot serialize invalid EnvironmentSceneSpec/);
  });
});
