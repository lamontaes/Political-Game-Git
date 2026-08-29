import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { compilePoliticalGeographyCorpus } from "../../src/political_geography/compiler.js";
import type { RawDistrictInput } from "../../src/political_geography/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

const fixturesDir2026 = join(
  projectRoot,
  "data/political_geography/fixtures/raw_tiger_2026",
);
const fixturesDir2024 = join(
  projectRoot,
  "data/political_geography/fixtures/raw_tiger_2024",
);
const outputCorpusFile = join(
  projectRoot,
  "data/political_geography/corpus/normalized_political_geography.json",
);

function loadAllFixtures(): RawDistrictInput[] {
  const allInputs: RawDistrictInput[] = [];

  for (const dir of [fixturesDir2026, fixturesDir2024]) {
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const fullPath = join(dir, file);
        const content = readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(content) as RawDistrictInput[];
        if (Array.isArray(parsed)) {
          allInputs.push(...parsed);
        }
      }
    } catch {
      // Directory might not exist or be empty
    }
  }

  return allInputs;
}

async function main() {
  console.log("Compiling Political Geography Source Corpus...");
  const rawInputs = loadAllFixtures();
  console.log(
    `Loaded ${rawInputs.length} raw district source records across fixtures.`,
  );

  const corpus = compilePoliticalGeographyCorpus(rawInputs, {
    fixedCompilationTimestamp: "2026-08-28T00:00:00.000Z",
  });

  const formatted = await prettier.format(JSON.stringify(corpus), {
    parser: "json",
  });
  writeFileSync(outputCorpusFile, formatted, "utf8");
  console.log(
    `Successfully compiled ${corpus.totalDistricts} normalized districts across vintages [${corpus.sourceVintages.join(", ")}] to ${outputCorpusFile}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
