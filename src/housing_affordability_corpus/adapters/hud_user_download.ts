/**
 * HUD USER Downloadable Files Parser
 *
 * Ingests official HUD USER Fair Market Rents (FMR) and Income Limits (IL)
 * datasets provided as CSV or structured JSON packages.
 */

import { normalizeFips } from "../ids.js";

export interface RawFmrDataRow {
  fipsCode: string;
  countyName: string;
  stateAlpha: string;
  cbsaCode?: string;
  metroName?: string;
  fmr0Br: number;
  fmr1Br: number;
  fmr2Br: number;
  fmr3Br: number;
  fmr4Br: number;
  year: string | number;
  percentile?: number;
  isSmallAreaFmr?: boolean;
}

export interface RawIncomeLimitDataRow {
  fipsCode: string;
  countyName: string;
  stateAlpha: string;
  cbsaCode?: string;
  metroName?: string;
  medianIncome: number;
  year: string | number;
  limits30Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>;
  limits50Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>;
  limits80Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>;
}

export const STATE_ALPHA_TO_FIPS: Record<string, string> = {
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
  PR: "72",
  VI: "78",
  GU: "66",
  MP: "69",
  AS: "60",
};

export function parseCsvRows(
  csvContent: string,
): Array<Record<string, string>> {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]!);
  const result: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]!;
      row[header] = values[j] ?? "";
    }
    result.push(row);
  }

  return result;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function parseFmrCsv(csvContent: string): RawFmrDataRow[] {
  const rows = parseCsvRows(csvContent);
  return rows.map((r) => {
    const fipsCode = normalizeFips(
      r.fips || r.fips_code || r.fipscode || r.county_fips,
      5,
    );
    const stateAlpha = (
      r.state_alpha ||
      r.state ||
      r.state_abbr ||
      ""
    ).toUpperCase();
    const year = r.year || r.vintage || "2024";

    return {
      fipsCode,
      countyName: r.county_name || r.countyname || r.county || "",
      stateAlpha,
      cbsaCode: r.cbsa || r.cbsacode || r.cbsa_code || undefined,
      metroName: r.metro_name || r.msa_name || r.areaname || undefined,
      fmr0Br: Number.parseInt(r.fmr_0 || r.fmr_0br || r.efficiency || "0", 10),
      fmr1Br: Number.parseInt(r.fmr_1 || r.fmr_1br || "0", 10),
      fmr2Br: Number.parseInt(r.fmr_2 || r.fmr_2br || "0", 10),
      fmr3Br: Number.parseInt(r.fmr_3 || r.fmr_3br || "0", 10),
      fmr4Br: Number.parseInt(r.fmr_4 || r.fmr_4br || "0", 10),
      year,
      percentile: Number.parseInt(r.percentile || "40", 10),
      isSmallAreaFmr: r.safmr === "true" || r.is_safmr === "1",
    };
  });
}

export function parseIncomeLimitCsv(
  csvContent: string,
): RawIncomeLimitDataRow[] {
  const rows = parseCsvRows(csvContent);
  return rows.map((r) => {
    const fipsCode = normalizeFips(
      r.fips || r.fips_code || r.fipscode || r.county_fips,
      5,
    );
    const stateAlpha = (
      r.state_alpha ||
      r.state ||
      r.state_abbr ||
      ""
    ).toUpperCase();
    const year = r.year || r.vintage || "2024";
    const medianIncome = Number.parseInt(
      r.median_income || r.mfi || r.median_family_income || "0",
      10,
    );

    const limits30Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number> = {
      1: Number.parseInt(r.l30_1 || r.il30_p1 || "0", 10),
      2: Number.parseInt(r.l30_2 || r.il30_p2 || "0", 10),
      3: Number.parseInt(r.l30_3 || r.il30_p3 || "0", 10),
      4: Number.parseInt(r.l30_4 || r.il30_p4 || "0", 10),
      5: Number.parseInt(r.l30_5 || r.il30_p5 || "0", 10),
      6: Number.parseInt(r.l30_6 || r.il30_p6 || "0", 10),
      7: Number.parseInt(r.l30_7 || r.il30_p7 || "0", 10),
      8: Number.parseInt(r.l30_8 || r.il30_p8 || "0", 10),
    };

    const limits50Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number> = {
      1: Number.parseInt(r.l50_1 || r.il50_p1 || "0", 10),
      2: Number.parseInt(r.l50_2 || r.il50_p2 || "0", 10),
      3: Number.parseInt(r.l50_3 || r.il50_p3 || "0", 10),
      4: Number.parseInt(r.l50_4 || r.il50_p4 || "0", 10),
      5: Number.parseInt(r.l50_5 || r.il50_p5 || "0", 10),
      6: Number.parseInt(r.l50_6 || r.il50_p6 || "0", 10),
      7: Number.parseInt(r.l50_7 || r.il50_p7 || "0", 10),
      8: Number.parseInt(r.l50_8 || r.il50_p8 || "0", 10),
    };

    const limits80Pct: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number> = {
      1: Number.parseInt(r.l80_1 || r.il80_p1 || "0", 10),
      2: Number.parseInt(r.l80_2 || r.il80_p2 || "0", 10),
      3: Number.parseInt(r.l80_3 || r.il80_p3 || "0", 10),
      4: Number.parseInt(r.l80_4 || r.il80_p4 || "0", 10),
      5: Number.parseInt(r.l80_5 || r.il80_p5 || "0", 10),
      6: Number.parseInt(r.l80_6 || r.il80_p6 || "0", 10),
      7: Number.parseInt(r.l80_7 || r.il80_p7 || "0", 10),
      8: Number.parseInt(r.l80_8 || r.il80_p8 || "0", 10),
    };

    return {
      fipsCode,
      countyName: r.county_name || r.countyname || r.county || "",
      stateAlpha,
      cbsaCode: r.cbsa || r.cbsacode || r.cbsa_code || undefined,
      metroName: r.metro_name || r.msa_name || r.areaname || undefined,
      medianIncome,
      year,
      limits30Pct,
      limits50Pct,
      limits80Pct,
    };
  });
}
