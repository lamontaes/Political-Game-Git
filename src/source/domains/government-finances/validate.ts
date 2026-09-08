/**
 * Government-finances corpus validation.
 *
 * The checks here enforce the task's critical data rules against the records the
 * compiler actually produced: a government identity that can be joined by code
 * rather than by name, units on every amount, the sample/universe distinction
 * kept explicit, the survey year and the fiscal-year-ending date both preserved
 * and consistent with the Bureau's own fiscal window, the government's own
 * fiscal-year label kept distinct from both rather than derived from either,
 * and — the one the backbone is most emphatic about — no collapse of published
 * amounts into a single invented "capacity", "health" or "efficiency" score.
 *
 * Local records retain the July–June window; production state records carry
 * their separately documented survey-calendar-year basis. These source rules
 * must not be generalized across products.
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
      !(compiled.corpus.inputClass === "production" &&
      record.publisher?.periodBasis === "STATE_SURVEY_YEAR" &&
      record.govTypeCode === "0"
        ? record.fiscalYearEnding.slice(0, 4) === String(record.surveyYear)
        : isWithinSurveyYearWindow(record.surveyYear, record.fiscalYearEnding))
    ) {
      const { firstDay, lastDay } = surveyYearWindow(record.surveyYear);
      findings.push({
        severity: "error",
        code: "government-finances/fiscal-year-outside-survey-window",
        message: `${record.recordId} reports survey year ${record.surveyYear} with fiscal-year-ending ${record.fiscalYearEnding}, which is outside that survey year's window (${firstDay} through ${lastDay}). A survey year covers fiscal years ending from July 1 of the previous calendar year through June 30 of the survey year.`,
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

    /*
     * A fiscal-year label that is merely the survey year restated.
     *
     * The three year facts are separate, and the cheapest way to erase that
     * separation is to fill the label column from the survey-year column and
     * call the conflation a transcription. This does not catch a government
     * whose label genuinely equals its survey year — it cannot, and a June-30
     * state's label legitimately does — so it fires only where the label was
     * also asserted for a closing date in the *previous* calendar year, where
     * equality to the survey year cannot have come from the source.
     */
    if (
      record.fiscalYearLabel.state === "KNOWN" &&
      isCalendarDate(record.fiscalYearEnding) &&
      record.fiscalYearLabel.value.trim() === String(record.surveyYear) &&
      record.fiscalYearEnding.slice(0, 4) !== String(record.surveyYear)
    ) {
      findings.push({
        severity: "error",
        code: "government-finances/derived-fiscal-year-label",
        message: `${record.recordId} labels its fiscal year "${record.fiscalYearLabel.value}", which is the Census survey year, while the government's books closed on ${record.fiscalYearEnding} in a different calendar year. A fiscal-year label copied from the survey year is not a fact the source stated; leave it UNKNOWN unless the source publishes one.`,
        recordId: record.recordId,
      });
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
  const years = new Set(records.map((record) => record.surveyYear));
  if (records.length >= 20 && years.size >= 3 && bases.size === 1) {
    findings.push({
      severity: "warning",
      code: "government-finances/single-estimate-basis",
      message: `Every record across ${years.size} survey years shares one estimate basis (${[...bases][0]}). The Annual Survey samples and the Census of Governments does not; a span with only one basis may have flattened the distinction.`,
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
