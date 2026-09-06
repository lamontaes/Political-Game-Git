/**
 * Government-finances corpus validation.
 *
 * The checks here enforce the task's critical data rules against the records the
 * compiler actually produced: a government identity that can be joined by code
 * rather than by name, units on every amount, the sample/universe distinction
 * kept explicit, the survey year and the fiscal-year-ending date both preserved
 * and consistent with the Bureau's own fiscal window, and — the one the backbone
 * is most emphatic about — no collapse of published amounts into a single
 * invented "capacity", "health" or "efficiency" score.
 *
 * The fiscal-window check is the subtle one. A survey year covers fiscal years
 * ending from July 1 of the previous calendar year through June 30 of the survey
 * year, so a September-30 or December-31 government is reported under a survey
 * year whose calendar year its books never touched. `survey-year.ts` holds that
 * contract; this file only applies it.
 */

import {
  findFabricatedScore,
  isCensusGovernmentId,
  isCalendarDate,
  isUnresolved,
} from "../../core/index";
import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import { isWithinSurveyYearWindow, surveyYearWindow } from "./survey-year";
import type { FinanceRecord } from "./types";

export function validateFinanceCorpus(
  compiled: CompiledCorpus<FinanceRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  for (const record of records) {
    if (!isCensusGovernmentId(record.censusGovId)) {
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
    /*
     * The survey year and the fiscal-year-ending date are two facts, and this
     * is the check that they agree without either being derived from the other.
     * A date outside the Bureau's window means the pair cannot both be right;
     * it is never grounds for editing the date until it matches the year.
     */
    if (record.fiscalYearEnding.trim() === "") {
      findings.push({
        severity: "error",
        code: "government-finances/no-fiscal-year-ending",
        message: `${record.recordId} states no fiscal-year-ending date. A survey year alone does not say when this government's books closed.`,
        recordId: record.recordId,
      });
    } else if (!isCalendarDate(record.fiscalYearEnding)) {
      findings.push({
        severity: "error",
        code: "government-finances/malformed-fiscal-year-ending",
        message: `${record.recordId} carries fiscal-year-ending "${record.fiscalYearEnding}", which is not a real calendar date.`,
        recordId: record.recordId,
      });
    } else if (
      !isWithinSurveyYearWindow(record.fiscalYear, record.fiscalYearEnding)
    ) {
      const { firstDay, lastDay } = surveyYearWindow(record.fiscalYear);
      findings.push({
        severity: "error",
        code: "government-finances/fiscal-year-outside-survey-window",
        message: `${record.recordId} reports survey year ${record.fiscalYear} with fiscal-year-ending ${record.fiscalYearEnding}, which is outside that survey year's window (${firstDay} through ${lastDay}). A survey year covers fiscal years ending from July 1 of the previous calendar year through June 30 of the survey year.`,
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

    const fabricated = findFabricatedScore(
      `${record.category} ${record.itemCode} ${record.itemDescription}`,
    );
    if (fabricated) {
      findings.push({
        severity: "error",
        code: "government-finances/invented-score",
        message: `${record.recordId} ${fabricated.reason} The Bureau publishes fiscal amounts; collapsing them into a single number is forbidden.`,
        recordId: record.recordId,
      });
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
      if (record.amount.asOf !== record.fiscalYearEnding) {
        findings.push({
          severity: "error",
          code: "government-finances/amount-date-drift",
          message: `${record.recordId} carries fiscal-year-ending ${record.fiscalYearEnding} but its amount is dated ${record.amount.asOf}. A KNOWN amount is placed at the date the government's books closed, and nowhere else.`,
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
