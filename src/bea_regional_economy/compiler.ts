import crypto from "crypto";
import type {
  BeaCorpusManifest,
  BeaGeoLevel,
  BeaIndicatorCategory,
  BeaRegionalObservation,
  BeaSourceArtifactProvenance,
  BeaUnitMetadata,
  BeaValuationKind,
} from "./types.js";

export interface RawBeaApiRow {
  GeoFips: string;
  GeoName: string;
  TableName?: string;
  TableCode?: string;
  LineCode: string | number;
  LineDescription: string;
  TimePeriod: string | number;
  DataValue: string | number | null;
  CL_UNIT?: string;
  UNIT_MULT?: string | number;
  [key: string]: unknown;
}

export interface RawBeaArtifactInput {
  artifactId: string;
  tableId: string;
  sourceUrlOrApiTable: string;
  retrievalDateIso: string;
  description: string;
  defaultIndicatorCategory: BeaIndicatorCategory;
  rows: RawBeaApiRow[];
}

function classifyGeoLevel(geoid: string): BeaGeoLevel {
  const cleanFips = geoid.trim().padStart(5, "0");
  if (cleanFips === "00000") return "national";
  if (cleanFips.endsWith("000")) return "state";
  if (/^\d{5}$/.test(cleanFips)) return "county";
  if (/^\d{5}$/.test(geoid) && parseInt(geoid, 10) >= 10000) return "msa";
  return "county";
}

function classifyIndicatorCategory(
  defaultCat: BeaIndicatorCategory,
  lineDescription: string,
): BeaIndicatorCategory {
  const desc = lineDescription.toLowerCase();
  if (desc.includes("per capita personal income")) {
    return "per_capita_personal_income";
  }
  if (desc.includes("personal income")) {
    return "personal_income";
  }
  if (desc.includes("population")) {
    return "population";
  }
  if (desc.includes("real gdp") || desc.includes("chained gdp")) {
    return "gdp_real";
  }
  if (desc.includes("gdp") || desc.includes("gross domestic product")) {
    return "gdp_nominal";
  }
  if (desc.includes("price parity") || desc.includes("rpp")) {
    return "regional_price_parity";
  }
  return defaultCat;
}

function determineValuationKind(
  indicator: BeaIndicatorCategory,
  unitName: string,
): BeaValuationKind {
  if (indicator === "population") return "headcount";
  if (indicator === "regional_price_parity") return "index";
  if (indicator === "gdp_real" || unitName.toLowerCase().includes("chained"))
    return "real_chained";
  return "nominal";
}

function parseDataValue(rawVal: string | number | null | undefined): {
  value: number | null;
  isSuppressedOrMissing: boolean;
} {
  if (rawVal === null || rawVal === undefined) {
    return { value: null, isSuppressedOrMissing: true };
  }
  if (typeof rawVal === "number") {
    if (Number.isNaN(rawVal) || !Number.isFinite(rawVal)) {
      return { value: null, isSuppressedOrMissing: true };
    }
    return { value: rawVal, isSuppressedOrMissing: false };
  }
  const str = String(rawVal).trim().replace(/,/g, "");
  if (
    str === "" ||
    str === "(D)" ||
    str === "(NA)" ||
    str === "(NM)" ||
    str === "(L)" ||
    str === "..." ||
    str === "null"
  ) {
    return { value: null, isSuppressedOrMissing: true };
  }
  const parsed = parseFloat(str);
  if (Number.isNaN(parsed)) {
    return { value: null, isSuppressedOrMissing: true };
  }
  return { value: parsed, isSuppressedOrMissing: false };
}

