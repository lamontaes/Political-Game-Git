/**
 * The state-office qualifications domain's public API.
 *
 * This domain preserves the complete 31F and recovered 31D research transports,
 * but promotes only the bounded claims whose cited provisions were separately
 * retrieved, hashed, and reviewed. Sixty-three claims currently clear that
 * gate. Every other research row remains accounted for as staged or refused;
 * the research document's own `primary` label never substitutes for acquired
 * first-party bytes.
 *
 * PR #72 contributes nothing here in any form. Not a row, not a citation, not
 * a schema.
 *
 * The matrix reader, normalizer, reviewed-transcription compiler, validator,
 * and fixtures all run through the same capability boundary as other source
 * domains, including the cases that matter most: an office that does not exist,
 * an office not yet operative, and an authority that was read but is silent.
 */

import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseQualificationMatrix } from "./parse";
import { QUALIFICATION_ACQUISITION } from "./acquisition";
import {
  compileQualifications,
  openQualificationArtifacts,
  QUALIFICATIONS_COMPILER_VERSION,
} from "./compile";
import { normalizeQualifications } from "./normalize";
import { validateQualificationCorpus } from "./validate";
import type { QualificationRecord } from "./types";

export type {
  CitedAuthority,
  OfficeExistence,
  OfficeFamily,
  ProvisionValidity,
  QualificationClaim,
  QualificationField,
  QualificationRecord,
  SelectionMechanism,
} from "./types";
export { isOfficeExistence } from "./types";
export {
  QUALIFICATION_COLUMNS,
  RECOVERED_31D_QUALIFICATION_COLUMNS,
  QUALIFICATION_COLUMNS_31D,
  QUALIFICATION_MATRIX_SCHEMAS,
  parseQualificationMatrix,
  matrixField,
} from "./parse";
export {
  QUALIFICATION_ACQUISITION,
  QUALIFICATION_SOURCES,
  QUALIFICATION_SOURCED_JURISDICTIONS,
  qualificationSource,
} from "./acquisition";
export {
  QUALIFICATION_TRANSCRIPTIONS,
  locatorNames,
  normalizeLocator,
  transcriptionFor,
} from "./transcription";
export {
  RESEARCH_MATRICES,
  compileQualifications,
  openQualificationArtifacts,
  QUALIFICATIONS_COMPILER_VERSION,
} from "./compile";
export type {
  QualificationCompileResult,
  QualificationRefusal,
  QualificationRefusalKind,
} from "./compile";
export { normalizeQualifications, readRequirement } from "./normalize";
export {
  REJECTED_PLACEHOLDER_CITATIONS,
  REJECTED_PLACEHOLDER_VALUES,
  validateQualificationCorpus,
} from "./validate";

export const QUALIFICATIONS_PARSER_VERSION = "2.0.0";

/** The as-of date a fixture corpus is evaluated against. */
export const QUALIFICATIONS_CORPUS_AS_OF = "2026-09-09";

/**
 * How far the source boundary reaches, and where it stops.
 *
 * 31F §8 declared a gate: no production records until either the cited
 * authorities were retrieved, or a secondary tier was admitted. The first has
 * now happened for a bounded set of states, so this is no longer a gate — the
 * domain compiles — but the boundary it describes is real and the states
 * outside it are outside it for a reason. Stated here so `source:manifest`
 * carries it and an auditor reads the boundary rather than inferring one from
 * a record count.
 */
export const QUALIFICATIONS_SOURCE_BOUNDARY =
  "Partly open. 31F section 8 gated this domain on acquiring the cited state authorities as first-party artifacts; this domain now retrieves and hashes them, and compiles a claim only where its words were found in the enacted text of the provision it cites. The gate therefore still closes over every state whose authorities have not been retrieved, and those remain uncompiled rather than admitted on the research's word. docs/research/qualification-source-ledger.md accounts for every research row, compiled or refused.";

/** The matrix a fixture supplies: its bytes, inline. */
export interface QualificationFixtureArtifacts {
  readonly matrixTsv: string;
}

