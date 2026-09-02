import { validateBeaCorpus } from "../../src/bea_regional_economy/validator.js";
import type {
  BeaCorpusManifest,
  BeaRegionalObservation,
} from "../../src/bea_regional_economy/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(REPO_ROOT, "data/bea_regional_economy");

function main() {
  console.log("Validating BEA Regional Economy Corpus...");

  const compiledPath = path.join(DATA_DIR, "compiled-bea-regional.json");
  const manifestPath = path.join(DATA_DIR, "manifest.json");

  if (!fs.existsSync(compiledPath) || !fs.existsSync(manifestPath)) {
    console.error(
      `Error: Data files not found in ${DATA_DIR}. Run 'npm run compile:bea' first.`,
    );
    process.exit(1);
  }

  const observations: BeaRegionalObservation[] = JSON.parse(
    fs.readFileSync(compiledPath, "utf-8"),
  );
  const manifest: BeaCorpusManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8"),
  );

  const result = validateBeaCorpus(observations, manifest);

  if (!result.valid) {
    console.error("BEA Validation Failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `Validation PASSED cleanly for ${observations.length} observations in ${compiledPath}`,
  );
}

main();
