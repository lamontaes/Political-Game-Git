/**
 * LAUS corpus validation, including the rate/count reconciliation.
 *
 * The reconciliation is the interesting check and it is where the aggregate
 * type earns its keep. For an area and period, labour force should equal
 * employment plus unemployment, and the unemployment rate should equal
 * unemployment over labour force. Both hold only within the Bureau's published
 * rounding, and neither can be evaluated at all when a component is missing.
 *
 * That last point is the whole reason `reconcile` refuses an INCOMPLETE
 * aggregate rather than treating an absent component as zero. Substituting zero
 * would make every area with a missing count reconcile perfectly and wrongly.
 */

import { reconcile, sumSourced } from "../../core/index";
import type {
  CompiledCorpus,
  SourcedMember,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { LausObservationRecord } from "./types";

/** BLS publishes rates to one decimal, so a tenth of a point is rounding. */
export const RATE_TOLERANCE = 0.1;
/** Counts are published rounded, so a person either way is rounding. */
export const COUNT_TOLERANCE = 1;

export const MEASURE_UNEMPLOYMENT_RATE = "03";
export const MEASURE_UNEMPLOYMENT = "04";
export const MEASURE_EMPLOYMENT = "05";
export const MEASURE_LABOR_FORCE = "06";

const PROHIBITED_FIELD_TERMS = [
  "forecast",
  "projection",
  "predicted",
  "willBe",
  "trend",
  "outlook",
  "sentiment",
  "hardship",
  "distress",
];

export function validateLausCorpus(
  compiled: CompiledCorpus<LausObservationRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  if (production && compiled.corpus.coverage.isCompleteUniverse) {
    findings.push({
      severity: "error",
      code: "laus/coverage-overclaim",
      message:
        "This corpus compiles a declared slice of one LAUS data file and must say so. The audit's finding against #73 was a truncation committed under the publisher's filename with the full URL beside it.",
    });
  }

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (PROHIBITED_FIELD_TERMS.some((term) => key.toLowerCase().includes(term.toLowerCase()))) {
        findings.push({
          severity: "error",
          code: "laus/estimate-is-not-forecast",
          message: `Field "${key}" turns a published estimate into a prediction. LAUS reports what a model estimated for a past month.`,
          recordId: record.recordId,
        });
      }
    }

    if (record.value.state === "KNOWN") {
      if (record.measure.code === MEASURE_UNEMPLOYMENT_RATE) {
        if (record.value.value < 0 || record.value.value > 100) {
          findings.push({
            severity: "error",
            code: "laus/impossible-rate",
            message: `${record.recordId} reports an unemployment rate of ${record.value.value}.`,
            recordId: record.recordId,
          });
        }
      } else if (record.value.value < 0) {
        findings.push({
          severity: "error",
          code: "laus/negative-count",
          message: `${record.recordId} reports a count of ${record.value.value}.`,
          recordId: record.recordId,
        });
      }
    }

    // A preliminary value must say so on the value, not only in a footnote.
    const flaggedPreliminary = record.footnoteCodes.includes("P");
    if (
      record.value.state === "KNOWN" &&
      flaggedPreliminary &&
      record.value.release !== "PRELIMINARY"
    ) {
      findings.push({
        severity: "error",
        code: "laus/preliminary-not-carried",
        message: `${record.recordId} carries the Bureau's preliminary footnote but its value is marked ${record.value.release}.`,
        recordId: record.recordId,
      });
    }
  }

  if (!production) {
    return { domain: "bls-laus", checked: records.length, findings };
  }

  // Group by area, seasonal adjustment and period, then reconcile.
  const groups = new Map<string, Map<string, LausObservationRecord>>();
  for (const record of records) {
    const key = `${record.area.areaCode}|${record.seasonalAdjustmentCode}|${record.year}|${record.period}`;
    const group = groups.get(key) ?? new Map<string, LausObservationRecord>();
    group.set(record.measure.code, record);
    groups.set(key, group);
  }

  let reconciled = 0;
  let unreconcilable = 0;
  const disagreements: string[] = [];

  for (const [key, group] of groups) {
    const employment = group.get(MEASURE_EMPLOYMENT);
    const unemployment = group.get(MEASURE_UNEMPLOYMENT);
    const laborForce = group.get(MEASURE_LABOR_FORCE);
    const rate = group.get(MEASURE_UNEMPLOYMENT_RATE);
    if (!employment || !unemployment || !laborForce) continue;

    const parts: SourcedMember<number>[] = [
      { member: { memberId: `${key}|employment` }, value: employment.value },
      { member: { memberId: `${key}|unemployment` }, value: unemployment.value },
    ];
    const sum = sumSourced(parts);

    if (laborForce.value.state !== "KNOWN" || sum.state === "INCOMPLETE") {
      unreconcilable += 1;
      continue;
    }

    const outcome = reconcile(laborForce.value.value, sum, COUNT_TOLERANCE);
    if (outcome.outcome === "DISAGREES") {
      disagreements.push(
        `${key}: labour force ${laborForce.value.value} against employment plus unemployment ${sum.value} (difference ${outcome.difference})`,
      );
    } else {
      reconciled += 1;
    }

    if (rate?.value.state === "KNOWN" && laborForce.value.value > 0 && unemployment.value.state === "KNOWN") {
      const computed = (unemployment.value.value / laborForce.value.value) * 100;
      if (Math.abs(computed - rate.value.value) > RATE_TOLERANCE) {
        disagreements.push(
          `${key}: published rate ${rate.value.value} against unemployment over labour force ${computed.toFixed(3)}`,
        );
      }
    }
  }

  for (const disagreement of disagreements.slice(0, 10)) {
    findings.push({
      severity: "error",
      code: "laus/reconciliation",
      message: `Published components do not reconcile within the Bureau's rounding — ${disagreement}.`,
    });
  }
  if (disagreements.length > 10) {
    findings.push({
      severity: "error",
      code: "laus/reconciliation",
      message: `${disagreements.length - 10} further reconciliation failures are not listed.`,
    });
  }

  if (production && reconciled === 0 && groups.size > 0) {
    findings.push({
      severity: "error",
      code: "laus/nothing-reconciled",
      message:
        "No area and period had a complete set of components to reconcile, so the reconciliation proved nothing.",
    });
  }

  if (unreconcilable > 0) {
    findings.push({
      severity: "warning",
      code: "laus/incomplete-components",
      message: `${unreconcilable} area-periods have an unresolved component and were reported unreconcilable rather than reconciled against a substituted zero.`,
    });
  }

  return { domain: "bls-laus", checked: records.length, findings };
}
