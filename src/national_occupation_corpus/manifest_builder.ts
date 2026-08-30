import { createHash } from "crypto";
import type {
  NationalOccupationCorpusManifest,
  NormalizedOccupationRecord,
} from "./types.js";

export interface ManifestFileInput {
  readonly path: string;
  readonly content: string;
  readonly recordCount: number;
}

export function computeSha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function buildNationalOccupationManifest(
  files: readonly ManifestFileInput[],
  records: readonly NormalizedOccupationRecord[],
  compiledAt: string = new Date().toISOString(),
): NationalOccupationCorpusManifest {
  const socCodes = new Set<string>();
  const geographicAreas = new Set<string>();
  let recordsWithPercentilesCount = 0;

  for (const record of records) {
    socCodes.add(record.soc.socCode);
    geographicAreas.add(
      `${record.geography.level}:${record.geography.areaCode}`,
    );
    if (
      record.wages.percentiles.pct50 !== null ||
      record.wages.annualPercentiles.pct50 !== null
    ) {
      recordsWithPercentilesCount++;
    }
  }

  const manifestFiles = files.map((file) => ({
    path: file.path,
    recordCount: file.recordCount,
    sha256: computeSha256(file.content),
  }));

  const wagePercentileCoverageRatio =
    records.length > 0 ? recordsWithPercentilesCount / records.length : 0;

  return {
    corpusId: "national-occupation-career-corpus-v1",
    version: "1.0.0",
    compiledAt,
    recordCount: records.length,
    socOccupationCount: socCodes.size,
    geographicCoverage: Array.from(geographicAreas).sort(),
    wagePercentileCoverageRatio:
      Math.round(wagePercentileCoverageRatio * 10000) / 10000,
    files: manifestFiles,
  };
}
