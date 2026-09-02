/**
 * Normalizer & Vintage Safety Engine for Public Employment and Payroll Records
 *
 * Grounded in:
 * - Census Annual Survey of Public Employment & Payroll (1992-2025)
 * - Census of Governments Employment series
 */

import type {
  EmploymentRecord,
  GovernmentEmploymentSummary,
  DataQualityFlag,
  RecordProvenance,
  EnumerationType,
  ReferenceMonth,
  CensusGovId,
} from "./types.js";
import {
  createStableEmploymentRecordId,
  createStableGovernmentId,
} from "./ids.js";
import {
  getFunctionDefinition,
  checkHistoricalCompatibility,
} from "./codes.js";

export interface RawEmploymentInput {
  readonly censusGovId: CensusGovId;
  readonly surveyYear: number;
  readonly referenceMonth?: ReferenceMonth;
  readonly enumerationType: EnumerationType;
  readonly functionCode: string;
  readonly fullTimeEmployees?: number | null;
  readonly fullTimePayroll?: number | null; // Monthly dollars
  readonly partTimeEmployees?: number | null;
  readonly partTimePayroll?: number | null; // Monthly dollars
  readonly partTimeHours?: number | null;
  readonly fullTimeEquivalentEmployees?: number | null;
  readonly totalEmployees?: number | null;
  readonly totalPayroll?: number | null;
  readonly quality: DataQualityFlag;
  readonly provenance: RecordProvenance;
}

export function normalizeEmploymentRecord(
  input: RawEmploymentInput,
): EmploymentRecord {
  const ftEmp =
    input.fullTimeEmployees !== undefined && input.fullTimeEmployees !== null
      ? Math.round(input.fullTimeEmployees)
      : null;
  const ftPay =
    input.fullTimePayroll !== undefined && input.fullTimePayroll !== null
      ? Math.round(input.fullTimePayroll)
      : null;
  const ptEmp =
    input.partTimeEmployees !== undefined && input.partTimeEmployees !== null
      ? Math.round(input.partTimeEmployees)
      : null;
  const ptPay =
    input.partTimePayroll !== undefined && input.partTimePayroll !== null
      ? Math.round(input.partTimePayroll)
      : null;
  const ptHours =
    input.partTimeHours !== undefined && input.partTimeHours !== null
      ? Math.round(input.partTimeHours)
      : null;

  // Derive total employees
  let totalEmp: number | null = null;
  if (input.totalEmployees !== undefined && input.totalEmployees !== null) {
    totalEmp = Math.round(input.totalEmployees);
  } else if (ftEmp !== null && ptEmp !== null) {
    totalEmp = ftEmp + ptEmp;
  }

  // Derive total payroll
  let totalPay: number | null = null;
  if (input.totalPayroll !== undefined && input.totalPayroll !== null) {
    totalPay = Math.round(input.totalPayroll);
  } else if (ftPay !== null && ptPay !== null) {
    totalPay = ftPay + ptPay;
  }

  // Average full-time salary (monthly)
  const avgFtSalary =
    ftEmp !== null && ftEmp > 0 && ftPay !== null
      ? Math.round(ftPay / ftEmp)
      : null;

  // Derive FTE if not provided
  let fte: number | null = null;
  if (
    input.fullTimeEquivalentEmployees !== undefined &&
    input.fullTimeEquivalentEmployees !== null
  ) {
    fte = Math.round(input.fullTimeEquivalentEmployees);
  } else if (ftEmp !== null) {
    if (ptHours !== null && ptHours > 0) {
      // Standard 160 hours/month full time assumption
      fte = ftEmp + Math.round(ptHours / 160);
    } else if (
      ptPay !== null &&
      ptPay > 0 &&
      avgFtSalary !== null &&
      avgFtSalary > 0
    ) {
      // Census formula: Part-time payroll divided by average full-time pay
      fte = ftEmp + Math.round(ptPay / avgFtSalary);
    } else {
      fte = ftEmp;
    }
  }

  // Reference month: 1997+ is March; 1996 and earlier is October unless specified
  const refMonth: ReferenceMonth =
    input.referenceMonth ?? (input.surveyYear >= 1997 ? "March" : "October");

  const funcDef = getFunctionDefinition(input.functionCode);
  const functionName = funcDef
    ? funcDef.title
    : `Function ${input.functionCode}`;

  const compRule = checkHistoricalCompatibility(
    input.functionCode,
    input.surveyYear,
    2025,
  );

  return {
    recordId: createStableEmploymentRecordId(
      input.censusGovId,
      input.surveyYear,
      input.functionCode,
      input.quality.vintage,
    ),
    govId: createStableGovernmentId(input.censusGovId),
    censusGovId: input.censusGovId,
    surveyYear: input.surveyYear,
    referenceMonth: refMonth,
    enumerationType: input.enumerationType,
    functionCode: input.functionCode.padStart(3, "0"),
    functionName,
    fullTimeEmployees: ftEmp,
    fullTimePayroll: ftPay,
    partTimeEmployees: ptEmp,
    partTimePayroll: ptPay,
    partTimeHours: ptHours,
    fullTimeEquivalentEmployees: fte,
    totalEmployees: totalEmp,
    totalPayroll: totalPay,
    averageFullTimeSalary: avgFtSalary,
    quality: input.quality,
    compatibility: {
      isDefinitionCompatible: compRule.isCompatible,
      breakInSeries: compRule.breakInSeries,
      compatibilityNotes: compRule.notes,
    },
    provenance: input.provenance,
  };
}

