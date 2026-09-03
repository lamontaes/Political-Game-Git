/**
 * HUD workbook rows into records.
 *
 * Both workbooks publish a complete row for every area, so a missing cell is a
 * defect that drops the record rather than a zero. That matters more here than
 * almost anywhere else in the substrate: a Fair Market Rent of zero is not a
 * cheap area, and an income limit of zero is not a household that qualifies for
 * everything.
 */

import type { Evidence, ParseDefect } from "../../core/index";
import type { XlsxSheet } from "../../core/index";
import type {
  HudArea,
  HudFairMarketRentRecord,
  HudIncomeLimitRecord,
} from "./types";

export interface HudNormalizeResult<TRecord> {
  readonly records: readonly TRecord[];
  readonly defects: readonly ParseDefect[];
}

function indexer(header: readonly string[]) {
  return (name: string): number => header.indexOf(name);
}

function cell(row: readonly string[], index: number): string {
  return index === -1 ? "" : (row[index] ?? "").trim();
}

function money(
  raw: string,
  field: string,
  line: number,
  defects: ParseDefect[],
): number | null {
  if (raw === "") {
    defects.push({
      kind: "unparsable-record",
      line,
      message: `Line ${line}: ${field} is blank. A blank rent or limit is not zero, so this record is dropped rather than coerced.`,
    });
    return null;
  }
  const value = Number(raw.replace(/[$,]/g, ""));
  if (!Number.isFinite(value)) {
    defects.push({
      kind: "unparsable-record",
      line,
      message: `Line ${line}: ${field} reads "${raw}", which is not an amount.`,
    });
    return null;
  }
  return value;
}

function areaFrom(
  row: readonly string[],
  at: (name: string) => number,
  countyNameColumn: string,
): HudArea {
  const townName = cell(row, at("county_town_name"));
  return {
    hudFipsCode: cell(row, at("fips")),
    hudAreaCode: cell(row, at("hud_area_code")),
    hudAreaName: cell(row, at("hud_area_name")),
    stateUsps: cell(row, at("stusps")),
    stateFips: cell(row, at("state")),
    countyName: cell(row, at(countyNameColumn)),
    countyTownName: townName === "" ? null : townName,
    metropolitanIndicator: cell(row, at("metro")),
  };
}

export function normalizeFairMarketRents(
  sheet: XlsxSheet,
  artifactId: string,
  vintage: string,
): HudNormalizeResult<HudFairMarketRentRecord> {
  const header = sheet.rows[0] ?? [];
  const at = indexer(header);
  const records: HudFairMarketRentRecord[] = [];
  const defects: ParseDefect[] = [];

  sheet.rows.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    const area = areaFrom(row, at, "countyname");
    if (area.hudFipsCode === "") {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: the row carries no HUD area identifier.`,
      });
      return;
    }

    const rents: Record<string, number> = {};
    let complete = true;
    for (const bedrooms of ["0", "1", "2", "3", "4"]) {
      const value = money(
        cell(row, at(`fmr_${bedrooms}`)),
        `fmr_${bedrooms}`,
        line,
        defects,
      );
      if (value === null) complete = false;
      else rents[bedrooms] = value;
    }
    if (!complete) return;

    const populationRaw = cell(row, at("pop2022"));
    const population = populationRaw === "" ? null : Number(populationRaw);

    const evidence: Evidence = {
      artifactId,
      locator: { kind: "delimited-row", artifactId, line },
      providerNativeId: area.hudFipsCode,
    };

    records.push({
      recordKind: "fair-market-rent",
      recordId: `fmr:${vintage}:${area.hudFipsCode}`,
      product: "fair-market-rent",
      productVintage: vintage,
      area,
      publishedPopulation: Number.isFinite(population) ? population : null,
      rentByBedrooms: rents as HudFairMarketRentRecord["rentByBedrooms"],
      evidence,
    });
  });

  return { records, defects };
}

const FAMILY_SIZES = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function normalizeIncomeLimits(
  sheet: XlsxSheet,
  artifactId: string,
  vintage: string,
): HudNormalizeResult<HudIncomeLimitRecord> {
  const header = sheet.rows[0] ?? [];
  const at = indexer(header);
  const records: HudIncomeLimitRecord[] = [];
  const defects: ParseDefect[] = [];

  sheet.rows.slice(1).forEach((row, offset) => {
    const line = offset + 2;
    const area = areaFrom(row, at, "County_Name");
    if (area.hudFipsCode === "") {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: the row carries no HUD area identifier.`,
      });
      return;
    }

    const median = money(
      cell(row, at("median2025")),
      "median2025",
      line,
      defects,
    );
    if (median === null) return;

    const read = (prefix: string): Record<string, number> | null => {
      const values: Record<string, number> = {};
      for (const size of FAMILY_SIZES) {
        const column = `${prefix}${size}`;
        const value = money(cell(row, at(column)), column, line, defects);
        if (value === null) return null;
        values[size] = value;
      }
      return values;
    };

    const veryLow = read("l50_");
    const extremelyLow = read("ELI_");
    const low = read("l80_");
    if (!veryLow || !extremelyLow || !low) return;

    const evidence: Evidence = {
      artifactId,
      locator: { kind: "delimited-row", artifactId, line },
      providerNativeId: area.hudFipsCode,
    };

    records.push({
      recordKind: "income-limit",
      recordId: `income-limit:${vintage}:${area.hudFipsCode}`,
      product: "income-limit",
      productVintage: vintage,
      area,
      areaMedianFamilyIncome: median,
      veryLowIncomeLimitByFamilySize: veryLow,
      extremelyLowIncomeLimitByFamilySize: extremelyLow,
      lowIncomeLimitByFamilySize: low,
      evidence,
    });
  });

  return { records, defects };
}
