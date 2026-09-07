/** Independent fixture and official publisher production paths. */
import {
  acquisitionPlan,
  compileFinanceProduction,
  openFinanceProduction,
} from "./production";
export { compileFinanceProduction, openFinanceProduction } from "./production";
import { corpusCanonicalDigest, openFixture } from "../../core/index";
import type {
  CompiledCorpus,
  FixtureInput,
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

export const GOVERNMENT_FINANCES_COMPILER_VERSION = "2.0.0";
export const GOVERNMENT_FINANCES_PARSER_VERSION = "2.0.0";

/** The matrix a fixture supplies: its bytes, inline. */
export interface FinanceFixtureArtifacts {
  readonly matrixTsv: string;
}

/**
 * Compile a finance corpus from a fixture matrix.
 *
 * Publisher production parsing is separate; this fixture API remains branded.
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
          "Fixture only; official publisher production uses a separate fixed-width adapter.",
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
  acquisitionPlan,
  lockPath: "data/source/government-finances/artifact-lock.json",
  compileProduction(lock) {
    return compileFinanceProduction(openFinanceProduction(lock));
  },
  validateCorpus(corpus: CompiledCorpus<FinanceRecord>): ValidationReport {
    return validateFinanceCorpus(corpus);
  },
};
