import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePoliticalGeographyCorpus } from "../../src/political_geography/validator.js";
import type { PoliticalGeographyCorpus } from "../../src/political_geography/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

const inputCorpusFile = join(
  projectRoot,
  "data/political_geography/corpus/normalized_political_geography.json",
);

console.log("Validating Political Geography Corpus...");
let corpus: PoliticalGeographyCorpus;
try {
  const corpusJson = readFileSync(inputCorpusFile, "utf8");
  corpus = JSON.parse(corpusJson) as PoliticalGeographyCorpus;
} catch (err) {
  console.error(`Failed to read compiled corpus from ${inputCorpusFile}:`, err);
  process.exit(1);
}

const result = validatePoliticalGeographyCorpus(corpus);

console.log("\n================ VALIDATION REPORT ================");
console.log(`Corpus Schema Version: ${corpus.schemaVersion}`);
console.log(`Total Districts:       ${result.totalDistricts}`);
console.log(`Vintages:              ${result.vintages.join(", ")}`);
console.log(`Polygon Geometries:    ${result.stats.polygonCount}`);
console.log(`MultiPolygons:         ${result.stats.multiPolygonCount}`);
console.log(`Unique Geo Hashes:     ${result.stats.uniqueGeometryHashes}`);
console.log(`Adjacency Links:       ${result.stats.adjacencyLinksCount}`);
console.log(`Issues Encountered:    ${result.issues.length}`);
console.log("===================================================\n");

if (result.issues.length > 0) {
  for (const issue of result.issues) {
    const prefix = issue.severity === "error" ? "[ERROR]" : "[WARN]";
    console.log(
      `${prefix} (${issue.code}) District: ${issue.districtId || "N/A"}: ${issue.message}`,
    );
  }
}

if (!result.valid) {
  console.error(
    "\n❌ Political Geography Corpus Validation FAILED with errors.",
  );
  process.exit(1);
} else {
  console.log("✅ Political Geography Corpus Validation PASSED cleanly.");
}
