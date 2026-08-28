import fs from "fs";
import path from "path";
import { LegislativeCorpusCompiler } from "../../src/legislative_corpus/compiler.js";
import type { SessionState } from "../../src/legislative_corpus/types.js";

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  "data/legislative_source/fixtures",
);
const OPENSTATES_DIR = path.join(FIXTURES_DIR, "openstates");
const LEGISCAN_DIR = path.join(FIXTURES_DIR, "legiscan");
const OUTPUT_DIR = path.resolve(
  process.cwd(),
  "data/legislative_source/corpus",
);
const MANIFESTS_DIR = path.resolve(
  process.cwd(),
  "data/legislative_source/manifests",
);

export function runCorpusCompilation(
  timestamp: string = "2026-08-28T00:00:00Z",
) {
  console.log(
    "================================================================================",
  );
  console.log("POLITICAL GAME — NATIONAL LEGISLATIVE SOURCE CORPUS COMPILER");
  console.log(
    "================================================================================",
  );

  const compiler = new LegislativeCorpusCompiler();

  // Ingest Open States fixtures
  if (fs.existsSync(OPENSTATES_DIR)) {
    const files = fs
      .readdirSync(OPENSTATES_DIR)
      .filter((f) => f.endsWith(".json"));
    console.log(
      `Ingesting ${files.length} Open States fixture(s) from ${OPENSTATES_DIR}...`,
    );
    for (const file of files) {
      const fullPath = path.join(OPENSTATES_DIR, file);
      const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

      let sessionState: SessionState = "unknown";
      if (file.includes("unresolved")) {
        sessionState = "adjourned_sine_die";
      }

      compiler.ingest(
        {
          provider: "openstates",
          type: "measure",
          raw,
          options: { sessionState },
        },
        timestamp,
      );
    }
  }

  // Ingest LegiScan fixtures
  if (fs.existsSync(LEGISCAN_DIR)) {
    const files = fs
      .readdirSync(LEGISCAN_DIR)
      .filter((f) => f.endsWith(".json"));
    console.log(
      `Ingesting ${files.length} LegiScan fixture(s) from ${LEGISCAN_DIR}...`,
    );
    for (const file of files) {
      const fullPath = path.join(LEGISCAN_DIR, file);
      const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      compiler.ingest(
        {
          provider: "legiscan",
          type: "measure",
          raw,
        },
        timestamp,
      );
    }
  }

  console.log(
    "Compiling deterministic normalized legislative corpus package...",
  );
  const corpusPackage = compiler.compile(timestamp);

  // Ensure output directories exist
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(MANIFESTS_DIR, { recursive: true });

  const corpusPath = path.join(OUTPUT_DIR, "normalized_corpus.json");
  const manifestPath = path.join(
    MANIFESTS_DIR,
    "national_coverage_manifest.json",
  );

  const formattedCorpus = JSON.stringify(corpusPackage, null, 2);
  const formattedManifest = JSON.stringify(corpusPackage.manifest, null, 2);

  fs.writeFileSync(corpusPath, formattedCorpus, "utf-8");
  fs.writeFileSync(manifestPath, formattedManifest, "utf-8");

  const corpusSizeBytes = Buffer.byteLength(formattedCorpus, "utf-8");
  const manifestSizeBytes = Buffer.byteLength(formattedManifest, "utf-8");

  console.log(
    "--------------------------------------------------------------------------------",
  );
  console.log("COMPILATION SUMMARY:");
  console.log(
    `  Jurisdictions registered: ${corpusPackage.manifest.totalJurisdictions}`,
  );
  console.log(
    `  Sessions indexed:         ${corpusPackage.manifest.totalSessionsIndexed}`,
  );
  console.log(`  Measures normalized:      ${corpusPackage.measures.length}`);
  console.log(
    `  Text versions indexed:    ${corpusPackage.textVersions.length}`,
  );
  console.log(`  Actions recorded:         ${corpusPackage.actions.length}`);
  console.log(`  Roll call votes tracked:  ${corpusPackage.votes.length}`);
  console.log(`  Sponsors tracked:         ${corpusPackage.sponsors.length}`);
  console.log(
    `  Package Checksum:         ${corpusPackage.buildMetadata.checksum}`,
  );
  console.log(`  Manifest Checksum:        ${corpusPackage.manifest.sha256}`);
  console.log(
    `  Output corpus size:       ${(corpusSizeBytes / 1024).toFixed(2)} KB`,
  );
  console.log(
    `  Manifest size:            ${(manifestSizeBytes / 1024).toFixed(2)} KB`,
  );
  console.log(
    "================================================================================",
  );

  return corpusPackage;
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  runCorpusCompilation();
}
