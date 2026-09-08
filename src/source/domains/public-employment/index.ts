/** Public employment: independent fixture and locked ASPEP production entrypoints. */
import {
  acquisitionPlan,
  compileEmploymentProduction,
  openEmploymentProduction,
} from "./production";
export {
  compileEmploymentProduction,
  openEmploymentProduction,
} from "./production";
import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseEmploymentMatrix } from "./parse";
import { normalizeEmployment } from "./normalize";
import { validateEmploymentCorpus } from "./validate";
import type { EmploymentRecord } from "./types";

export type { EstimateBasis, EmploymentRecord } from "./types";
export {
  EMPLOYMENT_COLUMNS,
  employmentField,
  parseEmploymentMatrix,
} from "./parse";
export { normalizeEmployment, readMeasure } from "./normalize";
export { totalEmployment, validateEmploymentCorpus } from "./validate";

export const PUBLIC_EMPLOYMENT_COMPILER_VERSION = "2.0.0";
export const PUBLIC_EMPLOYMENT_PARSER_VERSION = "2.0.0";

/** The matrix a fixture supplies: its bytes, inline. */
export interface EmploymentFixtureArtifacts {
  readonly matrixTsv: string;
}

/**
 * Compile an employment corpus from a fixture matrix.
 *
 * Publisher production parsing is separate; this fixture API remains branded.
 */
export function compileEmploymentFixture(
  input: FixtureInput<EmploymentFixtureArtifacts>,
): CompiledCorpus<EmploymentRecord, "fixture"> {
  const bytes = Buffer.from(input.artifacts.matrixTsv, "utf-8");
  const table = parseEmploymentMatrix(bytes);
  const { records, defects } = normalizeEmployment(table.rows, input.fixtureId);
  if (defects.length > 0) {
    throw new Error(
      `The employment fixture produced ${defects.length} defects, the first being: ${defects[0]?.message}`,
    );
  }

  const years = [
    ...new Set(records.map((record) => record.referenceYear)),
  ].sort();
  const asOf = `${years.at(-1) ?? 2022}-12-31`;

  return {
    corpus: {
      corpusId: "public-employment",
      compiler: {
        name: "public-employment",
        version: PUBLIC_EMPLOYMENT_COMPILER_VERSION,
      },
      parser: {
        name: "public-employment-tsv",
        version: PUBLIC_EMPLOYMENT_PARSER_VERSION,
      },
      inputs: [
        {
          artifactId: input.fixtureId,
          sha256: corpusCanonicalDigest([input.artifacts.matrixTsv]),
        },
      ],
      asOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "fixture",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "A fixture exercising the public-employment compiler. It describes no real government's staffing and must never be read as one.",
        boundedSampleReason:
          "Fixture only; no real staffing facts. Production uses the separate official ASPEP fixed-width adapter.",
      },
    },
    records,
  };
}

/** Open an employment fixture through the capability boundary. */
export function openEmploymentFixture(
  path: string,
): FixtureInput<EmploymentFixtureArtifacts> {
  return openFixture<EmploymentFixtureArtifacts>("public-employment", path);
}

export const sourceDomain: SourceDomainModule<EmploymentRecord> = {
  domain: "public-employment",
  compilerVersion: PUBLIC_EMPLOYMENT_COMPILER_VERSION,
  acquisitionPlan,
  lockPath: "data/source/public-employment/artifact-lock.json",
  compileProduction(lock) {
    return compileEmploymentProduction(openEmploymentProduction(lock));
  },
  validateCorpus(corpus: CompiledCorpus<EmploymentRecord>): ValidationReport {
    return validateEmploymentCorpus(corpus);
  },
};
