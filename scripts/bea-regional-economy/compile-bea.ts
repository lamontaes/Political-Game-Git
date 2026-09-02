import { compileBeaCorpusFromArtifacts } from "../../src/bea_regional_economy/compiler.js";
import type { RawBeaArtifactInput } from "../../src/bea_regional_economy/compiler.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(REPO_ROOT, "data/bea_regional_economy");

const RAW_ARTIFACTS: RawBeaArtifactInput[] = [
  {
    artifactId: "bea_sainc1_state_personal_income_2022",
    tableId: "SAINC1",
    sourceUrlOrApiTable:
      "https://apps.bea.gov/api/data?DatasetName=Regional&TableName=SAINC1",
    retrievalDateIso: "2026-09-02T12:00:00.000Z",
    description:
      "BEA State Personal Income and Per Capita Personal Income (Table SAINC1, 2022)",
    defaultIndicatorCategory: "personal_income",
    rows: [
      {
        GeoFips: "00000",
        GeoName: "United States",
        TableName: "SAINC1",
        LineCode: "10",
        LineDescription: "Personal income (thousands of dollars)",
        TimePeriod: "2022",
        DataValue: "21820247000",
        CL_UNIT: "Thousands of Dollars",
        UNIT_MULT: "3",
      },
      {
        GeoFips: "48000",
        GeoName: "Texas",
        TableName: "SAINC1",
        LineCode: "10",
        LineDescription: "Personal income (thousands of dollars)",
        TimePeriod: "2022",
        DataValue: "1802345000",
        CL_UNIT: "Thousands of Dollars",
        UNIT_MULT: "3",
      },
      {
        GeoFips: "48000",
        GeoName: "Texas",
        TableName: "SAINC1",
        LineCode: "20",
        LineDescription: "Population (persons)",
        TimePeriod: "2022",
        DataValue: "30029848",
        CL_UNIT: "Persons",
        UNIT_MULT: "0",
      },
      {
        GeoFips: "48000",
        GeoName: "Texas",
        TableName: "SAINC1",
        LineCode: "30",
        LineDescription: "Per capita personal income (dollars)",
        TimePeriod: "2022",
        DataValue: "60018",
        CL_UNIT: "Dollars",
        UNIT_MULT: "0",
      },
    ],
  },
  {
    artifactId: "bea_cagdp2_county_gdp_2022",
    tableId: "CAGDP2",
    sourceUrlOrApiTable:
      "https://apps.bea.gov/api/data?DatasetName=Regional&TableName=CAGDP2",
    retrievalDateIso: "2026-09-02T12:00:00.000Z",
    description:
      "BEA County Real and Nominal Gross Domestic Product (Table CAGDP2, Travis County, 2022)",
    defaultIndicatorCategory: "gdp_nominal",
    rows: [
      {
        GeoFips: "48453",
        GeoName: "Travis, TX",
        TableName: "CAGDP2",
        LineCode: "1",
        LineDescription:
          "All industry total nominal GDP (thousands of dollars)",
        TimePeriod: "2022",
        DataValue: "115400000",
        CL_UNIT: "Thousands of Dollars",
        UNIT_MULT: "3",
      },
    ],
  },
  {
    artifactId: "bea_marpp_msa_rpp_2022",
    tableId: "MARPP",
    sourceUrlOrApiTable:
      "https://apps.bea.gov/api/data?DatasetName=Regional&TableName=MARPP",
    retrievalDateIso: "2026-09-02T12:00:00.000Z",
    description:
      "BEA Regional Price Parities by MSA (Table MARPP, Austin MSA, 2022)",
    defaultIndicatorCategory: "regional_price_parity",
    rows: [
      {
        GeoFips: "12420",
        GeoName: "Austin-Round Rock-Georgetown, TX (MSA)",
        TableName: "MARPP",
        LineCode: "1",
        LineDescription: "Regional Price Parities (RPPs): All items",
        TimePeriod: "2022",
        DataValue: "102.4",
        CL_UNIT: "Index (100 = U.S.)",
        UNIT_MULT: "0",
      },
    ],
  },
];

function main() {
  console.log("Compiling BEA Regional Economy Corpus...");

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const inputs = RAW_ARTIFACTS.map((artifact) => ({
    artifact,
    rawBytes: Buffer.from(JSON.stringify(artifact, null, 2)),
  }));

  const { observations, manifest } = compileBeaCorpusFromArtifacts(inputs);

  const compiledPath = path.join(DATA_DIR, "compiled-bea-regional.json");
  const manifestPath = path.join(DATA_DIR, "manifest.json");

  fs.writeFileSync(compiledPath, JSON.stringify(observations, null, 2));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    `Successfully compiled ${observations.length} BEA observations to ${compiledPath}`,
  );
  console.log(`Manifest written to ${manifestPath}`);
}

main();
