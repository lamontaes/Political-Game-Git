/**
 * The government-finances domain's public API.
 *
 * This domain is wired into the command matrix and compiles **no production
 * records**. That is a gate, not an omission, and it is a network gate: the
 * substrate compiles production corpora only from artifacts it retrieved and
 * hashed itself, and this session's egress policy denied the Census Bureau at
 * the proxy (HTTP 403 CONNECT-tunnel denial for both api.census.gov and
 * www.census.gov). The acquisition was attempted through the ordinary
 * acquire/compile/validate/replay path and could not complete, so no publisher
 * bytes exist to lock. See `GOVERNMENT_FINANCES_PRODUCTION_GATE`.
 *
 * Everything else is real and exercised. The types, the matrix reader, the
 * normalizer and the validator all work, and the fixtures compile end to end
 * through the same capability boundary every other domain uses — including the
 * cases that matter most: a genuine reported zero, a withheld amount, an
 * inapplicable line, and a line the product never carried for a unit. When the
 * gate clears, production finances become a data change (acquire the two Census
 * products named below) rather than a design.
 *
 * Intended official sources, per the 42A Part 1 backbone:
 *   - Census Annual Survey of State and Local Government Finances /
 *     Census of Governments finance phase —
 *     https://www.census.gov/programs-surveys/gov-finances.html
 *     (revenue by source, expenditure by function, debt, cash and securities,
 *     at individual-government level in the public-use products).
 */

import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import { parseFinanceMatrix } from "./parse";
import { normalizeFinances } from "./normalize";
import { validateFinanceCorpus } from "./validate";
import { surveyYearWindow } from "./survey-year";
import type { FinanceRecord } from "./types";

export type { EstimateBasis, FinanceCategory, FinanceRecord } from "./types";
export { FINANCE_COLUMNS, financeField, parseFinanceMatrix } from "./parse";
export { normalizeFinances } from "./normalize";
export { validateFinanceCorpus } from "./validate";
export { isWithinSurveyYearWindow, surveyYearWindow } from "./survey-year";
export type { SurveyYearWindow } from "./survey-year";

export const GOVERNMENT_FINANCES_COMPILER_VERSION = "1.0.0";
export const GOVERNMENT_FINANCES_PARSER_VERSION = "1.0.0";

/**
 * Why no production corpus exists.
 *
 * Stated here so `source:manifest` carries it and an auditor reads the gate
 * rather than discovering an absence. The blocker is the network egress policy,
 * not the design.
 */
export const GOVERNMENT_FINANCES_PRODUCTION_GATE =
  "Production compilation is gated on acquiring the Census Annual Survey of State and Local Government Finances (and the Census of Governments finance phase) as first-party artifacts through source:acquire. Acquisition was attempted and refused by this session's egress policy: the proxy returned HTTP 403 CONNECT-tunnel denials for api.census.gov and www.census.gov, so no publisher bytes could be retrieved or hashed. The domain — types, parser, normalizer, validator and fixtures — is complete and exercised end to end; clearing the gate is acquiring the two products at census.gov/programs-surveys/gov-finances.html, not writing code.";

/** The matrix a fixture supplies: its bytes, inline. */
export interface FinanceFixtureArtifacts {
  readonly matrixTsv: string;
}

/**
 * Compile a finance corpus from a fixture matrix.
 *
 * There is deliberately no production counterpart. A caller cannot reach this
 * compiler with a production input because none can be opened for this domain,
 * and cannot reach it with a plain object because `FixtureInput` is branded.
 */
export function compileFinanceFixture(
  input: FixtureInput<FinanceFixtureArtifacts>,
): CompiledCorpus<FinanceRecord, "fixture"> {
  const bytes = Buffer.from(input.artifacts.matrixTsv, "utf-8");
  const table = parseFinanceMatrix(bytes);
  const { records, defects } = normalizeFinances(table.rows, input.fixtureId);
  if (defects.length > 0) {
    throw new Error(
      `The finance fixture produced ${defects.length} defects, the first being: ${defects[0]?.message}`,
    );
  }

  /*
   * The corpus is current as of the last day the newest survey year covers.
   *
   * Not December 31 of that year, which is what this derived before the survey
   * year and the fiscal year were told apart: a survey year is not a calendar
   * year, and dating the corpus to a December 31 it does not reach asserted six
   * months of coverage the source never claimed.
   */
  const years = [...new Set(records.map((record) => record.surveyYear))].sort();
  const asOf = surveyYearWindow(years.at(-1) ?? 2022).lastDay;

  return {
    corpus: {
      corpusId: "government-finances",
      compiler: {
        name: "government-finances",
        version: GOVERNMENT_FINANCES_COMPILER_VERSION,
      },
      parser: {
        name: "government-finances-tsv",
        version: GOVERNMENT_FINANCES_PARSER_VERSION,
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
          "A fixture exercising the government-finances compiler. It describes no real government's finances and must never be read as one.",
        boundedSampleReason:
          "Fixture only. The domain compiles no production records; the gate is a network-egress denial of the Census Bureau, stated in GOVERNMENT_FINANCES_PRODUCTION_GATE.",
      },
    },
    records,
  };
}

/** Open a finance fixture through the capability boundary. */
export function openFinanceFixture(
  path: string,
): FixtureInput<FinanceFixtureArtifacts> {
  return openFixture<FinanceFixtureArtifacts>("government-finances", path);
}

export const sourceDomain: SourceDomainModule<FinanceRecord> = {
  domain: "government-finances",
  compilerVersion: GOVERNMENT_FINANCES_COMPILER_VERSION,
  acquisitionPlan: { domain: "government-finances", requests: [] },
  lockPath: "data/source/government-finances/artifact-lock.json",
  productionGate: GOVERNMENT_FINANCES_PRODUCTION_GATE,
  compileProduction(): CompiledCorpus<FinanceRecord, "production"> {
    throw new Error(
      `The government-finances domain compiles no production corpus. ${GOVERNMENT_FINANCES_PRODUCTION_GATE}`,
    );
  },
  validateCorpus(corpus: CompiledCorpus<FinanceRecord>): ValidationReport {
    return validateFinanceCorpus(corpus);
  },
};

/** Narrowing helper so the unused production input type stays referenced. */
export type FinanceProductionInput = ProductionInput<FinanceFixtureArtifacts>;
