/**
 * End-to-End Compiler for Government Finance and Employment Corpus
 *
 * Deterministically compiles, validates, indexes, and outputs normalized datasets.
 */

import type {
  GovernmentEntityMetadata,
  FinanceRecord,
  EmploymentRecord,
  GovernmentEmploymentSummary,
  LongitudinalFinanceSeries,
  LongitudinalEmploymentSeries,
  NationalCoverageManifest,
} from "./types.js";
import { CorpusValidator } from "./validator.js";
import type { ValidationReport } from "./validator.js";
import { buildNationalCoverageManifest } from "./manifest_builder.js";
import { summarizeGovernmentEmployment } from "./employment_normalizer.js";

export interface CompiledGovCorpus {
  readonly governments: readonly GovernmentEntityMetadata[];
  readonly financeRecords: readonly FinanceRecord[];
  readonly employmentRecords: readonly EmploymentRecord[];
  readonly employmentSummaries: readonly GovernmentEmploymentSummary[];
  readonly financeSeries: readonly LongitudinalFinanceSeries[];
  readonly employmentSeries: readonly LongitudinalEmploymentSeries[];
  readonly manifest: NationalCoverageManifest;
  readonly validationReport: ValidationReport;
}

export interface CompilerOptions {
  readonly skipValidation?: boolean;
}

export class GovFinanceEmploymentCompiler {
  private readonly validator: CorpusValidator;

  constructor() {
    this.validator = new CorpusValidator();
  }

  /**
   * Compiles the corpus from normalized records
   */
  public compile(params: {
    readonly governments: readonly GovernmentEntityMetadata[];
    readonly financeRecords: readonly FinanceRecord[];
    readonly employmentRecords: readonly EmploymentRecord[];
    readonly options?: CompilerOptions;
  }): CompiledGovCorpus {
    // Deduplicate governments
    const govMap = new Map<string, GovernmentEntityMetadata>();
    for (const gov of params.governments) {
      if (!govMap.has(gov.govId)) {
        govMap.set(gov.govId, gov);
      }
    }
    const uniqueGovernments = Array.from(govMap.values());

    // 1. Group employment records by government and surveyYear to create summaries
    const empByGovAndYear = new Map<string, EmploymentRecord[]>();
    for (const rec of params.employmentRecords) {
      const key = `${rec.govId}|${rec.surveyYear}`;
      const list = empByGovAndYear.get(key) ?? [];
      list.push(rec);
      empByGovAndYear.set(key, list);
    }

    const summaries: GovernmentEmploymentSummary[] = [];
    for (const recs of empByGovAndYear.values()) {
      summaries.push(summarizeGovernmentEmployment(recs));
    }

    // 2. Build Longitudinal Finance Series per Government
    const finByGov = new Map<string, FinanceRecord[]>();
    for (const fin of params.financeRecords) {
      const list = finByGov.get(fin.govId) ?? [];
      list.push(fin);
      finByGov.set(fin.govId, list);
    }

    const financeSeries: LongitudinalFinanceSeries[] = [];
    for (const [govId, records] of finByGov.entries()) {
      // Sort strictly by fiscal year
      const sorted = [...records].sort((a, b) => a.fiscalYear - b.fiscalYear);
      const years = sorted.map((r) => r.fiscalYear);
      const hasCensusYears = sorted.some(
        (r) =>
          r.enumerationType === "complete_census" ||
          r.fiscalYear === 2017 ||
          r.fiscalYear === 2022,
      );
      const hasSurveyYears = sorted.some(
        (r) =>
          r.enumerationType === "annual_survey_sample" ||
          (r.fiscalYear !== 2017 && r.fiscalYear !== 2022),
      );

      if (sorted.length === 0) continue;
      const first = sorted[0];
      if (!first) continue;

      financeSeries.push({
        govId,
        censusGovId: first.censusGovId,
        years,
        records: sorted,
        metadata: {
          hasCensusYears,
          hasSurveyYears,
          isStrictlyUninterpolated: true,
          detectedDefinitionBreaks: [],
        },
      });
    }

    // 3. Build Longitudinal Employment Series per Government
    const sumByGov = new Map<string, GovernmentEmploymentSummary[]>();
    for (const sum of summaries) {
      const list = sumByGov.get(sum.govId) ?? [];
      list.push(sum);
      sumByGov.set(sum.govId, list);
    }

    const employmentSeries: LongitudinalEmploymentSeries[] = [];
    for (const [govId, sumList] of sumByGov.entries()) {
      const sorted = [...sumList].sort((a, b) => a.surveyYear - b.surveyYear);
      if (sorted.length === 0) continue;
      const first = sorted[0];
      if (!first) continue;

      const years = sorted.map((s) => s.surveyYear);
      const hasOctToMar =
        years.some((y) => y < 1997) && years.some((y) => y >= 1997);
      const breaks: string[] = [];
      if (hasOctToMar) {
        breaks.push("1997 Reference Month Transition (October -> March)");
      }

      employmentSeries.push({
        govId,
        censusGovId: first.censusGovId,
        years,
        summaries: sorted,
        metadata: {
          hasCensusYears: sorted.some(
            (s) => s.enumerationType === "complete_census",
          ),
          hasSurveyYears: sorted.some(
            (s) => s.enumerationType === "annual_survey_sample",
          ),
          hasOctoberToMarchTransition: hasOctToMar,
          isStrictlyUninterpolated: true,
          detectedDefinitionBreaks: breaks,
        },
      });
    }

    // 4. Validate complete corpus
    const validationReport = params.options?.skipValidation
      ? { isValid: true, totalChecked: 0, errors: [], warnings: [] }
      : this.validator.validateCorpus({
          governments: uniqueGovernments,
          financeRecords: params.financeRecords,
          employmentRecords: params.employmentRecords,
          financeSeries,
          employmentSeries,
        });

    if (!validationReport.isValid) {
      const errorSummary = validationReport.errors.slice(0, 10).join("\n - ");
      throw new Error(
        `Government Finance & Employment compilation failed validation with ${validationReport.errors.length} errors:\n - ${errorSummary}`,
      );
    }

    // 5. Build national manifest
    const manifest = buildNationalCoverageManifest({
      governments: uniqueGovernments,
      financeRecords: params.financeRecords,
      employmentRecords: params.employmentRecords,
    });

    return {
      governments: uniqueGovernments,
      financeRecords: params.financeRecords,
      employmentRecords: params.employmentRecords,
      employmentSummaries: summaries,
      financeSeries,
      employmentSeries,
      manifest,
      validationReport,
    };
  }
}