export function compileBeaRawArtifact(
  artifact: RawBeaArtifactInput,
  rawFileBytes?: Uint8Array,
): {
  observations: BeaRegionalObservation[];
  provenance: BeaSourceArtifactProvenance;
} {
  const observations: BeaRegionalObservation[] = [];
  const sha256Hex = rawFileBytes
    ? crypto.createHash("sha256").update(rawFileBytes).digest("hex")
    : crypto
        .createHash("sha256")
        .update(JSON.stringify(artifact.rows))
        .digest("hex");

  for (const row of artifact.rows) {
    const geoid = String(row.GeoFips || "")
      .trim()
      .padStart(5, "0");
    const geoName = String(row.GeoName || "").trim();
    const geoLevel = classifyGeoLevel(geoid);
    const year = parseInt(String(row.TimePeriod || "").trim(), 10);
    const lineCode = String(row.LineCode || "1").trim();
    const lineDescription = String(row.LineDescription || "").trim();
    const tableId = artifact.tableId || row.TableName || "BEA_TABLE";

    const indicatorCategory = classifyIndicatorCategory(
      artifact.defaultIndicatorCategory,
      lineDescription,
    );

    const { value, isSuppressedOrMissing } = parseDataValue(row.DataValue);

    const unitName =
      String(row.CL_UNIT || "").trim() ||
      (lineDescription.includes("thousands")
        ? "Thousands of Dollars"
        : lineDescription.includes("Persons")
          ? "Persons"
          : "Dollars");

    const rawMult = row.UNIT_MULT !== undefined ? Number(row.UNIT_MULT) : NaN;
    const scaleFactor = !Number.isNaN(rawMult)
      ? Math.pow(10, rawMult)
      : unitName.toLowerCase().includes("thousands")
        ? 1000
        : unitName.toLowerCase().includes("millions")
          ? 1000000
          : 1;

    const valuationKind = determineValuationKind(indicatorCategory, unitName);

    const unit: BeaUnitMetadata = {
      unitName,
      scaleFactor,
      currencyCode:
        valuationKind === "headcount" || valuationKind === "index"
          ? undefined
          : "USD",
      baseYear: unitName.includes("2017")
        ? "2017"
        : unitName.includes("2012")
          ? "2012"
          : undefined,
      valuationKind,
    };

    const stateUsps =
      geoLevel === "state" || geoLevel === "county"
        ? geoName.split(",")[1]?.trim()
        : undefined;

    const id = `bea_obs_${geoid}_${tableId}_${lineCode}_${year}`;

    observations.push({
      id,
      geoid,
      geoName,
      geoLevel,
      stateUsps,
      year,
      indicatorCategory,
      tableId,
      lineCode,
      lineDescription,
      value,
      isSuppressedOrMissing,
      unit,
      vintage: artifact.retrievalDateIso.split("T")[0],
    });
  }

  const provenance: BeaSourceArtifactProvenance = {
    artifactId: artifact.artifactId,
    sourceUrlOrApiTable: artifact.sourceUrlOrApiTable,
    retrievalDateIso: artifact.retrievalDateIso,
    sha256Hex,
    description: artifact.description,
    recordCount: observations.length,
  };

  return { observations, provenance };
}

export function compileBeaCorpusFromArtifacts(
  artifactInputs: Array<{
    artifact: RawBeaArtifactInput;
    rawBytes?: Uint8Array;
  }>,
): {
  observations: BeaRegionalObservation[];
  manifest: BeaCorpusManifest;
} {
  const allObservations: BeaRegionalObservation[] = [];
  const sourceArtifacts: BeaSourceArtifactProvenance[] = [];

  const coverageByGeoLevel: Record<BeaGeoLevel, number> = {
    state: 0,
    county: 0,
    msa: 0,
    national: 0,
  };

  const coverageByIndicator: Record<BeaIndicatorCategory, number> = {
    personal_income: 0,
    per_capita_personal_income: 0,
    gdp_nominal: 0,
    gdp_real: 0,
    population: 0,
    regional_price_parity: 0,
  };

  let startYear = Infinity;
  let endYear = -Infinity;

  for (const input of artifactInputs) {
    const { observations, provenance } = compileBeaRawArtifact(
      input.artifact,
      input.rawBytes,
    );
    sourceArtifacts.push(provenance);

    for (const obs of observations) {
      allObservations.push(obs);
      coverageByGeoLevel[obs.geoLevel] =
        (coverageByGeoLevel[obs.geoLevel] || 0) + 1;
      coverageByIndicator[obs.indicatorCategory] =
        (coverageByIndicator[obs.indicatorCategory] || 0) + 1;

      if (obs.year < startYear) startYear = obs.year;
      if (obs.year > endYear) endYear = obs.year;
    }
  }

  // Sort deterministically by GEOID, tableId, lineCode, year
  allObservations.sort((a, b) => {
    if (a.geoid !== b.geoid) return a.geoid.localeCompare(b.geoid);
    if (a.tableId !== b.tableId) return a.tableId.localeCompare(b.tableId);
    if (a.lineCode !== b.lineCode) return a.lineCode.localeCompare(b.lineCode);
    return a.year - b.year;
  });

  const checksumSha256Hex = crypto
    .createHash("sha256")
    .update(JSON.stringify(allObservations))
    .digest("hex");

  const manifest: BeaCorpusManifest = {
    corpusName: "BEA Regional Economic Context Corpus Sidecar",
    corpusVersion: "2026.1",
    compiledAtIso: new Date().toISOString(),
    compilerVersion: "1.0.0",
    sourceArtifacts,
    totalObservations: allObservations.length,
    coverageByGeoLevel,
    coverageByIndicator,
    yearRange: {
      startYear: startYear === Infinity ? 2022 : startYear,
      endYear: endYear === -Infinity ? 2022 : endYear,
    },
    checksumSha256Hex,
  };

  return { observations: allObservations, manifest };
}
