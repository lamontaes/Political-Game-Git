import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { generatePoliticalGeographyManifest } from "../../src/political_geography/manifest_builder.js";
import type { PoliticalGeographyCorpus } from "../../src/political_geography/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "../..");

const inputCorpusFile = join(
  projectRoot,
  "data/political_geography/corpus/normalized_political_geography.json",
);
const outputManifestFile = join(
  projectRoot,
  "data/political_geography/manifests/political_geography_manifest.json",
);

async function main() {
  console.log("Generating Political Geography Manifest...");
  const corpusJson = readFileSync(inputCorpusFile, "utf8");
  const corpus = JSON.parse(corpusJson) as PoliticalGeographyCorpus;

  const manifest = generatePoliticalGeographyManifest(corpus);

  const formatted = await prettier.format(JSON.stringify(manifest), {
    parser: "json",
  });
  writeFileSync(outputManifestFile, formatted, "utf8");
  console.log(
    `Successfully generated manifest for ${manifest.totalDistrictsAcrossAllVintages} districts across vintages [${manifest.supportedVintages.join(", ")}] to ${outputManifestFile}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
