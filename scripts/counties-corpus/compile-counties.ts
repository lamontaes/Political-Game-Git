import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const ROOT_DIR = resolve(__dirname, "../../");
const DATA_DIR = resolve(ROOT_DIR, "data/counties");
const INPUT_FILE = resolve(DATA_DIR, "2025_Gaz_counties_national.txt");
const OUTPUT_FILE = resolve(DATA_DIR, "compiled-counties.json");

export const PROVENANCE = {
  url: "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_counties_national.zip",
  vintage: "2025",
  retrievalDate: "2026-09-02T20:34:00.000Z",
  rawZipSha256:
    "4c90d0f805779923b5958ab13d0c1e9b99fe4932b786bfcf75dd739bb2dcb4ea",
  rawSha256: "1914f0d83243362de83b8ddd298c213b1768d63d62d19464743289abd8bb35b1",
  compilerVersion: "1.0.0",
  recordCount: 3222,
};

// Display overrides to keep canonical source identity separate from player-facing display identity
const DISPLAY_OVERRIDES: Record<string, Record<string, string>> = {
  DC: {
    "District of Columbia": "District of Columbia",
  },
};

export interface CompiledCounty {
  stateCode: string;
  stateFips: string;
  countyFips: string;
  geoid: string;
  geoidfq: string;
  ansiCode: string;
  sourceName: string;
  displayName: string;
  landAreaSqm: number;
  waterAreaSqm: number;
  landAreaSqMi: number;
  waterAreaSqMi: number;
  latitude: number;
  longitude: number;
}

export interface CountiesCorpus {
  provenance: typeof PROVENANCE;
  records: CompiledCounty[];
}

export function cleanCountyName(name: string): string {
  if (name.endsWith(" city")) {
    const base = name.slice(0, -5).trim();
    return `${base} City`;
  }
  return name
    .replace(
      /\s+(County|Parish|Borough|Census Area|Municipality|Municipio|Region|City and Borough)$/i,
      "",
    )
    .trim();
}

export function getDisplayName(stateCode: string, sourceName: string): string {
  if (
    DISPLAY_OVERRIDES[stateCode] &&
    DISPLAY_OVERRIDES[stateCode][sourceName]
  ) {
    return DISPLAY_OVERRIDES[stateCode][sourceName];
  }
  return cleanCountyName(sourceName);
}

export function parseCountyLine(line: string): CompiledCounty | null {
  const cols = line.split("|");
  // The 2025 Census Gazetteer Counties format strictly requires 11 pipe-delimited fields:
  // USPS|GEOID|GEOIDFQ|ANSICODE|NAME|ALAND|AWATER|ALAND_SQMI|AWATER_SQMI|INTPTLAT|INTPTLONG
  if (cols.length !== 11) {
    return null;
  }

  const stateCode = cols[0].trim();
  const geoid = cols[1].trim();

  // Validate state code (2 uppercase letters) and GEOID (5 numeric digits)
  if (!/^[A-Z]{2}$/.test(stateCode) || !/^\d{5}$/.test(geoid)) {
    return null;
  }

  const stateFips = geoid.substring(0, 2);
  const countyFips = geoid.substring(2, 5);

  const geoidfq = cols[2].trim();
  if (!geoidfq.startsWith("0500000US" + geoid)) {
    return null;
  }

  const ansiCode = cols[3].trim();
  if (!ansiCode) {
    return null;
  }

  const sourceName = cols[4].trim();
  if (!sourceName) {
    return null;
  }

  const landAreaSqm = parseInt(cols[5].trim(), 10);
  const waterAreaSqm = parseInt(cols[6].trim(), 10);
  const landAreaSqMi = parseFloat(cols[7].trim());
  const waterAreaSqMi = parseFloat(cols[8].trim());
  const lat = parseFloat(cols[9].trim());
  const lng = parseFloat(cols[10].trim());

  if (
    !Number.isFinite(landAreaSqm) ||
    !Number.isFinite(waterAreaSqm) ||
    !Number.isFinite(landAreaSqMi) ||
    !Number.isFinite(waterAreaSqMi) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    stateCode,
    stateFips,
    countyFips,
    geoid,
    geoidfq,
    ansiCode,
    sourceName,
    displayName: getDisplayName(stateCode, sourceName),
    landAreaSqm,
    waterAreaSqm,
    landAreaSqMi,
    waterAreaSqMi,
    latitude: lat,
    longitude: lng,
  };
}

export function compileCounties(
  inputFile: string,
  outputFile: string,
): CountiesCorpus {
  const data = readFileSync(inputFile, "utf-8");
  const lines = data.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const records: CompiledCounty[] = [];

  // First line is header
  for (let i = 1; i < lines.length; i++) {
    const record = parseCountyLine(lines[i]);
    if (record) {
      records.push(record);
    }
  }

  // Deterministically sort records by GEOID
  records.sort((a, b) => a.geoid.localeCompare(b.geoid));

  const corpus: CountiesCorpus = {
    provenance: {
      ...PROVENANCE,
      recordCount: records.length,
    },
    records,
  };

  writeFileSync(outputFile, JSON.stringify(corpus, null, 2), "utf-8");
  console.log(`Compiled ${records.length} counties to ${outputFile}`);
  return corpus;
}

// If run directly
if (process.argv[1] === __filename) {
  compileCounties(INPUT_FILE, OUTPUT_FILE);
}
