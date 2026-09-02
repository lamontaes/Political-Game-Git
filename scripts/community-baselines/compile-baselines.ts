import fs from "node:fs";
import path from "node:path";
import {
  compileAcsCommunityBaselines,
  type RawCensusApiResponse,
} from "../../src/community_baselines/compiler";
import { assertCommunityBaselineIntegrity } from "../../src/community_baselines/integrity";
import { ACS_VARIABLE_REGISTRY } from "../../src/community_baselines/variables";

const ROOT_DIR = path.resolve(import.meta.dirname, "../..");
const DATA_DIR = path.join(ROOT_DIR, "data/community_baselines");
const FIXTURES_DIR = path.join(DATA_DIR, "raw_fixtures");

export interface ManifestEntry {
  datasetId: string;
  vintage: number;
  filename: string;
  sha256: string;
  fileSizeBytes: number;
  recordCount: number;
  geographyCount: number;
  variableCount: number;
  geographies: { id: string; name: string; level: string }[];
  asOfDate: string;
  sourceAgency: string;
  datasetSeries: string;
  license: string;
  reviewStatus: string;
}

export interface BaselineManifest {
  manifestVersion: "1.0.0";
  generatedAt: string;
  variableRegistryCount: number;
  vintages: number[];
  datasets: ManifestEntry[];
}

export function compileAllBaselines(): {
  manifest: BaselineManifest;
  datasets: Record<number, string>;
} {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const fixtureFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"));
  const datasetsByVintage: Record<number, RawCensusApiResponse[]> = {};

  for (const file of fixtureFiles) {
    const rawContent = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
    const rawData = JSON.parse(rawContent) as RawCensusApiResponse;
    if (!datasetsByVintage[rawData.vintage]) {
      datasetsByVintage[rawData.vintage] = [];
    }
    datasetsByVintage[rawData.vintage].push(rawData);
  }

  const manifestEntries: ManifestEntry[] = [];
  const compiledPaths: Record<number, string> = {};

  const sortedVintages = Object.keys(datasetsByVintage)
    .map(Number)
    .sort((a, b) => a - b);

  for (const vintage of sortedVintages) {
    const inputs = datasetsByVintage[vintage];
    const compiled = compileAcsCommunityBaselines(inputs, {
      vintage,
      reviewStatus: "candidate",
    });

    assertCommunityBaselineIntegrity(compiled);

    const outFileName = `community-baselines-${vintage}.json`;
    const outPath = path.join(DATA_DIR, outFileName);
    const serialized = JSON.stringify(compiled, null, 2);

    fs.writeFileSync(outPath, serialized + "\n", "utf8");
    compiledPaths[vintage] = outPath;

    const fileStats = fs.statSync(outPath);
    const sha256 = compiled.sha256!;

    const uniqueVars = new Set(compiled.records.map((r) => r.variableId));

    manifestEntries.push({
      datasetId: compiled.datasetId,
      vintage,
      filename: outFileName,
      sha256,
      fileSizeBytes: fileStats.size,
      recordCount: compiled.records.length,
      geographyCount: compiled.geographies.length,
      variableCount: uniqueVars.size,
      geographies: compiled.geographies.map((g) => ({
        id: g.id,
        name: g.name,
        level: g.level,
      })),
      asOfDate: compiled.metadata.asOfDate,
      sourceAgency: compiled.metadata.sourceAgency,
      datasetSeries: compiled.metadata.datasetSeries,
      license: compiled.metadata.license,
      reviewStatus: compiled.metadata.reviewStatus,
    });

    console.log(
      `Compiled ${outFileName}: ${compiled.records.length} records across ${compiled.geographies.length} geographies (${fileStats.size} bytes, sha256: ${sha256.slice(0, 12)}...)`,
    );
  }

  const manifest: BaselineManifest = {
    manifestVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    variableRegistryCount: ACS_VARIABLE_REGISTRY.length,
    vintages: sortedVintages,
    datasets: manifestEntries,
  };

  const manifestPath = path.join(DATA_DIR, "manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  console.log(`Updated manifest at ${manifestPath}`);

  return {
    manifest,
    datasets: compiledPaths,
  };
}

if (process.argv[1] && process.argv[1].endsWith("compile-baselines.ts")) {
  compileAllBaselines();
}
