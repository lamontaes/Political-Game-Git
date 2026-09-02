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
  FteResolution,
} from "./types.js";
import { isFteResolved } from "./types.js";
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

/** Monthly hours the Census treats as one full-time schedule. */
const FULL_TIME_MONTHLY_HOURS = 160;

export interface FteResolutionInput {
  /** FTE as published by the source, when it publishes one. */
  readonly reported: number | null;
  readonly fullTimeEmployees: number | null;
  readonly partTimeEmployees: number | null;
  readonly partTimeHours: number | null;
  readonly partTimePayroll: number | null;
  readonly averageFullTimeSalary: number | null;
}

/**
 * Resolves full-time-equivalent employment, refusing to guess.
 *
 * Every unresolved branch returns `fte: null` with a status saying which input
 * was missing, so a caller can tell "no part-time staff, so FTE is the
 * headcount" apart from "part-time staff exist and we cannot convert them".
 */
export function resolveFullTimeEquivalent(input: FteResolutionInput): {
  readonly fte: number | null;
  readonly fteResolution: FteResolution;
} {
  const {
    reported,
    fullTimeEmployees,
    partTimeEmployees,
    partTimeHours,
    partTimePayroll,
    averageFullTimeSalary,
  } = input;

  // A directly published figure always wins; there is nothing to derive.
  if (reported !== null) {
    return {
      fte: Math.round(reported),
      fteResolution: {
        status: "reported_by_source",
        explanation: "The source published a full-time-equivalent figure.",
      },
    };
  }

  if (fullTimeEmployees === null) {
    return {
      fte: null,
      fteResolution: {
        status: "unresolved_unknown_full_time_headcount",
        explanation:
          "Full-time headcount is unknown, so there is no base to add part-time equivalence to.",
      },
    };
  }

  // A known zero is a finding; an unknown count is not.
  if (partTimeEmployees === 0) {
    return {
      fte: fullTimeEmployees,
      fteResolution: {
        status: "equals_full_time_no_part_time_staff",
        explanation:
          "The source reports zero part-time employees, so full-time-equivalent employment equals full-time headcount.",
      },
    };
  }

  if (partTimeEmployees === null) {
    return {
      fte: null,
      fteResolution: {
        status: "unresolved_unknown_part_time_headcount",
        explanation:
          "Part-time headcount is unknown, so it cannot be established whether any part-time contribution exists. " +
          "Full-time headcount is not a substitute: it would silently assert that there is none.",
      },
    };
  }

  // Part-time staff exist. Convert them, or say we cannot.
  if (partTimeHours !== null && partTimeHours > 0) {
    return {
      fte:
        fullTimeEmployees + Math.round(partTimeHours / FULL_TIME_MONTHLY_HOURS),
      fteResolution: {
        status: "derived_from_part_time_hours",
        explanation: `Part-time hours converted at ${FULL_TIME_MONTHLY_HOURS} monthly hours per full-time schedule.`,
      },
    };
  }

  if (
    partTimePayroll !== null &&
    partTimePayroll > 0 &&
    averageFullTimeSalary !== null &&
    averageFullTimeSalary > 0
  ) {
    return {
      fte:
        fullTimeEmployees + Math.round(partTimePayroll / averageFullTimeSalary),
      fteResolution: {
        status: "derived_from_part_time_payroll",
        explanation:
          "Part-time payroll converted against average full-time monthly salary, per the Census derivation.",
      },
    };
  }

  return {
    fte: null,
    fteResolution: {
      status: "unresolved_missing_part_time_conversion_inputs",
      explanation:
        `${partTimeEmployees} part-time employees are reported, but neither part-time hours nor ` +
        "part-time payroll against an average full-time salary was published, so their full-time " +
        "equivalent cannot be derived. Full-time headcount is not the answer: it omits this " +
        "contribution entirely while appearing to be a complete total.",
    },
  };
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

  // Resolve FTE.
  //
  // FTE = full-time headcount + the full-time equivalent of part-time labour.
  // The second term needs a conversion input. Where the source publishes none
  // and part-time staff exist, FTE is unknown — NOT the full-time headcount.
  // Returning the headcount would drop the entire part-time contribution while
  // still presenting itself as a complete total, which is the defect this
  // function was rebuilt to prevent.
  const { fte, fteResolution } = resolveFullTimeEquivalent({
    reported:
      input.fullTimeEquivalentEmployees === undefined
        ? null
        : input.fullTimeEquivalentEmployees,
    fullTimeEmployees: ftEmp,
    partTimeEmployees: ptEmp,
    partTimeHours: ptHours,
    partTimePayroll: ptPay,
    averageFullTimeSalary: avgFtSalary,
  });

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
    fullTimeEquivalentResolution: fteResolution,
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
/**
 * Reads a record's FTE resolution, tolerating records stored before this
 * metadata existed.
 *
 * A stored record that carries an FTE figure is taken at its word — the corpus
 * asserts the number. One that carries neither a figure nor a reason is
 * unresolved; assuming it complete is precisely the silent-omission failure
 * this metadata exists to stop.
 */
export function resolutionOfRecord(record: EmploymentRecord): FteResolution {
  if (record.fullTimeEquivalentResolution !== undefined) {
    return record.fullTimeEquivalentResolution;
  }
  if (record.fullTimeEquivalentEmployees !== null) {
    return {
      status: "reported_by_source",
      explanation:
        "Stored record carries a full-time-equivalent figure without resolution metadata; taken as reported.",
    };
  }
  return {
    status: "unresolved_missing_resolution_metadata",
    explanation:
      "Stored record carries neither a full-time-equivalent figure nor an account of why it is absent.",
  };
}

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
  let fteResolution: FteResolution;
  let totalPay: number | null = null;
  let ftPay: number | null = null;
  let ptPay: number | null = null;

  if (totalRecord) {
    totalEmp = totalRecord.totalEmployees;
    ftEmp = totalRecord.fullTimeEmployees;
    ptEmp = totalRecord.partTimeEmployees;
    fte = totalRecord.fullTimeEquivalentEmployees;
    fteResolution = resolutionOfRecord(totalRecord);
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
    // Summing only the resolved records would produce a total that looks
    // complete but silently omits every function whose FTE could not be
    // derived. An aggregate is only as resolved as its least resolved part.
    const unresolved = records.filter(
      (r) => !isFteResolved(resolutionOfRecord(r)),
    );
    if (unresolved.length > 0) {
      fte = null;
      fteResolution = {
        status: "unresolved_incomplete_aggregate",
        explanation:
          `${unresolved.length} of ${records.length} function records have unresolved full-time ` +
          `equivalent employment (${[...new Set(unresolved.map((r) => resolutionOfRecord(r).status))].join(", ")}), ` +
          "so no total can be stated. A partial sum would understate the total while presenting itself as complete.",
      };
    } else {
      fte = records.reduce(
        (acc, r) =>
          r.fullTimeEquivalentEmployees !== null
            ? (acc ?? 0) + r.fullTimeEquivalentEmployees
            : acc,
        null as number | null,
      );
      fteResolution = {
        status: "reported_by_source",
        explanation:
          "Summed across function records, each of which has a resolved full-time equivalent.",
      };
    }
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
    fullTimeEquivalentResolution: fteResolution,
    totalMonthlyPayroll: totalPay,
    fullTimeMonthlyPayroll: ftPay,
    partTimeMonthlyPayroll: ptPay,
    functions: records,
    quality: primary.quality,
    provenance: primary.provenance,
  };
}
