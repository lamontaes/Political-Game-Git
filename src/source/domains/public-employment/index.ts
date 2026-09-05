/**
 * The public-employment domain's public API.
 *
 * This domain is wired into the command matrix and compiles **no production
 * records**. The gate is a network gate, identical in cause to the
 * government-finances gate: the substrate compiles production corpora only from
 * artifacts it retrieved and hashed itself, and this session's egress policy
 * denied the Census Bureau at the proxy (HTTP 403 CONNECT-tunnel denial for
 * api.census.gov and www.census.gov). Acquisition was attempted through the
 * ordinary path and could not complete, so no publisher bytes exist to lock.
 * See `PUBLIC_EMPLOYMENT_PRODUCTION_GATE`.
 *
 * Everything else is real and exercised. The types, matrix reader, normalizer
 * and validator all work, and the fixtures compile end to end through the same
 * capability boundary every other domain uses — including the cases that matter
 * most: a genuine reported zero, a withheld measure, an inapplicable measure, a
 * measure the product never carried, and the aggregate of full-time and
 * part-time counts that stays INCOMPLETE when a component is missing rather than
 * reading the gap as zero. When the gate clears, production employment becomes a
 * data change (acquire the ASPEP product below) rather than a design.
 *
 * Intended official source, per the 42A Part 1 backbone:
 *   - Census Annual Survey of Public Employment & Payroll (ASPEP) /
 *     Census of Governments employment phase —
 *     https://www.census.gov/programs-surveys/apes.html
 *     (state/local employment, full/part-time staffing, payroll and
 *     government-function staffing, at individual-unit level).
 */

import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
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
export {
  REJECTED_SCORE_TOKENS,
  totalEmployment,
  validateEmploymentCorpus,
} from "./validate";

export const PUBLIC_EMPLOYMENT_COMPILER_VERSION = "1.0.0";
export const PUBLIC_EMPLOYMENT_PARSER_VERSION = "1.0.0";

/**
 * Why no production corpus exists.
 *
 * Stated here so `source:manifest` carries it and an auditor reads the gate
 * rather than discovering an absence.
 */
export const PUBLIC_EMPLOYMENT_PRODUCTION_GATE =
  "Production compilation is gated on acquiring the Census Annual Survey of Public Employment & Payroll (ASPEP, and the Census of Governments employment phase) as first-party artifacts through source:acquire. Acquisition was attempted and refused by this session's egress policy: the proxy returned HTTP 403 CONNECT-tunnel denials for api.census.gov and www.census.gov, so no publisher bytes could be retrieved or hashed. The domain — types, parser, normalizer, validator and fixtures — is complete and exercised end to end; clearing the gate is acquiring the product at census.gov/programs-surveys/apes.html, not writing code.";

/** The matrix a fixture supplies: its bytes, inline. */
export interface EmploymentFixtureArtifacts {
  readonly matrixTsv: string;
}

/**
 * Compile an employment corpus from a fixture matrix.
 *
 * There is deliberately no production counterpart. A caller cannot reach this
 * compiler with a production input because none can be opened for this domain,
 * and cannot reach it with a plain object because `FixtureInput` is branded.
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
          "Fixture only. The domain compiles no production records; the gate is a network-egress denial of the Census Bureau, stated in PUBLIC_EMPLOYMENT_PRODUCTION_GATE.",
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
  acquisitionPlan: { domain: "public-employment", requests: [] },
  lockPath: "data/source/public-employment/artifact-lock.json",
  productionGate: PUBLIC_EMPLOYMENT_PRODUCTION_GATE,
  compileProduction(): CompiledCorpus<EmploymentRecord, "production"> {
    throw new Error(
      `The public-employment domain compiles no production corpus. ${PUBLIC_EMPLOYMENT_PRODUCTION_GATE}`,
    );
  },
  validateCorpus(corpus: CompiledCorpus<EmploymentRecord>): ValidationReport {
    return validateEmploymentCorpus(corpus);
  },
};

/** Narrowing helper so the unused production input type stays referenced. */
export type EmploymentProductionInput =
  ProductionInput<EmploymentFixtureArtifacts>;
