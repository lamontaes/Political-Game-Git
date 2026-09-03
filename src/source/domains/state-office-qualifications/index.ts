/**
 * The state-office qualifications domain's public API.
 *
 * This domain is wired into the command matrix and compiles **no production
 * records**. That is a decision, not an omission, and 31F §8 records the whole
 * of its reasoning. In short: the substrate compiles production corpora only
 * from artifacts it retrieved and hashed itself, and the 31 research wave is a
 * secondary source. Emitting `KNOWN(7 years)` with evidence pointing at a
 * Massachusetts constitutional article would say this repository read that
 * article. It did not; it read a document reporting it.
 *
 * PR #72 contributes nothing here in any form. Not a row, not a citation, not
 * a schema.
 *
 * Everything else is real and exercised. The types, the matrix reader, the
 * normalizer and the validator all work, and the fixtures compile end to end
 * through the same capability boundary every other domain uses — including the
 * cases that matter most, an office that does not exist and an office created
 * but not yet operative. When the gate in 31F §8 clears, production
 * qualifications become a data change rather than a design.
 */

import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseQualificationMatrix } from "./parse";
import { normalizeQualifications } from "./normalize";
import { validateQualificationCorpus } from "./validate";
import type { QualificationRecord } from "./types";

export type {
  CitedAuthority,
  OfficeExistence,
  OfficeFamily,
  QualificationClaim,
  QualificationField,
  QualificationRecord,
  SelectionMechanism,
} from "./types";
export { isOfficeExistence } from "./types";
export {
  QUALIFICATION_COLUMNS,
  parseQualificationMatrix,
  matrixField,
} from "./parse";
export { normalizeQualifications, readRequirement } from "./normalize";
export {
  REJECTED_PLACEHOLDER_CITATIONS,
  REJECTED_PLACEHOLDER_VALUES,
  validateQualificationCorpus,
} from "./validate";

export const QUALIFICATIONS_COMPILER_VERSION = "1.0.0";
export const QUALIFICATIONS_PARSER_VERSION = "1.0.0";

/** The as-of date a fixture corpus is evaluated against. */
export const QUALIFICATIONS_CORPUS_AS_OF = "2026-01-01";

/**
 * Why no production corpus exists.
 *
 * Stated here so that `source:manifest` carries it and an auditor reads the
 * gate rather than discovering an absence.
 */
export const QUALIFICATIONS_PRODUCTION_GATE =
  "31F marks 118 of the 31A-31E research claims compiler-ready, but the substrate compiles production corpora only from artifacts it retrieved and hashed, and a research synthesis is a secondary source. Production compilation is gated on either acquiring the cited state authorities as first-party artifacts, or an explicit architecture decision to admit a declared secondary-source tier. See 31F section 8.";

/** The matrix a fixture supplies: its bytes, inline. */
export interface QualificationFixtureArtifacts {
  readonly matrixTsv: string;
}

/**
 * Compile a qualifications corpus from a fixture matrix.
 *
 * There is deliberately no production counterpart. A caller cannot reach this
 * compiler with a production input because none can be opened for this domain,
 * and cannot reach it with a plain object because `FixtureInput` is branded.
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
          "Fixture only. The domain compiles no production records; see 31F section 8 for the gate.",
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
  acquisitionPlan: { domain: "state-office-qualifications", requests: [] },
  lockPath: "data/source/state-office-qualifications/artifact-lock.json",
  productionGate: QUALIFICATIONS_PRODUCTION_GATE,
  compileProduction(): CompiledCorpus<QualificationRecord, "production"> {
    throw new Error(
      `The state-office-qualifications domain compiles no production corpus. ${QUALIFICATIONS_PRODUCTION_GATE}`,
    );
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