/**
 * Summarizes an array of function-level employment records into a single GovernmentEmploymentSummary
 */
export function summarizeGovernmentEmployment(
  records: readonly EmploymentRecord[],
): GovernmentEmploymentSummary {
  const primary = records[0];
  if (!primary) {
    throw new Error("Cannot summarize empty employment records list");
  }
  const totalRecord = records.find((r) => r.functionCode === "000");

  let totalEmp: number | null = null;
  let ftEmp: number | null = null;
  let ptEmp: number | null = null;
  let fte: number | null = null;
  let totalPay: number | null = null;
  let ftPay: number | null = null;
  let ptPay: number | null = null;

  if (totalRecord) {
    totalEmp = totalRecord.totalEmployees;
    ftEmp = totalRecord.fullTimeEmployees;
    ptEmp = totalRecord.partTimeEmployees;
    fte = totalRecord.fullTimeEquivalentEmployees;
    totalPay = totalRecord.totalPayroll;
    ftPay = totalRecord.fullTimePayroll;
    ptPay = totalRecord.partTimePayroll;
  } else {
    // Aggregate sum from individual functions
    ftEmp = records.reduce(
      (acc, r) =>
        r.fullTimeEmployees !== null ? (acc ?? 0) + r.fullTimeEmployees : acc,
      null as number | null,
    );
    ptEmp = records.reduce(
      (acc, r) =>
        r.partTimeEmployees !== null ? (acc ?? 0) + r.partTimeEmployees : acc,
      null as number | null,
    );
    fte = records.reduce(
      (acc, r) =>
        r.fullTimeEquivalentEmployees !== null
          ? (acc ?? 0) + r.fullTimeEquivalentEmployees
          : acc,
      null as number | null,
    );
    ftPay = records.reduce(
      (acc, r) =>
        r.fullTimePayroll !== null ? (acc ?? 0) + r.fullTimePayroll : acc,
      null as number | null,
    );
    ptPay = records.reduce(
      (acc, r) =>
        r.partTimePayroll !== null ? (acc ?? 0) + r.partTimePayroll : acc,
      null as number | null,
    );

    if (ftEmp !== null || ptEmp !== null) {
      totalEmp = (ftEmp ?? 0) + (ptEmp ?? 0);
    }
    if (ftPay !== null || ptPay !== null) {
      totalPay = (ftPay ?? 0) + (ptPay ?? 0);
    }
  }

  return {
    govId: primary.govId,
    censusGovId: primary.censusGovId,
    surveyYear: primary.surveyYear,
    referenceMonth: primary.referenceMonth,
    enumerationType: primary.enumerationType,
    totalEmployees: totalEmp,
    fullTimeEmployees: ftEmp,
    partTimeEmployees: ptEmp,
    fullTimeEquivalentEmployees: fte,
    totalMonthlyPayroll: totalPay,
    fullTimeMonthlyPayroll: ftPay,
    partTimeMonthlyPayroll: ptPay,
    functions: records,
    quality: primary.quality,
    provenance: primary.provenance,
  };
}
