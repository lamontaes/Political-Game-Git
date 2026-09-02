import fs from "fs";
import path from "path";
import { buildNationalCoverageManifest } from "../../../src/source/legislative-state/manifest_builder.js";

const MANIFEST_PATH = path.resolve(
  process.cwd(),
  "data/source/legislative-state/manifests/national_coverage_manifest.json",
);

export function runManifestGeneration(
  timestamp: string = "2026-08-28T00:00:00Z",
) {
  console.log(
    "================================================================================",
  );
  console.log(
    "POLITICAL GAME — NATIONAL LEGISLATIVE COVERAGE MANIFEST GENERATOR",
  );
  console.log(
    "================================================================================",
  );

  const manifest = buildNationalCoverageManifest({}, timestamp);
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(
    `Generated manifest for ${manifest.totalJurisdictions} jurisdictions across ${manifest.totalSessionsIndexed} sessions.`,
  );
  console.log(`Manifest SHA256: ${manifest.sha256}`);
  console.log(`Written to: ${MANIFEST_PATH}`);
  console.log(
    "--------------------------------------------------------------------------------",
  );
  console.log("Jurisdictions breakdown:");

  for (const [key, jur] of Object.entries(manifest.jurisdictions)) {
    console.log(
      `  [${key.toUpperCase().padEnd(7)}] ${jur.name.padEnd(24)} | ${jur.classification.padEnd(10)} | ${jur.chamberStructure.padEnd(22)} | Sessions: ${jur.availableSessionsCount}`,
    );
  }

  console.log(
    "================================================================================",
  );
  return manifest;
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  runManifestGeneration();
}
