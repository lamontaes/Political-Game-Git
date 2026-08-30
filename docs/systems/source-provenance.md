# Source Provenance Validation Foundation

## Purpose

The source provenance validation foundation provides a reusable, pure TypeScript contract and helper package for empirical data compilers. Multiple independent data compilers require the same minimum proof that an empirical record came from a real source artifact.

This contract sits in `src/environment/source-provenance.ts` and is deliberately isolated from simulation state (`src/simulation/`) and player UI (`src/player/`, `src/presentation/`).

## Core Contract

The package exports four primary interfaces and corresponding validation and parsing functions:

### 1. RawSourceArtifact

Represents an immutable, retrieved source artifact file.

- `id`: Stable source artifact ID (non-empty string, e.g., `'artifact-nces-sch-2023'`).
- `provider`: Organization or authority providing the artifact (e.g., `'NCES CCD'`).
- `authoritativeUrl`: Authoritative source URL where the artifact was obtained.
- `retrievedAt`: Actual ISO 8601 retrieval timestamp (e.g., `'2024-01-15T12:00:00Z'`).
- `sourceVintage`: Optional vintage or version string supplied by the source (e.g., `'2022-2023'`). Must remain `undefined` if unknown.
- `rawFilename`: Original filename of the downloaded raw file.
- `byteLength`: Exact byte length as a non-negative integer.
- `sha256`: 64-character hexadecimal SHA-256 hash of actual file bytes.
- `mimeType`: Optional MIME/content type where known.
- `licenseOrAttribution`: Optional license or copyright attribution statement.
- `retrievalMethod`: Protocol/method used for retrieval (e.g., `'HTTPS GET'`).
- `sourceReleaseStatus`: Optional provider release status (e.g., `'provisional'`, `'final'`).
- `sourceReleaseDate`: Optional exact ISO 8601 release date (`YYYY-MM-DD`) when supported.
- `documentationUrl`: Optional URL for codebook/methodology if distinct.
- `coverageDescription`: Optional source-faithful coverage metadata.
- `universeDescription`: Optional source-faithful universe metadata.

### 2. TransformationManifest

Represents the parser or compiler executable run that transformed raw artifacts into structured records.

- `id`: Stable transformation manifest ID.
- `parserName`: Parser or compiler name.
- `parserVersion`: Parser or compiler version string.
- `inputArtifactIds`: Non-empty array of input `RawSourceArtifact` IDs.
- `transformationDescription`: Clear description of the transformation step.
- `outputArtifactHash`: 64-character hexadecimal SHA-256 hash of output artifact or dataset.
- `generatedAt`: ISO 8601 generation timestamp.
- `isDeterministic`: Reproducible/deterministic output flag.

### 3. SourceRecordLocator

Represents the exact location of a single record within a source artifact.

- `sourceArtifactId`: Referencing `RawSourceArtifact` ID.
- `locator`: Record, table, sheet, row, or key locator (e.g., `'sheet:Schools,row:42'`).
- `providerNativeId`: Optional provider-native identifier if available (e.g., NCES school code).

### 4. EmpiricalRecordProvenance

Represents the provenance classification and status of an individual empirical or synthetic record.

- `classification`: `'empirical'`, `'synthetic'`, or `'derived'`.
- `sourceRecordLocator`: Required for `'empirical'` classification.
- `transformationManifestId`: Optional manifest ID used during parsing.
- `status`: `'VERIFIED'`, `'UNRESOLVED'`, `'SUSPECT'`, or `'DEPRECATED'`.
- `confidence`: Optional PROVENANCE-ASSESSMENT confidence. Must never be interpreted as a statistical confidence, MOE, RSE, or probability.
- `syntheticFixture`: Required boolean set to `true` if `classification` is `'synthetic'`.
- `empiricalInputs`: Array of `SourceRecordLocator` references (required if `classification` is `'derived'`).
- `derivationDescription`: Detailed description of calculation or derivation (required if `classification` is `'derived'`).

## Hard Invariants

Validators enforce the following mandatory repository invariants:

1. **Empirical Source Requirement**: A record classified `empirical` cannot reference no source artifact. It must include a valid `sourceRecordLocator`.
2. **SHA-256 Format**: Every source hash must be a valid 64-character hexadecimal SHA-256 string.
3. **No Manufactured Hashes**: Validators cannot silently manufacture or default a missing hash. Missing or malformed hashes produce an explicit validation error.
4. **Explicit Synthetic Marking**: Synthetic fixtures must be explicitly marked (`classification === 'synthetic'` and `syntheticFixture === true`). An empirical or derived record cannot be marked as `syntheticFixture`.
5. **Derived Provenance**: Derived records must identify their empirical input locators (`empiricalInputs`) and derivation description (`derivationDescription`).
6. **Preservation of Unknown Version**: An unknown source vintage must remain unknown (`sourceVintage` is omitted/undefined). It is never defaulted to a fake or guessed version string.
7. **Actual Retrieval Time**: `retrievedAt` must be an ISO 8601 timestamp string representing the actual time of retrieval, distinct from `sourceVintage`.
8. **URL Insufficiency**: A source URL alone is not enough to prove a row; an explicit `SourceRecordLocator` with a valid `sourceArtifactId` is required.
9. **Missing != Zero**: Missing or unknown optional values must remain `undefined` or omitted; they are never coerced to zero or empty strings.

## Usage Example

```typescript
import {
  validateRawSourceArtifact,
  validateEmpiricalRecordProvenance,
  type RawSourceArtifact,
  type EmpiricalRecordProvenance,
} from "../environment/source-provenance.js";

const artifact: RawSourceArtifact = {
  id: "artifact-nces-sch-2023",
  provider: "NCES CCD",
  authoritativeUrl: "https://nces.ed.gov/ccd/files/school_data_2023.csv",
  retrievedAt: "2024-01-15T12:00:00Z",
  rawFilename: "school_data_2023.csv",
  byteLength: 1048576,
  sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  retrievalMethod: "HTTPS GET",
};

const artifactValidation = validateRawSourceArtifact(artifact);
if (!artifactValidation.valid) {
  console.error(artifactValidation.errors);
}

const provenance: EmpiricalRecordProvenance = {
  classification: "empirical",
  status: "VERIFIED",
  sourceRecordLocator: {
    sourceArtifactId: "artifact-nces-sch-2023",
    locator: "sheet:Schools,row:42",
    providerNativeId: "nces-sch:210000100001",
  },
};

const provenanceValidation = validateEmpiricalRecordProvenance(provenance, {
  knownArtifactIds: new Set([artifact.id]),
});
```
