/**
 * Government-finances corpus validation.
 *
 * The checks here enforce the task's critical data rules against the records the
 * compiler actually produced: a government identity that can be joined by code
 * rather than by name, units on every amount, the sample/universe distinction
 * kept explicit, the reference year preserved on every value, and — the one the
 * backbone is most emphatic about — no collapse of published amounts into a
 * single invented "capacity", "health" or "efficiency" score.
 */

import { isUnresolved } from "../../core/index";
import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { FinanceRecord } from "./types";

/**
 * Tokens that mark an invented composite metric rather than a source line item.
 *
 * The Bureau publishes named revenue and expenditure items, debt and holdings;
 * it never publishes a "score", an "efficiency" or a "competence". A record
 * carrying one of these in its category, item code or description is not a
 * transcription of the source — it is a verdict the domain is forbidden to make.
 */
export const REJECTED_SCORE_TOKENS: readonly string[] = [
  "score",
  "efficiency",
  "competence",
  "composite index",
  "health index",
  "capacity index",
];

/** A Census government identifier is a 14-digit code, never a name. */
const GOV_ID_PATTERN = /^\d{14}$/;

export function validateFinanceCorpus(
  compiled: CompiledCorpus<FinanceRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  for (const record of records) {
    if (!GOV_ID_PATTERN.test(record.censusGovId)) {
      findings.push({
        severity: "error",
        code: "government-finances/malformed-gov-id",
        message: `${record.recordId} carries government id "${record.censusGovId}", which is not a 14-digit Census identifier. Records must be joinable by code, not by name.`,
        recordId: record.recordId,
      });
    }
    if (record.govName.trim() === "") {
      findings.push({
        severity: "warning",
        code: "government-finances/no-gov-name",
        message: `${record.recordId} supplies no government name. The name is retained where given, but the join key is the identifier.`,
        recordId: record.recordId,
      });
    }
    if (record.units.trim() === "") {
      findings.push({
        severity: "error",
        code: "government-finances/no-units",
        message: `${record.recordId} carries an amount with no units; a fiscal figure without units is not interpretable.`,
        recordId: record.recordId,
      });
    }

    const haystack =
      `${record.category} ${record.itemCode} ${record.itemDescription}`.toLowerCase();
    for (const token of REJECTED_SCORE_TOKENS) {
      if (haystack.includes(token)) {
        findings.push({
          severity: "error",
          code: "government-finances/invented-score",
          message: `${record.recordId} names "${token}". The source publishes fiscal amounts, not a composite ${token}; collapsing capacity into a single number is forbidden.`,
          recordId: record.recordId,
        });
      }
    }

    if (record.amount.state === "KNOWN") {
      if (!Number.isFinite(record.amount.value)) {
        findings.push({
          severity: "error",
          code: "government-finances/non-finite-amount",
          message: `${record.recordId} holds a non-finite amount.`,
          recordId: record.recordId,
        });
      }
      const asOfYear = Number(record.amount.asOf.slice(0, 4));
      if (asOfYear !== record.fiscalYear) {
        findings.push({
          severity: "error",
          code: "government-finances/year-mismatch",
          message: `${record.recordId} reports fiscal year ${record.fiscalYear} but its amount is dated ${record.amount.asOf}. Reference years must not drift or silently combine.`,
          recordId: record.recordId,
        });
      }
    }
  }

  /*
   * The sample/universe distinction must actually be used.
   *
   * A corpus that labels every record CENSUS_UNIVERSE across a span of years the
   * survey only samples has erased the distinction rather than recorded it. This
   * is a soft signal, not proof, so it is a warning — but a corpus with real
   * Annual Survey years and no SAMPLE_ESTIMATE anywhere is worth a second look.
   */
  const bases = new Set(records.map((record) => record.estimateBasis));
  const years = new Set(records.map((record) => record.fiscalYear));
  if (records.length >= 20 && years.size >= 3 && bases.size === 1) {
    findings.push({
      severity: "warning",
      code: "government-finances/single-estimate-basis",
      message: `Every record across ${years.size} fiscal years shares one estimate basis (${[...bases][0]}). The Annual Survey samples and the Census of Governments does not; a span with only one basis may have flattened the distinction.`,
    });
  }

  /*
   * A finance corpus with no unresolved amount anywhere is suspicious in the
   * same way the qualifications corpus is: the source suppresses figures and
   * omits lines for whole classes of small governments, so a large corpus in
   * which every amount resolved to KNOWN may have coerced a missing cell.
   */
  const unresolved = records.filter((record) =>
    isUnresolved(record.amount),
  ).length;
  if (records.length >= 20 && unresolved === 0) {
    findings.push({
      severity: "warning",
      code: "government-finances/no-missingness",
      message:
        "Every amount in the corpus resolved to KNOWN. The source withholds and omits amounts for many governments, so a corpus with no unresolved value may have turned a missing cell into a number.",
    });
  }

  return {
    domain: "government-finances",
    checked: records.length,
    findings,
  };
}