export interface CompiledQualificationResearchTransport {
  readonly artifactId: string;
  readonly schema: "31F-compiler-ready" | "31D-recovered";
  readonly recordCount: number;
  readonly canonicalSha256: string;
  readonly records: readonly QualificationRecord[];
  readonly productionStatus: "staged-secondary-research";
}

/** Compile exact research rows for review without crossing the production gate. */
export function compileQualificationResearchTransport(
  bytes: Uint8Array,
  artifactId: string,
  corpusAsOf: string = QUALIFICATIONS_CORPUS_AS_OF,
): CompiledQualificationResearchTransport {
  const table = parseQualificationMatrix(bytes);
  const normalized = normalizeQualifications(
    table.rows,
    artifactId,
    corpusAsOf,
    table.schema,
  );
  if (normalized.defects.length > 0) {
    throw new Error(
      `The qualification research transport produced ${normalized.defects.length} defects, the first being: ${normalized.defects[0]?.message}`,
    );
  }
  return {
    artifactId,
    schema:
      table.schema.schemaId === "31D-export-14"
        ? "31D-recovered"
        : "31F-compiler-ready",
    recordCount: normalized.records.length,
    canonicalSha256: corpusCanonicalDigest(normalized.records),
    records: normalized.records,
    productionStatus: "staged-secondary-research",
  };
}

/**
 * Compile a qualifications corpus from a fixture matrix.
 *
 * This fixture path remains isolated from production acquisition. A caller
 * cannot pass it a production input or a plain object because `FixtureInput` is
 * branded.
 */
export function compileQualificationFixture(
  input: FixtureInput<QualificationFixtureArtifacts>,
  corpusAsOf: string = QUALIFICATIONS_CORPUS_AS_OF,
): CompiledCorpus<QualificationRecord, "fixture"> {
  const bytes = Buffer.from(input.artifacts.matrixTsv, "utf-8");
  const table = parseQualificationMatrix(bytes);
  const { records, defects } = normalizeQualifications(
    table.rows,
    input.fixtureId,
    corpusAsOf,
    table.schema,
  );
  if (defects.length > 0) {
    throw new Error(
      `The qualifications fixture produced ${defects.length} defects, the first being: ${defects[0]?.message}`,
    );
  }

  return {
    corpus: {
      corpusId: "state-office-qualifications",
      compiler: {
        name: "state-office-qualifications",
        version: QUALIFICATIONS_COMPILER_VERSION,
      },
      parser: {
        name: "qualification-matrix-tsv",
        version: QUALIFICATIONS_PARSER_VERSION,
      },
      inputs: [
        {
          artifactId: input.fixtureId,
          sha256: corpusCanonicalDigest([input.artifacts.matrixTsv]),
        },
      ],
      asOf: corpusAsOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "fixture",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "A fixture exercising the qualifications compiler. It describes no real jurisdiction's law and must never be read as one.",
        boundedSampleReason:
          "Fixture only. Production promotion uses separately acquired, locked first-party authorities; see 31F section 8 for the gate.",
      },
    },
    records,
  };
}

/** Open a qualifications fixture through the capability boundary. */
export function openQualificationFixture(
  path: string,
): FixtureInput<QualificationFixtureArtifacts> {
  return openFixture<QualificationFixtureArtifacts>(
    "state-office-qualifications",
    path,
  );
}

export const sourceDomain: SourceDomainModule<QualificationRecord> = {
  domain: "state-office-qualifications",
  compilerVersion: QUALIFICATIONS_COMPILER_VERSION,
  acquisitionPlan: QUALIFICATION_ACQUISITION,
  lockPath: "data/source/state-office-qualifications/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<QualificationRecord, "production"> {
    return compileQualifications(
      openQualificationArtifacts(lock),
      QUALIFICATIONS_CORPUS_AS_OF,
    ).corpus;
  },
  validateCorpus(
    corpus: CompiledCorpus<QualificationRecord>,
  ): ValidationReport {
    return validateQualificationCorpus(corpus);
  },
};

/** Narrowing helper so the unused production input type stays referenced. */
export type QualificationProductionInput =
  ProductionInput<QualificationFixtureArtifacts>;
