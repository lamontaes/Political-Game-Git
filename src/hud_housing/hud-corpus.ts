import fs from "fs";
import path from "path";
import crypto from "crypto";
import type {
  HUDFairMarketRentRecord,
  HUDHousingCorpusManifest,
} from "./types.js";

/**
 * Future Housing / Affordability System Integration Guidance:
 *
 * 1. Epistemic Separation: This corpus provides official reference statistics published by HUD.
 *    It DOES NOT represent an individual household's actual paid rent, actual private lease contract,
 *    or individual economic status.
 * 2. Area vs. County Identity: HUD FMR and Income Limit areas often combine multiple counties into
 *    HMFAs or MSAs, or use town-based NECTAs in New England. Always query by HUD area code or map
 *    via associated_county_fips rather than assuming 1-to-1 county coverage.
 * 3. Explicit Missing Values: Missing bedroom rents or income limits MUST be handled as explicit null
 *    or missing, never as 0 or empty string.
 */

const COMPILED_DATA_PATH = path.join(
  process.cwd(),
  "data/hud-housing/compiled-hud-housing.json",
);
const MANIFEST_PATH = path.join(
  process.cwd(),
  "data/hud-housing/manifest.json",
);

export function loadHUDCorpusManifest(): HUDHousingCorpusManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`HUD Housing manifest not found at ${MANIFEST_PATH}`);
  }
  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw);
}

export function loadHUDCorpus(): HUDFairMarketRentRecord[] {
  if (!fs.existsSync(COMPILED_DATA_PATH)) {
    throw new Error(
      `Compiled HUD Housing corpus not found at ${COMPILED_DATA_PATH}`,
    );
  }
  const raw = fs.readFileSync(COMPILED_DATA_PATH, "utf-8");
  const records: HUDFairMarketRentRecord[] = JSON.parse(raw);
  return records;
}

export function getHUDRecordByAreaCode(
  hudAreaCode: string,
): HUDFairMarketRentRecord | undefined {
  const corpus = loadHUDCorpus();
  return corpus.find((r) => r.area.hud_area_code === hudAreaCode);
}

export function getHUDRecordsByCountyFips(
  countyFips: string,
): HUDFairMarketRentRecord[] {
  const corpus = loadHUDCorpus();
  return corpus.filter((r) =>
    r.area.associated_county_fips.includes(countyFips),
  );
}

export function getHUDRecordsByState(
  stateUsps: string,
): HUDFairMarketRentRecord[] {
  const corpus = loadHUDCorpus();
  return corpus.filter(
    (r) => r.area.state_usps.toUpperCase() === stateUsps.toUpperCase(),
  );
}

export interface HUDValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateHUDRecord(record: HUDFairMarketRentRecord): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!record.fiscal_year || typeof record.fiscal_year !== "number") {
    errors.push(`Record missing valid fiscal_year: ${JSON.stringify(record)}`);
  }

  if (
    !record.area ||
    !record.area.hud_area_code ||
    !record.area.hud_area_name
  ) {
    errors.push(
      `Record missing required area identification: ${JSON.stringify(record.area)}`,
    );
  }

  if (
    !["METRO_MSA", "HMFA", "NONMETRO_COUNTY", "NECTA"].includes(
      record.area?.area_type,
    )
  ) {
    errors.push(
      `Invalid HUD area type '${record.area?.area_type}' in area code ${record.area?.hud_area_code}`,
    );
  }

  if (
    !Array.isArray(record.area?.associated_county_fips) ||
    record.area.associated_county_fips.length === 0
  ) {
    errors.push(
      `Area ${record.area?.hud_area_code} must list at least one associated county FIPS`,
    );
  }

  // Verify bedroom rent fields and semantics (0BR <= 1BR <= 2BR <= 3BR <= 4BR when present)
  if (!record.rents) {
    errors.push(`Record ${record.area?.hud_area_code} missing rents object`);
  } else {
    const { rent_0br, rent_1br, rent_2br, rent_3br, rent_4br } = record.rents;

    // Check strict numeric or explicit null (not negative, not string "0" or NaN)
    for (const [key, val] of Object.entries(record.rents)) {
      if (val !== null && (typeof val !== "number" || isNaN(val) || val < 0)) {
        errors.push(
          `Invalid bedroom rent value for ${key} in area ${record.area?.hud_area_code}: ${val}`,
        );
      }
    }

    // Check logical bedroom rent progression when adjacent values are non-null
    if (rent_0br !== null && rent_1br !== null && rent_0br > rent_1br) {
      errors.push(
        `Bedroom rent anomaly in ${record.area?.hud_area_code}: 0BR (${rent_0br}) > 1BR (${rent_1br})`,
      );
    }
    if (rent_1br !== null && rent_2br !== null && rent_1br > rent_2br) {
      errors.push(
        `Bedroom rent anomaly in ${record.area?.hud_area_code}: 1BR (${rent_1br}) > 2BR (${rent_2br})`,
      );
    }
    if (rent_2br !== null && rent_3br !== null && rent_2br > rent_3br) {
      errors.push(
        `Bedroom rent anomaly in ${record.area?.hud_area_code}: 2BR (${rent_2br}) > 3BR (${rent_3br})`,
      );
    }
    if (rent_3br !== null && rent_4br !== null && rent_3br > rent_4br) {
      errors.push(
        `Bedroom rent anomaly in ${record.area?.hud_area_code}: 3BR (${rent_3br}) > 4BR (${rent_4br})`,
      );
    }
  }

  // Check income limits if present
  if (record.income_limits) {
    for (const [key, val] of Object.entries(record.income_limits)) {
      if (val !== null && (typeof val !== "number" || isNaN(val) || val < 0)) {
        errors.push(
          `Invalid income limit value for ${key} in area ${record.area?.hud_area_code}: ${val}`,
        );
      }
    }
  }

  // Check provenance
  if (
    !record.provenance ||
    !record.provenance.sha256 ||
    !record.provenance.source_url
  ) {
    errors.push(
      `Record ${record.area?.hud_area_code} missing required provenance metadata`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateHUDCorpusIntegrity(): HUDValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const manifest = loadHUDCorpusManifest();
    const records = loadHUDCorpus();

    if (manifest.record_count !== records.length) {
      errors.push(
        `Manifest record count (${manifest.record_count}) does not match actual records (${records.length})`,
      );
    }

    // Verify SHA-256 digest of compiled file matches manifest
    const compiledBytes = fs.readFileSync(COMPILED_DATA_PATH);
    const actualSha256 = crypto
      .createHash("sha256")
      .update(compiledBytes)
      .digest("hex");
    if (manifest.compiled_artifact.sha256 !== actualSha256) {
      errors.push(
        `Compiled HUD artifact SHA-256 mismatch! Manifest: ${manifest.compiled_artifact.sha256}, Actual: ${actualSha256}`,
      );
    }

    const seenAreaCodes = new Set<string>();

    for (const record of records) {
      const recVal = validateHUDRecord(record);
      if (!recVal.valid) {
        errors.push(...recVal.errors);
      }

      if (seenAreaCodes.has(record.area.hud_area_code)) {
        errors.push(
          `Duplicate HUD area code detected: ${record.area.hud_area_code}`,
        );
      }
      seenAreaCodes.add(record.area.hud_area_code);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Failed to load or validate HUD corpus: ${message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
