import { describe, expect, it } from "vitest";

import {
  parseEmpiricalRecordProvenance,
  parseRawSourceArtifact,
  parseSourceRecordLocator,
  parseTransformationManifest,
  validateEmpiricalRecordProvenance,
  validateRawSourceArtifact,
  validateSourceRecordLocator,
  validateTransformationManifest,
  type EmpiricalRecordProvenance,
  type RawSourceArtifact,
  type SourceRecordLocator,
  type TransformationManifest,
} from "./provenance.js";

const VALID_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const ALT_VALID_SHA256 =
  "f1d2d2f924e986ac86fdf7b36c94bcdf32beec15defc68aad0711082e6d92582";

function createValidArtifact(): RawSourceArtifact {
  return {
    id: "artifact-nces-sch-2023",
    provider: "NCES CCD",
    authoritativeUrl: "https://nces.ed.gov/ccd/files/school_data_2023.csv",
    retrievedAt: "2024-01-15T12:00:00Z",
    sourceVintage: "2022-2023",
    rawFilename: "school_data_2023.csv",
    byteLength: 1048576,
    sha256: VALID_SHA256,
    mimeType: "text/csv",
    licenseOrAttribution: "Public Domain / U.S. Government Work",
    retrievalMethod: "HTTPS GET",
  };
}

function createValidManifest(): TransformationManifest {
  return {
    id: "manifest-nces-sch-parser-v1",
    parserName: "nces-school-compiler",
    parserVersion: "1.0.0",
    inputArtifactIds: ["artifact-nces-sch-2023"],
    transformationDescription:
      "Parses raw NCES CSV rows into normalized school records.",
    outputArtifactHash: ALT_VALID_SHA256,
    generatedAt: "2024-01-15T12:05:00Z",
    isDeterministic: true,
  };
}

function createValidLocator(): SourceRecordLocator {
  return {
    sourceArtifactId: "artifact-nces-sch-2023",
    locator: "sheet:Schools,row:42",
    providerNativeId: "nces-sch:210000100001",
  };
}

