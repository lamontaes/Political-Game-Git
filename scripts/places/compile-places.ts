import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const ROOT_DIR = resolve(__dirname, "../../");
const DATA_DIR = resolve(ROOT_DIR, "data/places");
const INPUT_FILE = resolve(DATA_DIR, "2025_Gaz_place_national.txt");
const OUTPUT_FILE = resolve(DATA_DIR, "compiled-places.json");

export const PROVENANCE = {
  url: "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip",
  vintage: "2025",
  retrievalDate: "2026-09-02T17:27:12.000Z",
  rawZipSha256:
    "49644173a453469d9bd77fb7a493b027f87567e209edaf2078aac7543ac2ee29",
  rawSha256: "15f4977a010cc42308f4d5ddc5e19f26ef63fc035f20745333a14b78aa08d3fa",
  compilerVersion: "1.0.0",
};

// Display overrides to keep canonical source identity separate from player-facing display identity
const DISPLAY_OVERRIDES: Record<string, Record<string, string>> = {
  KY: {
    "Lexington-Fayette urban county": "Lexington",
    "Louisville/Jefferson County metro government (balance)": "Louisville",
  },
  MA: {
    "Boston city": "Boston",
  },
  PA: {
    "Philadelphia city": "Philadelphia",
  },
  GA: {
    "Atlanta city": "Atlanta",
    "Athens-Clarke County unified government (balance)": "Athens",
    "Augusta-Richmond County consolidated government (balance)": "Augusta",
    "Macon-Bibb County": "Macon",
  },
  IN: {
    "Indianapolis city (balance)": "Indianapolis",
  },
  TN: {
    "Nashville-Davidson metropolitan government (balance)": "Nashville",
  },
  NY: {
    "New York city": "New York",
  },
  DC: {
    "Washington city": "Washington",
  },
};

export interface CompiledPlace {
  stateCode: string;
  placeCode: string;
  geoid: string;
  sourceName: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface PlacesCorpus {
  provenance: typeof PROVENANCE;
  records: CompiledPlace[];
}

export function cleanName(name: string): string {
  return name
    .replace(
      /\s+(city|town|village|borough|CDP|municipality|corporation)$/i,
      "",
    )
    .replace(/\s+city \(balance\)$/i, "")
    .trim();
}

export function getDisplayName(stateCode: string, sourceName: string): string {
  if (
    DISPLAY_OVERRIDES[stateCode] &&
    DISPLAY_OVERRIDES[stateCode][sourceName]
  ) {
    return DISPLAY_OVERRIDES[stateCode][sourceName];
  }
  return cleanName(sourceName);
}

export function parsePlaceLine(line: string): CompiledPlace | null {
  const cols = line.split("|");
  // The 2025 Census Gazetteer Places format strictly requires 13 pipe-delimited fields:
  // USPS|GEOID|GEOIDFQ|ANSICODE|NAME|LSAD|FUNCSTAT|ALAND|AWATER|ALAND_SQMI|AWATER_SQMI|INTPTLAT|INTPTLONG
  if (cols.length !== 13) {
    return null;
  }

  const stateCode = cols[0].trim();
  const geoid = cols[1].trim();

  // Validate state code (2 uppercase letters) and GEOID (7 numeric digits)
  if (!/^[A-Z]{2}$/.test(stateCode) || !/^\d{7}$/.test(geoid)) {
    return null;
  }

  const placeCode = geoid.substring(2);
  const sourceName = cols[4].trim();
  if (!sourceName) {
    return null;
  }

  const lat = parseFloat(cols[11].trim());
  const lng = parseFloat(cols[12].trim());

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    stateCode,
    placeCode,
    geoid,
    sourceName,
    displayName: getDisplayName(stateCode, sourceName),
    latitude: lat,
    longitude: lng,
  };
}

export function compilePlaces(
  inputFile: string,
  outputFile: string,
): PlacesCorpus {
  const data = readFileSync(inputFile, "utf-8");
  const lines = data.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const records: CompiledPlace[] = [];

  // First line is header
  for (let i = 1; i < lines.length; i++) {
    const record = parsePlaceLine(lines[i]);
    if (record) {
      records.push(record);
    }
  }

  // Deterministically sort records by GEOID
  records.sort((a, b) => a.geoid.localeCompare(b.geoid));

  const corpus: PlacesCorpus = {
    provenance: PROVENANCE,
    records,
  };

  writeFileSync(outputFile, JSON.stringify(corpus, null, 0), "utf-8");
  console.log(`Compiled ${records.length} places to ${outputFile}`);
  return corpus;
}

// If run directly
if (process.argv[1] === __filename) {
  compilePlaces(INPUT_FILE, OUTPUT_FILE);
}
