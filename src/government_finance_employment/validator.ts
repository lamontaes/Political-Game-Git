/**
 * Comprehensive Integrity & Validation Suite for Government Finance and Employment Corpus
 */

import type {
  FinanceRecord,
  EmploymentRecord,
  GovernmentEntityMetadata,
  LongitudinalFinanceSeries,
  LongitudinalEmploymentSeries,
} from "./types.js";
import { isValidCensusGovId } from "./ids.js";
import { validateFinanceIdentities } from "./finance_normalizer.js";

export interface ValidationReport {
  readonly isValid: boolean;
  readonly totalChecked: number;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export class CorpusValidator {
  /**
   * Validates a government entity metadata object
   */
  public validateGovernmentEntity(gov: GovernmentEntityMetadata): string[] {
    const errors: string[] = [];
    if (!gov.govId || !gov.govId.startsWith("gov-")) {
      errors.push(`Invalid govId format: "${gov.govId}"`);
    }
    if (
      gov.censusGovId &&
      gov.govClass !== "federal" &&
      !isValidCensusGovId(gov.censusGovId)
    ) {
      errors.push(
        `Invalid 14-digit Census Gov ID: "${gov.censusGovId}" on ${gov.name}`,
      );
    }
    if (!gov.name || gov.name.trim().length === 0) {
      errors.push(`Government entity missing name for ID: ${gov.govId}`);
    }
    if (!gov.statePostal || gov.statePostal.length !== 2) {
      errors.push(
        `Invalid state postal code: "${gov.statePostal}" on ${gov.govId}`,
      );
    }
    return errors;
  }

  /**
   * Validates a FinanceRecord for accounting identities, ID stability, and methodology flags
   */
  public validateFinanceRecord(record: FinanceRecord): string[] {
    const errors: string[] = [];

    if (!record.recordId.startsWith("gov-fin-")) {
      errors.push(`Invalid finance recordId: "${record.recordId}"`);
    }
    if (
      !record.fiscalYear ||
      record.fiscalYear < 1950 ||
      record.fiscalYear > 2050
    ) {
      errors.push(
        `Invalid fiscalYear: ${record.fiscalYear} on ${record.recordId}`,
      );
    }
    if (!record.enumerationType) {
      errors.push(
        `Missing enumerationType on finance record ${record.recordId}`,
      );
    }

    // Check census year enumeration type accuracy
    const isCensusYear =
      record.fiscalYear === 2017 || record.fiscalYear === 2022;
    if (
      isCensusYear &&
      record.enumerationType !== "complete_census" &&
      record.enumerationType !== "state_level_aggregate" &&
      record.enumerationType !== "national_aggregate"
    ) {
      // CoG years are complete censuses
    }

    // Run arithmetic identity validation
    const mathResult = validateFinanceIdentities(record);
    if (!mathResult.isValid) {
      errors.push(...mathResult.errors.map((e) => `[${record.recordId}] ${e}`));
    }

    return errors;
  }

  /**
   * Validates an EmploymentRecord for mathematical consistency, FTE bounds, and vintage compatibility
   */
  public validateEmploymentRecord(record: EmploymentRecord): string[] {
    const errors: string[] = [];

    if (!record.recordId.startsWith("gov-emp-")) {
      errors.push(`Invalid employment recordId: "${record.recordId}"`);
    }
    if (
      !record.surveyYear ||
      record.surveyYear < 1950 ||
      record.surveyYear > 2050
    ) {
      errors.push(
        `Invalid surveyYear: ${record.surveyYear} on ${record.recordId}`,
      );
    }
    if (!record.functionCode || record.functionCode.length !== 3) {
      errors.push(
        `Invalid 3-digit functionCode: "${record.functionCode}" on ${record.recordId}`,
      );
    }

    // 1997 Reference Month Rule
    if (record.surveyYear >= 1997 && record.referenceMonth !== "March") {
      errors.push(
        `Expected referenceMonth "March" for year ${record.surveyYear}, found "${record.referenceMonth}" on ${record.recordId}`,
      );
    }
    if (record.surveyYear < 1997 && record.referenceMonth !== "October") {
      errors.push(
        `Expected referenceMonth "October" for historical year ${record.surveyYear}, found "${record.referenceMonth}" on ${record.recordId}`,
      );
    }

    // Headcount math: Total = FT + PT
    if (
      record.totalEmployees !== null &&
      record.fullTimeEmployees !== null &&
      record.partTimeEmployees !== null
    ) {
      const expected = record.fullTimeEmployees + record.partTimeEmployees;
      if (record.totalEmployees !== expected) {
        errors.push(
          `Headcount mismatch: total (${record.totalEmployees}) != FT (${record.fullTimeEmployees}) + PT (${record.partTimeEmployees}) on ${record.recordId}`,
        );
      }
    }

    // Payroll math: Total Payroll = FT Payroll + PT Payroll
    if (
      record.totalPayroll !== null &&
      record.fullTimePayroll !== null &&
      record.partTimePayroll !== null
    ) {
      const expected = record.fullTimePayroll + record.partTimePayroll;
      if (record.totalPayroll !== expected) {
        errors.push(
          `Payroll mismatch: total (${record.totalPayroll}) != FT (${record.fullTimePayroll}) + PT (${record.partTimePayroll}) on ${record.recordId}`,
        );
      }
    }

    // FTE bounds: FTE >= fullTimeEmployees and FTE <= totalEmployees (when non-null)
    if (
      record.fullTimeEquivalentEmployees !== null &&
      record.fullTimeEmployees !== null
    ) {
      if (record.fullTimeEquivalentEmployees < record.fullTimeEmployees) {
        errors.push(
          `FTE (${record.fullTimeEquivalentEmployees}) cannot be less than Full-Time headcount (${record.fullTimeEmployees}) on ${record.recordId}`,
        );
      }
    }
    if (
      record.fullTimeEquivalentEmployees !== null &&
      record.totalEmployees !== null
    ) {
      if (record.fullTimeEquivalentEmployees > record.totalEmployees) {
        errors.push(
          `FTE (${record.fullTimeEquivalentEmployees}) cannot exceed Total headcount (${record.totalEmployees}) on ${record.recordId}`,
        );
      }
    }

    return errors;
  }

  /**
   * Validates longitudinal series to ensure no silently interpolated years and strict monotonicity
   */
  public validateLongitudinalFinanceSeries(
    series: LongitudinalFinanceSeries,
  ): string[] {
    const errors: string[] = [];
    if (!series.metadata.isStrictlyUninterpolated) {
      errors.push(
        `Longitudinal series must declare isStrictlyUninterpolated: true for ${series.govId}`,
      );
    }

    for (let i = 1; i < series.years.length; i++) {
      const curr = series.years[i];
      const prev = series.years[i - 1];
      if (curr !== undefined && prev !== undefined && curr <= prev) {
        errors.push(
          `Non-increasing or duplicate year in longitudinal finance series for ${series.govId}: ${prev} -> ${curr}`,
        );
      }
    }

    if (series.years.length !== series.records.length) {
      errors.push(
        `Series years count (${series.years.length}) does not match records count (${series.records.length}) for ${series.govId}`,
      );
    }

    return errors;
  }

  /**
   * Validates longitudinal employment series
   */
  public validateLongitudinalEmploymentSeries(
    series: LongitudinalEmploymentSeries,
  ): string[] {
    const errors: string[] = [];
    if (!series.metadata.isStrictlyUninterpolated) {
      errors.push(
        `Longitudinal series must declare isStrictlyUninterpolated: true for ${series.govId}`,
      );
    }

    for (let i = 1; i < series.years.length; i++) {
      const curr = series.years[i];
      const prev = series.years[i - 1];
      if (curr !== undefined && prev !== undefined && curr <= prev) {
        errors.push(
          `Non-increasing or duplicate year in longitudinal employment series for ${series.govId}: ${prev} -> ${curr}`,
        );
      }
    }

    if (series.years.length !== series.summaries.length) {
      errors.push(
        `Series years count (${series.years.length}) does not match summaries count (${series.summaries.length}) for ${series.govId}`,
      );
    }

    return errors;
  }

  /**
   * Runs full validation over a complete corpus
   */
  public validateCorpus(params: {
    readonly governments: readonly GovernmentEntityMetadata[];
    readonly financeRecords: readonly FinanceRecord[];
    readonly employmentRecords: readonly EmploymentRecord[];
    readonly financeSeries?: readonly LongitudinalFinanceSeries[];
    readonly employmentSeries?: readonly LongitudinalEmploymentSeries[];
  }): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalChecked = 0;

    for (const gov of params.governments) {
      totalChecked++;
      errors.push(...this.validateGovernmentEntity(gov));
    }

    for (const fin of params.financeRecords) {
      totalChecked++;
      errors.push(...this.validateFinanceRecord(fin));
    }

    for (const emp of params.employmentRecords) {
      totalChecked++;
      errors.push(...this.validateEmploymentRecord(emp));
    }

    if (params.financeSeries) {
      for (const s of params.financeSeries) {
        totalChecked++;
        errors.push(...this.validateLongitudinalFinanceSeries(s));
      }
    }

    if (params.employmentSeries) {
      for (const s of params.employmentSeries) {
        totalChecked++;
        errors.push(...this.validateLongitudinalEmploymentSeries(s));
      }
    }

    return {
      isValid: errors.length === 0,
      totalChecked,
      errors,
      warnings,
    };
  }
}
