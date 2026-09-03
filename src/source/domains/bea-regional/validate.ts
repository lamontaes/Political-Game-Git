/**
 * BEA corpus validation.
 *
 * The geography check is the one that matters. The audit's finding against #69
 * was not that a classifier was slightly wrong but that its metropolitan branch
 * was unreachable — every five-digit code matched the county test above it, so
 * the corpus reported zero metropolitan areas while holding one. A count of
 * zero in a category the product exists to publish is the shape that check
 * looks for.
 */

import { isUnresolved } from "../../core/index";
import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { BeaObservationRecord } from "./types";

/**
 * Official vectors: facts read from the Bureau's published tables.
 *
 * The Austin vector is the audit's own example — #69 classified that
 * metropolitan area as a county. The Doña Ana vector is a different kind of
 * silence: its ñ is a single Latin-1 byte, so a reader that assumes UTF-8
 * produces a county name with a replacement character and nothing complains.
 */
export const OFFICIAL_BEA_VECTORS: readonly {
  readonly recordIdPrefix: string;
  readonly geoName: string;
  readonly geographyLevel: string;
  readonly note: string;
}[] = [
  {
    recordIdPrefix: "MARPP:12420:1:",
    geoName: "Austin-Round Rock-San Marcos, TX (Metropolitan Statistical Area)",
    geographyLevel: "msa",
    note: "The metropolitan area the audit found classified as a county.",
  },
  {
    recordIdPrefix: "CAINC1:35013:1:",
    geoName: "Doña Ana, NM",
    geographyLevel: "county",
    note: "A county whose name survives only if the table is read in its published Latin-1 encoding.",
  },
];

const PROHIBITED_FIELD_TERMS = [
  "costOfLiving",
  "affordab",
  "desirab",
  "score",
  "rank",
  "prosperity",
  "quality",
  "attractiveness",
  "sentiment",
  "advantage",
];

export function validateBeaCorpus(
  compiled: CompiledCorpus<BeaObservationRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  const byLevel = new Map<string, number>();
  const byTable = new Map<string, number>();
  const units = new Map<string, Set<string>>();

  for (const record of records) {
    byLevel.set(
      record.geographyLevel,
      (byLevel.get(record.geographyLevel) ?? 0) + 1,
    );
    byTable.set(record.tableName, (byTable.get(record.tableName) ?? 0) + 1);

    const key = `${record.tableName}:${record.lineCode}`;
    const seen = units.get(key) ?? new Set<string>();
    seen.add(`${record.unit}|${record.valuationKind}`);
    units.set(key, seen);

    for (const field of Object.keys(record)) {
      if (
        PROHIBITED_FIELD_TERMS.some((term) =>
          field.toLowerCase().includes(term.toLowerCase()),
        )
      ) {
        findings.push({
          severity: "error",
          code: "bea/statistic-is-not-judgement",
          message: `Field "${field}" turns a published estimate into a judgement about a place. A price parity is a price level, not a ranking.`,
          recordId: record.recordId,
        });
      }
    }

    if (record.unit.trim() === "") {
      findings.push({
        severity: "error",
        code: "bea/unit-missing",
        message: `Observation ${record.recordId} carries no unit. A BEA figure without its unit is not a figure.`,
        recordId: record.recordId,
      });
    }

    if (
      record.value.state === "KNOWN" &&
      record.valuationKind === "index" &&
      record.value.value <= 0
    ) {
      findings.push({
        severity: "error",
        code: "bea/impossible-index",
        message: `Observation ${record.recordId} reports an index of ${record.value.value}. A regional price parity is a positive index relative to 100.`,
        recordId: record.recordId,
      });
    }
  }

  // One line code must not carry two different units within a table: that is
  // how nominal dollars and a chained index end up added together.
  for (const [key, seen] of units) {
    if (seen.size > 1) {
      findings.push({
        severity: "error",
        code: "bea/mixed-units",
        message: `Line ${key} carries more than one unit across the corpus: ${[...seen].join(", ")}.`,
      });
    }
  }

  if (production) {
    if (compiled.corpus.coverage.isCompleteUniverse) {
      findings.push({
        severity: "error",
        code: "bea/coverage-overclaim",
        message:
          "This corpus compiles one year of three tables out of a much larger published series and must say so.",
      });
    }

    if ((byLevel.get("msa") ?? 0) === 0) {
      findings.push({
        severity: "error",
        code: "bea/no-metropolitan-areas",
        message:
          "The corpus includes the Bureau's metropolitan price parity table but holds no observation classified as an MSA. That is the shape of the classifier defect the audit found: every five-digit code matching a county test placed above an unreachable metropolitan branch.",
      });
    }
    if ((byLevel.get("county") ?? 0) === 0) {
      findings.push({
        severity: "error",
        code: "bea/no-counties",
        message:
          "The corpus includes a county table but holds no county observation.",
      });
    }
    if ((byLevel.get("state") ?? 0) === 0) {
      findings.push({
        severity: "error",
        code: "bea/no-states",
        message: "The corpus holds no state observation.",
      });
    }

    // The Bureau withholds values. A corpus with no unresolved value at all,
    // over tens of thousands of observations, means suppression codes were
    // read as numbers somewhere.
    const unresolved = records.filter((record) =>
      isUnresolved(record.value),
    ).length;
    if (records.length > 1000 && unresolved === 0) {
      findings.push({
        severity: "warning",
        code: "bea/no-suppression-observed",
        message:
          "No observation in the corpus is unresolved. BEA withholds and marks values in every large table, so this may mean a parenthetical code was read as a number.",
      });
    }
  }

  if (production) {
    for (const vector of OFFICIAL_BEA_VECTORS) {
      const record = records.find((entry) =>
        entry.recordId.startsWith(vector.recordIdPrefix),
      );
      if (!record) {
        findings.push({
          severity: "error",
          code: "bea/oracle-missing",
          message: `No observation matches official vector ${vector.recordIdPrefix}. ${vector.note}`,
        });
        continue;
      }
      if (record.geoName !== vector.geoName) {
        findings.push({
          severity: "error",
          code: "bea/oracle-geo-name",
          message: `${vector.recordIdPrefix} is published as "${vector.geoName}"; this corpus says "${record.geoName}". ${vector.note}`,
          recordId: record.recordId,
        });
      }
      if (record.geographyLevel !== vector.geographyLevel) {
        findings.push({
          severity: "error",
          code: "bea/oracle-geography-level",
          message: `${vector.recordIdPrefix} is a ${vector.geographyLevel}; this corpus classified it "${record.geographyLevel}". ${vector.note}`,
          recordId: record.recordId,
        });
      }
    }
  }

  return { domain: "bea-regional", checked: records.length, findings };
}
