import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { validateFederalCourtsCorpus } from "../../src/federal_courts/validation";
import type { FederalCourtsCorpus } from "../../src/federal_courts/types";

function sha256File(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function validateFederalCourtsCli(): void {
  const rootDir = process.cwd();
  const rawSourcesPath = path.resolve(
    rootDir,
    "data/federal-courts/raw-sources.json",
  );
  const compiledOutputPath = path.resolve(
    rootDir,
    "data/federal-courts/compiled-federal-courts.json",
  );

  console.log("Validating Federal Courts Identity Corpus...");

  if (!fs.existsSync(rawSourcesPath)) {
    console.error(`ERROR: Raw sources manifest missing at ${rawSourcesPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(compiledOutputPath)) {
    console.error(`ERROR: Compiled corpus missing at ${compiledOutputPath}`);
    process.exit(1);
  }

  const rawSourcesJson = JSON.parse(fs.readFileSync(rawSourcesPath, "utf-8"));
  if (!rawSourcesJson.dataset_id || !Array.isArray(rawSourcesJson.sources)) {
    console.error("ERROR: Malformed raw sources manifest.");
    process.exit(1);
  }

  const compiledRaw = fs.readFileSync(compiledOutputPath, "utf-8");
  const compiled = JSON.parse(compiledRaw) as FederalCourtsCorpus;

  const result = validateFederalCourtsCorpus(compiled);
  if (!result.valid) {
    console.error("ERROR: Federal Courts Corpus Validation Failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  const compiledHash = sha256File(compiledOutputPath);

  console.log("Validation PASSED!");
  console.log(`  - Circuits: ${compiled.circuits.length}`);
  console.log(`  - Judicial Districts: ${compiled.districts.length}`);
  console.log(
    `  - Bankruptcy Courts: ${compiled.provenance.bankruptcy_courts_count}`,
  );
  console.log(
    `  - Article III Districts: ${compiled.provenance.article_iii_districts_count}`,
  );
  console.log(
    `  - Territorial Districts: ${compiled.provenance.territorial_districts_count}`,
  );
  console.log(`  - Compiled Corpus SHA-256: ${compiledHash}`);
}

if (process.argv[1]?.includes("validate-federal-courts")) {
  validateFederalCourtsCli();
}