describe("Source Provenance Contract Foundation", () => {
  describe("RawSourceArtifact", () => {
    it("validates a complete, compliant raw source artifact", () => {
      const artifact = createValidArtifact();
      const result = validateRawSourceArtifact(artifact);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const parsed = parseRawSourceArtifact(JSON.stringify(artifact));
      expect(parsed.id).toBe("artifact-nces-sch-2023");
    });

    it("enforces invariant: source hash must be a valid 64-char hex SHA-256", () => {
      const artifact = createValidArtifact();

      // Invalid short hash
      artifact.sha256 = "1234567890abcdef";
      let result = validateRawSourceArtifact(artifact);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("SHA-256"))).toBe(true);

      // Non-hex character
      artifact.sha256 = "z".repeat(64);
      result = validateRawSourceArtifact(artifact);
      expect(result.valid).toBe(false);

      // Empty hash
      artifact.sha256 = "";
      result = validateRawSourceArtifact(artifact);
      expect(result.valid).toBe(false);

      expect(() => parseRawSourceArtifact(artifact)).toThrow(/SHA-256/);
    });

    it("enforces invariant: validators cannot silently manufacture a hash", () => {
      const rawObj = createValidArtifact() as unknown as Record<
        string,
        unknown
      >;
      delete rawObj.sha256;

      const result = validateRawSourceArtifact(rawObj);
      expect(result.valid).toBe(false);
      expect(rawObj.sha256).toBeUndefined();
    });

    it("enforces invariant: unknown source version must remain unknown", () => {
      const artifact = createValidArtifact();
      delete artifact.sourceVintage;

      // Omitted / unknown version is valid
      const result = validateRawSourceArtifact(artifact);
      expect(result.valid).toBe(true);
      expect(artifact.sourceVintage).toBeUndefined();

      // Empty string for vintage is invalid (must be omitted/undefined if unknown)
      (artifact as unknown as Record<string, unknown>).sourceVintage = "";
      const resultInvalid = validateRawSourceArtifact(artifact);
      expect(resultInvalid.valid).toBe(false);
      expect(
        resultInvalid.errors.some((e) => e.includes("unknown version")),
      ).toBe(true);
    });

    it("enforces invariant: retrievedAt is actual retrieval time (ISO 8601)", () => {
      const artifact = createValidArtifact();
      artifact.retrievedAt = "2024-05-20T14:30:00.000Z";
      expect(validateRawSourceArtifact(artifact).valid).toBe(true);

      artifact.retrievedAt = "not-a-timestamp";
      const result = validateRawSourceArtifact(artifact);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("retrievedAt"))).toBe(true);
    });

    it("requires a valid authoritative URL", () => {
      const artifact = createValidArtifact();
      artifact.authoritativeUrl = "invalid-url";

      const result = validateRawSourceArtifact(artifact);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("authoritativeUrl"))).toBe(
        true,
      );
    });
  });

  describe("TransformationManifest", () => {
    it("validates a compliant transformation manifest", () => {
      const manifest = createValidManifest();
      const result = validateTransformationManifest(manifest);
      expect(result.valid).toBe(true);

      const parsed = parseTransformationManifest(manifest);
      expect(parsed.parserName).toBe("nces-school-compiler");
    });

    it("requires at least one input artifact ID and valid SHA-256 output hash", () => {
      const manifest = createValidManifest();
      manifest.inputArtifactIds = [];

      let result = validateTransformationManifest(manifest);
      expect(result.valid).toBe(false);

      manifest.inputArtifactIds = ["artifact-1"];
      manifest.outputArtifactHash = "bad-hash";
      result = validateTransformationManifest(manifest);
      expect(result.valid).toBe(false);
    });
  });

  describe("SourceRecordLocator", () => {
    it("validates a compliant locator", () => {
      const locator = createValidLocator();
      const result = validateSourceRecordLocator(locator);
      expect(result.valid).toBe(true);

      const parsed = parseSourceRecordLocator(locator);
      expect(parsed.locator).toBe("sheet:Schools,row:42");
    });
  });

  describe("EmpiricalRecordProvenance Invariants", () => {
    it("ensures synthetic VERIFIED provenance remains explicitly synthetic", () => {
      const provenance: EmpiricalRecordProvenance = {
        classification: "synthetic",
        syntheticFixture: true, // explicitly synthetic
        status: "VERIFIED", // VERIFIED as a synthetic fixture
      };

      const result = validateEmpiricalRecordProvenance(provenance);
      expect(result.valid).toBe(true);

      // It must be marked syntheticFixture if classification is synthetic
      const invalidProv: EmpiricalRecordProvenance = {
        classification: "synthetic",
        status: "VERIFIED",
      };
      const invalidResult = validateEmpiricalRecordProvenance(invalidProv);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain(
        "Invariant Violation: Synthetic fixtures must be explicitly synthetic (syntheticFixture must be true).",
      );
    });

    it("enforces invariant: record classified empirical cannot reference no source artifact", () => {
      const provenance: EmpiricalRecordProvenance = {
        classification: "empirical",
        status: "VERIFIED",
        // sourceRecordLocator intentionally omitted
      };

      const result = validateEmpiricalRecordProvenance(provenance);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("cannot reference no source artifact"),
        ),
      ).toBe(true);

      expect(() => parseEmpiricalRecordProvenance(provenance)).toThrow(
        /cannot reference no source artifact/,
      );
    });

    it("enforces invariant: source URL alone is not enough to prove a row", () => {
      // Providing just a URL string instead of a valid SourceRecordLocator with sourceArtifactId fails locator validation
      const provenance = {
        classification: "empirical",
        status: "VERIFIED",
        sourceRecordLocator: {
          authoritativeUrl:
            "https://nces.ed.gov/ccd/files/school_data_2023.csv",
        },
      };

      const result = validateEmpiricalRecordProvenance(provenance);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("sourceArtifactId"))).toBe(
        true,
      );
    });

    it("enforces invariant: synthetic fixtures must be explicitly synthetic", () => {
      // Synthetic record missing syntheticFixture flag
      const syntheticNoFlag: EmpiricalRecordProvenance = {
        classification: "synthetic",
        status: "VERIFIED",
      };
      let result = validateEmpiricalRecordProvenance(syntheticNoFlag);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("syntheticFixture must be true")),
      ).toBe(true);

      // Synthetic record with syntheticFixture = true is valid
      const syntheticValid: EmpiricalRecordProvenance = {
        classification: "synthetic",
        status: "VERIFIED",
        syntheticFixture: true,
      };
      result = validateEmpiricalRecordProvenance(syntheticValid);
      expect(result.valid).toBe(true);

      // Empirical record with syntheticFixture = true is invalid
      const empiricalSynthetic: EmpiricalRecordProvenance = {
        classification: "empirical",
        sourceRecordLocator: createValidLocator(),
        status: "VERIFIED",
        syntheticFixture: true,
      };
      result = validateEmpiricalRecordProvenance(empiricalSynthetic);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("cannot be marked syntheticFixture"),
        ),
      ).toBe(true);
    });

    it("enforces invariant: derived records must identify empirical inputs and derivation description", () => {
      // Missing derivation description
      const derivedNoDesc: EmpiricalRecordProvenance = {
        classification: "derived",
        status: "VERIFIED",
        empiricalInputs: [createValidLocator()],
      };
      let result = validateEmpiricalRecordProvenance(derivedNoDesc);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("derivation description")),
      ).toBe(true);

      // Missing empirical inputs
      const derivedNoInputs: EmpiricalRecordProvenance = {
        classification: "derived",
        status: "VERIFIED",
        derivationDescription: "Aggregated sum of county student enrollment",
        empiricalInputs: [],
      };
      result = validateEmpiricalRecordProvenance(derivedNoInputs);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("empirical input"))).toBe(
        true,
      );

      // Compliant derived provenance
      const derivedValid: EmpiricalRecordProvenance = {
        classification: "derived",
        status: "VERIFIED",
        derivationDescription: "Aggregated sum of county student enrollment",
        empiricalInputs: [createValidLocator()],
      };
      result = validateEmpiricalRecordProvenance(derivedValid);
      expect(result.valid).toBe(true);
    });

    it("validates cross-references against known artifact and manifest IDs when context is provided", () => {
      const knownArtifactIds = new Set(["artifact-nces-sch-2023"]);
      const knownManifestIds = new Set(["manifest-nces-sch-parser-v1"]);

      const validEmpirical: EmpiricalRecordProvenance = {
        classification: "empirical",
        status: "VERIFIED",
        sourceRecordLocator: createValidLocator(),
        transformationManifestId: "manifest-nces-sch-parser-v1",
      };

      expect(
        validateEmpiricalRecordProvenance(validEmpirical, {
          knownArtifactIds,
          knownManifestIds,
        }).valid,
      ).toBe(true);

      const unknownArtifact: EmpiricalRecordProvenance = {
        classification: "empirical",
        status: "VERIFIED",
        sourceRecordLocator: {
          sourceArtifactId: "artifact-unknown-999",
          locator: "row:1",
        },
      };

      const result = validateEmpiricalRecordProvenance(unknownArtifact, {
        knownArtifactIds,
        knownManifestIds,
      });
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("artifact-unknown-999")),
      ).toBe(true);
    });

    it("enforces invariant: missing != zero (fields omitted rather than coerced)", () => {
      const locator = createValidLocator();
      expect(locator.providerNativeId).toBe("nces-sch:210000100001");

      const locatorWithoutNativeId: SourceRecordLocator = {
        sourceArtifactId: "artifact-1",
        locator: "row:1",
      };
      expect(locatorWithoutNativeId.providerNativeId).toBeUndefined();

      const result = validateSourceRecordLocator(locatorWithoutNativeId);
      expect(result.valid).toBe(true);
      // Ensure missing providerNativeId remains undefined and was not coerced to "" or 0
      expect(Object.hasOwn(locatorWithoutNativeId, "providerNativeId")).toBe(
        false,
      );
    });
  });
});
