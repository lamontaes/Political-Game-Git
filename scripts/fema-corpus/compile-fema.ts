import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import type {
  DisasterDeclarationRecord,
  FemaCorpusDataset,
  FemaCorpusProvenance,
  DeclarationType,
  DesignatedAreaType,
} from "../../src/fema_disasters/types";
import {
  DECLARATION_TYPE_MAP,
  buildDeclarationId,
} from "../../src/fema_disasters/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "../..");
const RAW_DIR = path.join(REPO_ROOT, "data/fema-disasters/raw");
const PINNED_RAW_PATH = path.join(
  RAW_DIR,
  "fema-disaster-declarations-pinned.json",
);
const MANIFEST_PATH = path.join(RAW_DIR, "acquisition-manifest.json");
const COMPILED_OUTPUT_PATH = path.join(
  REPO_ROOT,
  "data/fema-disasters/compiled-fema-disasters.json",
);

function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function compileFemaCorpus(
  rawJsonPath = PINNED_RAW_PATH,
  manifestPath = MANIFEST_PATH,
): FemaCorpusDataset {
  if (!fs.existsSync(rawJsonPath)) {
    throw new Error(`Raw FEMA input file not found: ${rawJsonPath}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Acquisition manifest file not found: ${manifestPath}`);
  }

  const rawBytes = fs.readFileSync(rawJsonPath);
  const calculatedHash = sha256Buffer(rawBytes);

  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const rawArray = JSON.parse(rawBytes.toString("utf-8"));

  if (!Array.isArray(rawArray)) {
    throw new Error("Raw FEMA source JSON must be an array of objects");
  }

  let minDate = "9999-12-31";
  let maxDate = "0000-01-01";

  const records: DisasterDeclarationRecord[] = rawArray.map(
    (rawItem: unknown, index: number) => {
      const raw = rawItem as Record<string, unknown>;
      if (typeof raw.disasterNumber !== "number" || isNaN(raw.disasterNumber)) {
        throw new Error(
          `Record at index ${index} missing valid disasterNumber`,
        );
      }
      if (!raw.state || typeof raw.state !== "string") {
        throw new Error(`Record at index ${index} missing state`);
      }
      if (
        !raw.declarationType ||
        typeof raw.declarationType !== "string" ||
        !["DR", "EM", "FM"].includes(raw.declarationType)
      ) {
        throw new Error(
          `Record at index ${index} has invalid declarationType: ${String(raw.declarationType)}`,
        );
      }
      if (!raw.declarationDate || typeof raw.declarationDate !== "string") {
        throw new Error(`Record at index ${index} missing declarationDate`);
      }

      const declType = raw.declarationType as DeclarationType;
      const declDate = raw.declarationDate;
      const dateYmd = declDate.slice(0, 10);
      if (dateYmd < minDate) minDate = dateYmd;
      if (dateYmd > maxDate) maxDate = dateYmd;

      const designatedArea =
        typeof raw.designatedArea === "string" &&
        raw.designatedArea.trim() !== ""
          ? raw.designatedArea.trim()
          : null;
      const fipsCountyCode =
        typeof raw.fipsCountyCode === "string" &&
        raw.fipsCountyCode.trim() !== ""
          ? raw.fipsCountyCode.trim()
          : null;
      const fipsStateCode =
        typeof raw.fipsStateCode === "string" && raw.fipsStateCode.trim() !== ""
          ? raw.fipsStateCode.trim()
          : null;

      const declarationId = buildDeclarationId(
        raw.disasterNumber,
        raw.state,
        designatedArea,
        fipsCountyCode,
      );

      // Derive area type
      let areaType: DesignatedAreaType = null;
      if (
        raw.designatedAreaType &&
        typeof raw.designatedAreaType === "string" &&
        ["county", "tribal", "statewide", "other"].includes(
          raw.designatedAreaType,
        )
      ) {
        areaType = raw.designatedAreaType as DesignatedAreaType;
      } else if (designatedArea) {
        if (
          designatedArea.toLowerCase().includes("(county)") ||
          designatedArea.toLowerCase().includes("(parish)")
        ) {
          areaType = "county";
        } else if (designatedArea.toLowerCase() === "statewide") {
          areaType = "statewide";
        } else if (
          designatedArea.toLowerCase().includes("nation") ||
          designatedArea.toLowerCase().includes("tribe")
        ) {
          areaType = "tribal";
        } else {
          areaType = "other";
        }
      }

      // Preserve missing values as null (missing != zero or false)
      const record: DisasterDeclarationRecord = {
        declarationId,
        femaDeclarationString:
          (typeof raw.femaDeclarationString === "string" &&
            raw.femaDeclarationString) ||
          `${declType}-${raw.disasterNumber}-${raw.state.toUpperCase()}`,
        disasterNumber: raw.disasterNumber,
        state: raw.state.toUpperCase(),
        declarationType: declType,
        declarationDate: declDate,
        fyDeclared:
          typeof raw.fyDeclared === "number"
            ? raw.fyDeclared
            : parseInt(declDate.slice(0, 4), 10),
        incidentType:
          (typeof raw.incidentType === "string" && raw.incidentType) ||
          "Unspecified",
        declarationTitle:
          (typeof raw.declarationTitle === "string" && raw.declarationTitle) ||
          "UNSPECIFIED DISASTER DECLARATION",
        incidentBeginDate:
          typeof raw.incidentBeginDate === "string"
            ? raw.incidentBeginDate
            : null,
        incidentEndDate:
          typeof raw.incidentEndDate === "string" ? raw.incidentEndDate : null,
        designatedArea,
        designatedAreaType: areaType,
        fipsStateCode,
        fipsCountyCode,
        placeCode: typeof raw.placeCode === "string" ? raw.placeCode : null,
        ihProgramDeclared:
          typeof raw.ihProgramDeclared === "boolean"
            ? raw.ihProgramDeclared
            : null,
        iaProgramDeclared:
          typeof raw.iaProgramDeclared === "boolean"
            ? raw.iaProgramDeclared
            : null,
        paProgramDeclared:
          typeof raw.paProgramDeclared === "boolean"
            ? raw.paProgramDeclared
            : null,
        hmProgramDeclared:
          typeof raw.hmProgramDeclared === "boolean"
            ? raw.hmProgramDeclared
            : null,
        lastRefresh:
          typeof raw.lastRefresh === "string" ? raw.lastRefresh : null,
        underlying_physical_hazard:
          (typeof raw.incidentType === "string" && raw.incidentType) ||
          "Unspecified Hazard",
        administrative_declaration_or_response:
          DECLARATION_TYPE_MAP[declType] || "Administrative Declaration",
      };

      return record;
    },
  );

  // Sort records deterministically: declarationDate ascending, disasterNumber ascending, declarationId ascending
  records.sort((a, b) => {
    if (a.declarationDate !== b.declarationDate) {
      return a.declarationDate.localeCompare(b.declarationDate);
    }
    if (a.disasterNumber !== b.disasterNumber) {
      return a.disasterNumber - b.disasterNumber;
    }
    return a.declarationId.localeCompare(b.declarationId);
  });

  const provenance: FemaCorpusProvenance = {
    officialEndpointUrl:
      manifestJson.officialEndpointUrl ||
      "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries",
    queryOrVersion:
      manifestJson.queryOrVersion ||
      "OpenFEMA v2 DisasterDeclarationsSummaries",
    retrievalTimestamp:
      manifestJson.retrievalTimestamp || new Date().toISOString(),
    rawSourceSha256: calculatedHash,
    compilerVersion: "1.0.0",
    recordCount: records.length,
    dateRange: {
      minDate: minDate !== "9999-12-31" ? minDate : "2000-01-01",
      maxDate: maxDate !== "0000-01-01" ? maxDate : "2025-01-01",
    },
    license:
      manifestJson.license ||
      "U.S. Government Work - OpenFEMA Public Domain (17 U.S.C. 105)",
  };

  const dataset: FemaCorpusDataset = {
    schemaVersion: "1.0.0",
    compiledAt: "2025-01-15T12:00:00.000Z", // Fixed timestamp for deterministic compile
    provenance,
    records,
  };

  return dataset;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    const dataset = compileFemaCorpus();
    fs.mkdirSync(path.dirname(COMPILED_OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(
      COMPILED_OUTPUT_PATH,
      JSON.stringify(dataset, null, 2) + "\n",
    );
    console.log(
      `Successfully compiled ${dataset.records.length} FEMA disaster declaration records to ${COMPILED_OUTPUT_PATH}`,
    );
  } catch (err) {
    console.error("Compilation error:", err);
    process.exit(1);
  }
}
