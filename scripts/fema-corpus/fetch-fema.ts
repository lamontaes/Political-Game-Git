import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "../..");
const RAW_DIR = path.join(REPO_ROOT, "data/fema-disasters/raw");
const PINNED_RAW_PATH = path.join(
  RAW_DIR,
  "fema-disaster-declarations-pinned.json",
);
const MANIFEST_PATH = path.join(RAW_DIR, "acquisition-manifest.json");

export async function fetchLiveOpenFemaData(
  topLimit = 1000,
): Promise<Record<string, unknown>[]> {
  const url = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=${topLimit}&$orderby=declarationDate%20desc`;
  console.log(`Fetching live OpenFEMA data from: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OpenFEMA API HTTP ${res.status}: ${res.statusText}`);
    }
    const data = (await res.json()) as {
      DisasterDeclarationsSummaries?: Record<string, unknown>[];
    };
    if (!data || !Array.isArray(data.DisasterDeclarationsSummaries)) {
      throw new Error("Invalid OpenFEMA response payload format");
    }
    return data.DisasterDeclarationsSummaries;
  } catch (err) {
    console.warn(
      "Failed to fetch live OpenFEMA data, using offline fallback.",
      err,
    );
    if (fs.existsSync(PINNED_RAW_PATH)) {
      return JSON.parse(fs.readFileSync(PINNED_RAW_PATH, "utf-8"));
    }
    throw err;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  (async () => {
    try {
      const records = await fetchLiveOpenFemaData();
      fs.mkdirSync(RAW_DIR, { recursive: true });
      const rawContent = JSON.stringify(records, null, 2) + "\n";
      fs.writeFileSync(PINNED_RAW_PATH, rawContent);
      const sha256 = crypto
        .createHash("sha256")
        .update(Buffer.from(rawContent))
        .digest("hex");

      const firstRecord = records[0] || {};
      const lastRecord = records[records.length - 1] || {};

      const manifest = {
        officialEndpointUrl:
          "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries",
        queryOrVersion: "OpenFEMA v2 DisasterDeclarationsSummaries",
        retrievalTimestamp: new Date().toISOString(),
        rawSourceSha256: sha256,
        recordCount: records.length,
        dateRange: {
          minDate:
            records.length > 0 && typeof lastRecord.declarationDate === "string"
              ? lastRecord.declarationDate.slice(0, 10)
              : "2000-01-01",
          maxDate:
            records.length > 0 &&
            typeof firstRecord.declarationDate === "string"
              ? firstRecord.declarationDate.slice(0, 10)
              : "2025-01-01",
        },
        license:
          "U.S. Government Work - OpenFEMA Public Domain (17 U.S.C. 105)",
        schemaVersion: "1.0.0",
      };

      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
      console.log(
        `Updated raw snapshot (${records.length} records) and manifest with SHA-256: ${sha256}`,
      );
    } catch (err) {
      console.error("Fetch error:", err);
      process.exit(1);
    }
  })();
}
