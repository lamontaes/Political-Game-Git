/**
 * Finance matrix rows into finance records.
 *
 * The one rule that governs this file is 42A Part 1's seventh doctrine: absence
 * is data only when coverage supports it, and a missing row must never become a
 * zero. So the amount's status decides its state, and there is exactly one path
 * to KNOWN — a status of KNOWN with a parseable number and a fiscal-year-ending
 * date to place it in time. Everything else is SUPPRESSED, NOT_APPLICABLE or
 * UNKNOWN, none of which carries a value key at all.
 *
 * A reported zero is not missing. A row whose status is KNOWN and whose amount
 * is "0" becomes KNOWN(0) and stays a genuine zero, distinct from the blank
 * cell two rows down that the Bureau never collected.
 *
 * Nothing is promoted, combined across years, or rolled into a composite. Each
 * row is one amount for one government in one year, and it stays exactly that.
 */

import {
  SourceValidationError,
  isCalendarDate,
  known,
  notApplicable,
  suppressed,
  unknown,
} from "../../core/index";
import type { Evidence, ParseDefect, Sourced } from "../../core/index";
import { financeField } from "./parse";
import type { DelimitedRow } from "../../core/index";
import type { EstimateBasis, FinanceCategory, FinanceRecord } from "./types";

const CATEGORIES: readonly FinanceCategory[] = [
  "REVENUE",
  "EXPENDITURE",
  "DEBT",
  "CASH_AND_SECURITIES",
];

const ESTIMATE_BASES: readonly EstimateBasis[] = [
  "CENSUS_UNIVERSE",
  "SAMPLE_ESTIMATE",
];

export interface FinanceNormalizeResult {
  readonly records: readonly FinanceRecord[];
  readonly defects: readonly ParseDefect[];
}

/**
 * Turn one row's status and amount into a sourced value.
 *
 * `KNOWN` is the only state that yields a number, and only when the amount is a
 * finite number and the fiscal-year-ending date can place it in time. A KNOWN
 * row missing either is not silently coerced; it becomes UNKNOWN and the
 * validator reports the gap.
 */
function readAmount(
  status: string,
  rawAmount: string,
  fiscalYearEnding: string,
  providerFlag: string,
  evidence: Evidence,
): Sourced<number> {
  switch (status) {
    case "KNOWN": {
      const trimmed = rawAmount.trim();
      const numeric = /^-?\d+(?:\.\d+)?$/.test(trimmed);
      if (!numeric) {
        return unknown(
          `The source marks this amount KNOWN but supplies "${rawAmount}", which is not a number.`,
          [evidence],
        );
      }
      if (!isCalendarDate(fiscalYearEnding)) {
        return unknown(
          `The source supplies amount "${trimmed}" but no usable fiscal-year-ending date ("${fiscalYearEnding}"), so it cannot be placed in time.`,
          [evidence],
        );
      }
      return known(Number(trimmed), [evidence], "FINAL", fiscalYearEnding);
    }
    case "SUPPRESSED":
      return suppressed(
        [evidence],
        providerFlag || "The Bureau withheld this amount.",
      );
    case "NOT_APPLICABLE":
      return notApplicable(
        [evidence],
        providerFlag ||
          "This fiscal line does not apply to this government type.",
      );
    case "NOT_AVAILABLE":
    case "UNKNOWN":
    default:
      return unknown(
        providerFlag ||
          `The product does not carry this amount for this government and reference period (status "${status}").`,
        [evidence],
      );
  }
}

export function normalizeFinances(
  rows: readonly DelimitedRow[],
  artifactId: string,
): FinanceNormalizeResult {
  const records: FinanceRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const censusGovId = financeField(row, "census_gov_id");
    const stateFips = financeField(row, "state_fips");
    const stateUsps = financeField(row, "state_usps").toUpperCase();
    const govTypeCode = financeField(row, "gov_type_code");
    const govName = financeField(row, "gov_name");
    const fiscalYearRaw = financeField(row, "fiscal_year");
    const fiscalYearEnding = financeField(row, "fiscal_year_ending");
    const categoryRaw = financeField(row, "category").toUpperCase();
    const itemCode = financeField(row, "item_code");
    const itemDescription = financeField(row, "item_description");
    const units = financeField(row, "units");
    const estimateBasisRaw = financeField(row, "estimate_basis").toUpperCase();
    const status = financeField(row, "status").toUpperCase();
    const amount = financeField(row, "amount");
    const providerFlag = financeField(row, "provider_flag");

    if (censusGovId.trim() === "") {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: a finance record with no Census government identifier cannot be joined to the registry.`,
      });
      continue;
    }
    const fiscalYear = Number(fiscalYearRaw);
    if (!/^\d{4}$/.test(fiscalYearRaw) || !Number.isInteger(fiscalYear)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${fiscalYearRaw}" is not a four-digit fiscal year.`,
      });
      continue;
    }
    const category = CATEGORIES.find((entry) => entry === categoryRaw);
    if (!category) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${categoryRaw}" is not a fiscal category this domain models.`,
      });
      continue;
    }
    const estimateBasis = ESTIMATE_BASES.find(
      (entry) => entry === estimateBasisRaw,
    );
    if (!estimateBasis) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${estimateBasisRaw}" is not a known estimate basis; the sample/universe distinction must be explicit.`,
      });
      continue;
    }
    if (itemCode.trim() === "") {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: a finance record must carry the source item code.`,
      });
      continue;
    }
    if (units.trim() === "") {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: a fiscal amount with no units is not interpretable.`,
      });
      continue;
    }

    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "delimited-row",
        artifactId,
        line: row.line,
        column: "amount",
      },
      providerNativeId: censusGovId,
    };

    records.push({
      recordId: `${censusGovId}:${category}:${itemCode}:${fiscalYear}`,
      censusGovId,
      stateFips,
      stateUsps,
      govTypeCode,
      govName,
      fiscalYear,
      fiscalYearEnding,
      category,
      itemCode,
      itemDescription,
      units,
      estimateBasis,
      amount: readAmount(
        status,
        amount,
        fiscalYearEnding,
        providerFlag,
        evidence,
      ),
      evidence,
    });
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.recordId)) {
      throw new SourceValidationError(
        `The finance matrix yields "${record.recordId}" twice; one government cannot report one item for one year twice.`,
      );
    }
    seen.add(record.recordId);
  }

  return { records, defects };
}
