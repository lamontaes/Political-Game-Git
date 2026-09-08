/**
 * HUD corpus validation.
 *
 * Two things are checked that a schema cannot see. First, that the two products
 * stayed separate: an area appearing once with both a rent and an income limit
 * would mean they had been merged. Second, that nothing in the corpus has grown
 * a field claiming somebody pays a rent or qualifies for a programme.
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { HudRecord } from "./types";

export const EXPECTED_FMR_AREA_COUNT = 4764;
export const EXPECTED_INCOME_LIMIT_AREA_COUNT = 4764;

const PROHIBITED_FIELD_TERMS = [
  "qualifies",
  "eligible",
  "eligibility",
  "pays",
  "rentPaid",
  "affordab",
  "burden",
  "assisted",
  "voucher",
  "waitlist",
  "tenant",
];

export function validateHudCorpus(
  compiled: CompiledCorpus<HudRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  const rents = records.filter(
    (record) => record.recordKind === "fair-market-rent",
  );
  const limits = records.filter(
    (record) => record.recordKind === "income-limit",
  );

  if (production) {
    if (rents.length !== EXPECTED_FMR_AREA_COUNT) {
      findings.push({
        severity: "error",
        code: "hud/fmr-count",
        message: `The FY2025 county-level Fair Market Rent file publishes ${EXPECTED_FMR_AREA_COUNT} areas; this corpus holds ${rents.length}.`,
      });
    }
    if (limits.length !== EXPECTED_INCOME_LIMIT_AREA_COUNT) {
      findings.push({
        severity: "error",
        code: "hud/income-limit-count",
        message: `The FY2025 Section 8 Income Limits file publishes ${EXPECTED_INCOME_LIMIT_AREA_COUNT} areas; this corpus holds ${limits.length}.`,
      });
    }
  }

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.recordId)) {
      findings.push({
        severity: "error",
        code: "hud/duplicate-record",
        message: `Record ${record.recordId} appears more than once.`,
        recordId: record.recordId,
      });
    }
    seen.add(record.recordId);

    for (const key of Object.keys(record)) {
      if (
        PROHIBITED_FIELD_TERMS.some((term) =>
          key.toLowerCase().includes(term.toLowerCase()),
        )
      ) {
        findings.push({
          severity: "error",
          code: "hud/reference-is-not-entitlement",
          message: `Field "${key}" turns a published reference value into a claim about a household. A Fair Market Rent is a market statistic; an income limit is a threshold, not a determination.`,
          recordId: record.recordId,
        });
      }
    }

    if (record.recordKind === "fair-market-rent") {
      // HUD's bedroom schedule is monotonic by construction. A break means the
      // columns were read out of order.
      const rents = record.rentByBedrooms;
      const ordered = ["0", "1", "2", "3", "4"] as const;
      for (let index = 1; index < ordered.length; index += 1) {
        const previous = rents[ordered[index - 1] as (typeof ordered)[number]];
        const current = rents[ordered[index] as (typeof ordered)[number]];
        if (current < previous) {
          findings.push({
            severity: "error",
            code: "hud/non-monotonic-bedroom-schedule",
            message: `${record.recordId} publishes a ${ordered[index]}-bedroom rent of ${current} below its ${ordered[index - 1]}-bedroom rent of ${previous}. HUD's schedule increases with bedroom count, so this reads as columns taken out of order.`,
            recordId: record.recordId,
          });
          break;
        }
      }
      for (const [bedrooms, value] of Object.entries(rents)) {
        if (value <= 0) {
          findings.push({
            severity: "error",
            code: "hud/impossible-rent",
            message: `${record.recordId} publishes a ${bedrooms}-bedroom rent of ${value}. A Fair Market Rent is a positive amount, and a zero here is what a coerced blank looks like.`,
            recordId: record.recordId,
          });
        }
      }
    }

    if (record.recordKind === "income-limit") {
      for (const size of Object.keys(record.veryLowIncomeLimitByFamilySize)) {
        const extremelyLow = record.extremelyLowIncomeLimitByFamilySize[size];
        const veryLow = record.veryLowIncomeLimitByFamilySize[size];
        const low = record.lowIncomeLimitByFamilySize[size];
        if (
          extremelyLow === undefined ||
          veryLow === undefined ||
          low === undefined
        )
          continue;
        if (extremelyLow > veryLow || veryLow > low) {
          findings.push({
            severity: "error",
            code: "hud/income-limit-ordering",
            message: `${record.recordId} at family size ${size} publishes extremely low ${extremelyLow}, very low ${veryLow} and low ${low}. HUD's thresholds are nested, so this reads as columns taken out of order.`,
            recordId: record.recordId,
          });
          break;
        }
      }
    }
  }

  // The two products are distinct. A record carrying both would mean they had
  // been folded into one vintage, which is exactly the finding against #71.
  for (const record of records) {
    const keys = Object.keys(record);
    if (
      keys.includes("rentByBedrooms") &&
      keys.includes("areaMedianFamilyIncome")
    ) {
      findings.push({
        severity: "error",
        code: "hud/products-merged",
        message: `${record.recordId} carries both a rent schedule and an income limit. Fair Market Rents and Income Limits are different statutory products on different calendars and must not share a record or a vintage.`,
        recordId: record.recordId,
      });
    }
  }

  return { domain: "hud-housing", checked: records.length, findings };
}
