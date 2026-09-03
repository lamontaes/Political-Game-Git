/**
 * BEA rows into observations.
 *
 * The Bureau publishes withheld and unavailable values as parenthetical codes
 * rather than as blanks, and each code means something different. `(D)` is
 * disclosure suppression — the Bureau holds the number and will not publish it.
 * `(NA)` is not available, `(NM)` not meaningful, `(L)` a value too small to
 * display, `(T)` an estimate suppressed to avoid disclosure elsewhere. They map
 * onto distinct states rather than all collapsing into "missing", because a
 * value that exists and is withheld is a different problem from one nobody has.
 *
 * Geography level comes from the product, not from the shape of the code. Every
 * BEA identifier is five digits, so a rule that reads a five-digit code as a
 * county classifies Austin's metropolitan area as a county — which is precisely
 * what the audit found, with the MSA branch sitting unreachable below it.
 */

import { known, notApplicable, suppressed, unknown } from "../../core/index";
import type { DelimitedRow, Evidence, Sourced } from "../../core/index";
import type { BeaGeographyLevel, BeaObservationRecord, BeaValuationKind } from "./types";

/** The Bureau's published non-numeric value codes and what each one means. */
export const BEA_VALUE_CODES: Readonly<Record<string, { state: string; meaning: string }>> = {
  "(D)": {
    state: "SUPPRESSED",
    meaning: "Not shown to avoid disclosure of confidential information; the estimates are included in the totals.",
  },
  "(T)": {
    state: "SUPPRESSED",
    meaning: "Estimate suppressed to avoid disclosure of confidential information.",
  },
  "(NA)": { state: "UNKNOWN", meaning: "Not available." },
  "(NM)": { state: "NOT_APPLICABLE", meaning: "Not meaningful." },
  "(L)": {
    state: "SUPPRESSED",
    meaning: "Less than the display threshold; the estimate is included in the totals.",
  },
  "(NA)*": { state: "UNKNOWN", meaning: "Not available." },
};

/** Which geography level a product covers, declared per artifact. */
export interface BeaProductGeography {
  readonly defaultLevel: BeaGeographyLevel;
}

/**
 * Classify one row's geography.
 *
 * The product says what kind of areas it holds. Within that, BEA's own
 * conventions identify the exceptions: `00000` is the nation and a code ending
 * `000` is a state, in every product. `00999` and its siblings are the
 * Bureau's non-metropolitan-portion aggregates, which are neither.
 */
export function classifyBeaGeography(
  geoFips: string,
  geoName: string,
  product: BeaProductGeography,
): BeaGeographyLevel {
  if (geoFips === "00000") return "nation";
  if (/^\d{2}000$/.test(geoFips)) return "state";
  if (/(Nonmetropolitan Portion|Metropolitan Portion|Far West|Great Lakes|Mideast|New England|Plains|Rocky Mountain|Southeast|Southwest)/i.test(geoName)) {
    return "region-or-aggregate";
  }
  if (/^\d{2}9\d\d$/.test(geoFips) && product.defaultLevel === "county") {
    return "region-or-aggregate";
  }
  return product.defaultLevel;
}

/** What kind of quantity a unit string describes. */
export function classifyValuation(unit: string): BeaValuationKind {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "index") return "index";
  if (normalized === "number of persons") return "headcount";
  if (normalized === "dollars") return "currency-per-person";
  if (normalized.includes("dollars")) return "currency-amount";
  return "index";
}

export interface BeaNormalizeOptions {
  readonly tableName: string;
  readonly artifactId: string;
  readonly header: readonly string[];
  readonly year: string;
  readonly lineDescriptions: ReadonlyMap<string, string>;
  readonly product: BeaProductGeography;
}

function column(header: readonly string[], row: DelimitedRow, name: string): string {
  const index = header.indexOf(name);
  return index === -1 ? "" : (row.fields[index] ?? "");
}

/** Read one year's cell into the state the Bureau's code implies. */
export function readBeaValue(
  raw: string,
  year: string,
  locator: Evidence,
): Sourced<number> {
  const trimmed = raw.trim();
  const code = BEA_VALUE_CODES[trimmed];
  if (code) {
    if (code.state === "SUPPRESSED") {
      return suppressed([locator], `${trimmed} ${code.meaning}`);
    }
    if (code.state === "NOT_APPLICABLE") {
      return notApplicable([locator], `${trimmed} ${code.meaning}`);
    }
    return unknown(`${trimmed} ${code.meaning}`, [locator]);
  }
  if (trimmed === "") {
    return unknown(
      "The Bureau published no value in this cell and no code explaining its absence.",
      [locator],
    );
  }
  const value = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(value)) {
    return unknown(
      `The cell reads "${trimmed}", which is neither a number nor a code the Bureau documents. Reading it as a number would invent one.`,
      [locator],
    );
  }
  // An annual estimate is as of the end of the year it covers. That date is a
  // property of the observation, not of the day it was compiled.
  return known(value, [locator], "FINAL", `${year}-12-31`);
}

export function normalizeBeaObservations(
  rows: readonly DelimitedRow[],
  options: BeaNormalizeOptions,
): readonly BeaObservationRecord[] {
  const records: BeaObservationRecord[] = [];

  for (const row of rows) {
    const geoFips = column(options.header, row, "GeoFIPS");
    const geoName = column(options.header, row, "GeoName");
    const lineCode = column(options.header, row, "LineCode");
    const unit = column(options.header, row, "Unit");
    const rowDescription = column(options.header, row, "Description").trim();
    const region = column(options.header, row, "Region").trim();
    if (geoFips === "" || lineCode === "") continue;

    const evidence: Evidence = {
      artifactId: options.artifactId,
      locator: {
        kind: "table-cell",
        artifactId: options.artifactId,
        table: options.tableName,
        lineCode,
        period: options.year,
      },
      providerNativeId: `${options.tableName}:${geoFips}:${lineCode}`,
    };

    records.push({
      recordId: `${options.tableName}:${geoFips}:${lineCode}:${options.year}`,
      tableName: options.tableName,
      lineCode,
      lineDescription: options.lineDescriptions.get(lineCode) ?? rowDescription,
      rowDescription,
      geoFips,
      geoName,
      geographyLevel: classifyBeaGeography(geoFips, geoName, options.product),
      beaRegion: region === "" ? null : region,
      unit,
      valuationKind: classifyValuation(unit),
      year: options.year,
      value: readBeaValue(column(options.header, row, options.year), options.year, evidence),
      evidence,
    });
  }

  return records;
}
