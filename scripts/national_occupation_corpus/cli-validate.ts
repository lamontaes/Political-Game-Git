import * as fs from "node:fs";
import * as path from "node:path";
import {
  NationalOccupationCompiler,
  CorpusValidator,
  type RawInputRecord,
  type WorkTaskSkillMetadata,
  type ManifestFileInput,
} from "../../src/national_occupation_corpus/index.js";

function main(): void {
  console.log("Validating National Occupation / Career Source Corpus...");
  const baseDir = path.resolve(
    process.cwd(),
    "data/national_occupation_source",
  );
  const fixturesDir = path.join(baseDir, "fixtures");

  const fixtureFiles = [
    "national_us_oews.json",
    "ky_fayette_lexington_oews.json",
    "tx_travis_austin_oews.json",
    "state_baselines_oews.json",
  ];

  const manifestInputs: ManifestFileInput[] = [];
  const rawRecords: RawInputRecord[] = [];

  const onetPath = path.join(fixturesDir, "onet_skills_tasks.json");
  const onetMetadata: WorkTaskSkillMetadata[] = JSON.parse(
    fs.readFileSync(onetPath, "utf8"),
  );
  const metadataMap = new Map(onetMetadata.map((m) => [m.soc2018Code, m]));

  for (const fileName of fixtureFiles) {
    const filePath = path.join(fixturesDir, fileName);
    const relativePath = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const parsed: RawInputRecord[] = JSON.parse(content);

    manifestInputs.push({
      path: relativePath,
      content,
      recordCount: parsed.length,
    });

    for (const record of parsed) {
      rawRecords.push({
        ...record,
        metadata: metadataMap.get(record.socCode) ?? null,
      });
    }
  }

  const compiler = new NationalOccupationCompiler();
  const compiled = compiler.compile(rawRecords, manifestInputs);

  console.log(
    `Successfully compiled ${compiled.records.length} occupation records.`,
  );
  console.log(
    `Covered SOC occupations: ${compiled.manifest.socOccupationCount}`,
  );
  console.log(
    `Geographic regions: ${compiled.manifest.geographicCoverage.join(", ")}`,
  );
  console.log(
    `Wage percentile coverage ratio: ${(compiled.manifest.wagePercentileCoverageRatio * 100).toFixed(1)}%`,
  );

  const validator = new CorpusValidator();
  const validation = validator.validateCorpus(
    compiled.records,
    compiled.manifest,
  );

  if (validation.valid) {
    console.log("Corpus Validation: PASSED (0 errors)");
  } else {
    console.error(
      `Corpus Validation: FAILED (${validation.errors.length} errors)`,
    );
    for (const err of validation.errors) {
      console.error(` - [${err.recordId ?? "corpus"}]: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
