/**
 * National Names V2 Deterministic Compiler
 *
 * Merges authoritative Census 2020 and SSA 1880-2025 datasets into normalized,
 * sharded, reproducible JSON datasets with full provenance manifests.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseCensusFirstNames, parseCensusSurnames } from "./census-parser";
import { parseSSAGeographicArchive, parseSSANational } from "./ssa-parser";
import type {
  GivenNameSourceRecord,
  NamesSourceManifest,
  NamesSummaryIndex,
  ShardMetadata,
  SourceMetadata,
  SurnameSourceRecord,
} from "./schemas";

export const SCHEMA_VERSION = "2.0.0";
export const COMPILER_VERSION = "national-names-compiler-v2.0";

export interface CompileSourceBuffers {
  readonly censusFirstNamesBuffer: Buffer;
  readonly censusSurnamesBuffer: Buffer;
  readonly ssaNationalBuffer: Buffer;
  readonly ssaStateBuffer: Buffer;
  readonly ssaTerritoryBuffer: Buffer;
  readonly sourceMetadata?: Record<string, Partial<SourceMetadata>>;
}

export interface CompileResult {
  readonly manifest: NamesSourceManifest;
  readonly index: NamesSummaryIndex;
  readonly givenNameShards: Map<
    string,
    { filename: string; json: string; records: GivenNameSourceRecord[] }
  >;
  readonly surnameShards: Map<
    string,
    { filename: string; json: string; records: SurnameSourceRecord[] }
  >;
  readonly summary: {
    readonly totalGivenNames: number;
    readonly totalSurnames: number;
    readonly earliestSSAYear: number;
    readonly latestSSAYear: number;
    readonly states: string[];
    readonly territories: string[];
  };
}

export function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function sha256String(str: string): string {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

export function getShardKey(nameKey: string): string {
  const firstChar = nameKey.charAt(0).toLowerCase();
  if (firstChar >= "a" && firstChar <= "z") {
    return firstChar;
  }
  return "other";
}

export function compileNamesDataset(
  sources: CompileSourceBuffers,
): CompileResult {
  // 1. Ingest Census
  const censusFirstNames = parseCensusFirstNames(
    sources.censusFirstNamesBuffer,
  );
  const censusSurnames = parseCensusSurnames(sources.censusSurnamesBuffer);

  // 2. Ingest SSA
  const ssaNational = parseSSANational(sources.ssaNationalBuffer);
  const ssaState = parseSSAGeographicArchive(sources.ssaStateBuffer, "state");
  const ssaTerritory = parseSSAGeographicArchive(
    sources.ssaTerritoryBuffer,
    "territory",
  );

  // 3. Compile Given Names
  const allGivenKeys = new Set<string>();
  for (const fn of censusFirstNames) allGivenKeys.add(fn.key);
  for (const k of ssaNational.keys()) allGivenKeys.add(k);
  for (const k of ssaState.keys()) allGivenKeys.add(k);
  for (const k of ssaTerritory.keys()) allGivenKeys.add(k);

  const sortedGivenKeys = Array.from(allGivenKeys).sort();

  const censusFirstMap = new Map<string, (typeof censusFirstNames)[0]>();
  for (const item of censusFirstNames) {
    censusFirstMap.set(item.key, item);
  }

  let earliestYear = 9999;
  let latestYear = 0;
  const statesSet = new Set<string>();
  const territoriesSet = new Set<string>();

  const givenRecords: GivenNameSourceRecord[] = [];

  for (const key of sortedGivenKeys) {
    const censusEntry = censusFirstMap.get(key);
    const ssaNatEntry = ssaNational.get(key);
    const ssaStEntry = ssaState.get(key) || {};
    const ssaTerrEntry = ssaTerritory.get(key) || {};

    const provenance: string[] = [];
    if (censusEntry) provenance.push("census_2020_first_names");
    if (ssaNatEntry) provenance.push("ssa_national_1880_2025");
    if (Object.keys(ssaStEntry).length > 0) provenance.push("ssa_state");
    if (Object.keys(ssaTerrEntry).length > 0) provenance.push("ssa_territory");

    const displayName =
      censusEntry?.display_name ||
      ssaNatEntry?.display_name ||
      key.charAt(0).toUpperCase() + key.slice(1);

    if (ssaNatEntry) {
      if (ssaNatEntry.record.first_year < earliestYear)
        earliestYear = ssaNatEntry.record.first_year;
      if (ssaNatEntry.record.last_year > latestYear)
        latestYear = ssaNatEntry.record.last_year;
    }

    for (const st of Object.keys(ssaStEntry)) {
      statesSet.add(st);
    }
    for (const terr of Object.keys(ssaTerrEntry)) {
      territoriesSet.add(terr);
    }

    const rec: GivenNameSourceRecord = {
      key,
      display_name: displayName,
      census: censusEntry ? censusEntry.census : null,
      ssa_national: ssaNatEntry ? ssaNatEntry.record : null,
      ssa_state: ssaStEntry,
      ssa_territory: ssaTerrEntry,
      provenance,
    };

    givenRecords.push(rec);
  }

  // 4. Compile Surnames
  // Sort surnames alphabetically by key for predictable shard ordering
  const sortedSurnames = [...censusSurnames].sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  // 5. Partition Given Names into Shards
  const givenShards = new Map<
    string,
    { filename: string; json: string; records: GivenNameSourceRecord[] }
  >();
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

  for (const letter of alphabet) {
    givenShards.set(letter, {
      filename: `given_names_${letter}.json`,
      json: "",
      records: [],
    });
  }

  for (const rec of givenRecords) {
    const shardKey = getShardKey(rec.key);
    let shard = givenShards.get(shardKey);
    if (!shard) {
      shard = {
        filename: `given_names_${shardKey}.json`,
        json: "",
        records: [],
      };
      givenShards.set(shardKey, shard);
    }
    shard.records.push(rec);
  }

  for (const shard of givenShards.values()) {
    shard.json = JSON.stringify(shard.records) + "\n";
  }

  // 6. Partition Surnames into Shards
  const surnameShards = new Map<
    string,
    { filename: string; json: string; records: SurnameSourceRecord[] }
  >();

  for (const letter of alphabet) {
    surnameShards.set(letter, {
      filename: `surnames_${letter}.json`,
      json: "",
      records: [],
    });
  }

  for (const rec of sortedSurnames) {
    const shardKey = getShardKey(rec.key);
    let shard = surnameShards.get(shardKey);
    if (!shard) {
      shard = {
        filename: `surnames_${shardKey}.json`,
        json: "",
        records: [],
      };
      surnameShards.set(shardKey, shard);
    }
    shard.records.push(rec);
  }

  for (const shard of surnameShards.values()) {
    shard.json = JSON.stringify(shard.records) + "\n";
  }

  // 7. Calculate Shard Metadata
  const givenShardMeta: Record<string, ShardMetadata> = {};
  for (const [shardKey, shard] of givenShards) {
    const jsonBuf = Buffer.from(shard.json, "utf8");
    givenShardMeta[shardKey] = {
      file: `given-names/${shard.filename}`,
      sha256: sha256Buffer(jsonBuf),
      record_count: shard.records.length,
      size_bytes: jsonBuf.length,
    };
  }

  const surnameShardMeta: Record<string, ShardMetadata> = {};
  for (const [shardKey, shard] of surnameShards) {
    const jsonBuf = Buffer.from(shard.json, "utf8");
    surnameShardMeta[shardKey] = {
      file: `surnames/${shard.filename}`,
      sha256: sha256Buffer(jsonBuf),
      record_count: shard.records.length,
      size_bytes: jsonBuf.length,
    };
  }

  const sortedStates = Array.from(statesSet).sort();
  const sortedTerritories = Array.from(territoriesSet).sort();

  // 8. Build Sources Metadata
  const defaultSources: Record<string, SourceMetadata> = {
    census_2020_first_names: {
      agency: "U.S. Census Bureau",
      dataset_title:
        "Frequently Occurring First Names in the 2020 Census by Sex",
      source_url:
        "https://www2.census.gov/topics/genealogy/2020surnames/Names2020_FirstNames_Sex.xlsx",
      publication_vintage: "April 2026 release",
      retrieval_date: new Date().toISOString().split("T")[0],
      raw_filename: "Names2020_FirstNames_Sex.xlsx",
      raw_sha256: sha256Buffer(sources.censusFirstNamesBuffer),
      raw_bytes: sources.censusFirstNamesBuffer.length,
      license: "Public Domain (U.S. Government Work, 17 U.S.C. § 105)",
      notes:
        "Complete 2020 Decennial Census first names tabulations by recorded sex for 53,615 first names.",
    },
    census_2020_surnames: {
      agency: "U.S. Census Bureau",
      dataset_title:
        "Frequently Occurring Last Names in the 2020 Census by Race and Hispanic Origin",
      source_url:
        "https://www2.census.gov/topics/genealogy/2020surnames/Names2020_LastNames_RaceHispanic.xlsx",
      publication_vintage: "April 2026 release",
      retrieval_date: new Date().toISOString().split("T")[0],
      raw_filename: "Names2020_LastNames_RaceHispanic.xlsx",
      raw_sha256: sha256Buffer(sources.censusSurnamesBuffer),
      raw_bytes: sources.censusSurnamesBuffer.length,
      license: "Public Domain (U.S. Government Work, 17 U.S.C. § 105)",
      notes:
        "Complete 2020 Decennial Census surname tabulations for 156,621 last names occurring 100+ times.",
    },
    ssa_national_1880_2025: {
      agency: "Social Security Administration",
      dataset_title:
        "National Data on the Relative Frequency of Given Names (1880-2025)",
      source_url: "https://www.ssa.gov/oact/babynames/names.zip",
      publication_vintage: "March 2026 release",
      retrieval_date: new Date().toISOString().split("T")[0],
      raw_filename: "names.zip",
      raw_sha256: sha256Buffer(sources.ssaNationalBuffer),
      raw_bytes: sources.ssaNationalBuffer.length,
      license: "Public Domain (U.S. Government Work, 17 U.S.C. § 105)",
      notes:
        "Annual frequency tabulations for births in 50 states + DC from 1880 through 2025 based on Social Security card applications.",
    },
    ssa_state: {
      agency: "Social Security Administration",
      dataset_title:
        "State-Specific Data on the Relative Frequency of Given Names (1910-2025)",
      source_url: "https://www.ssa.gov/oact/babynames/state/namesbystate.zip",
      publication_vintage: "March 2026 release",
      retrieval_date: new Date().toISOString().split("T")[0],
      raw_filename: "namesbystate.zip",
      raw_sha256: sha256Buffer(sources.ssaStateBuffer),
      raw_bytes: sources.ssaStateBuffer.length,
      license: "Public Domain (U.S. Government Work, 17 U.S.C. § 105)",
      notes:
        "State-specific frequency tables for 50 states + DC for birth years 1910-2025. Names with <5 occurrences are suppressed.",
    },
    ssa_territory: {
      agency: "Social Security Administration",
      dataset_title:
        "Territory-Specific Data on Given Names (Puerto Rico & Territories)",
      source_url:
        "https://www.ssa.gov/oact/babynames/territory/namesbyterritory.zip",
      publication_vintage: "March 2026 release",
      retrieval_date: new Date().toISOString().split("T")[0],
      raw_filename: "namesbyterritory.zip",
      raw_sha256: sha256Buffer(sources.ssaTerritoryBuffer),
      raw_bytes: sources.ssaTerritoryBuffer.length,
      license: "Public Domain (U.S. Government Work, 17 U.S.C. § 105)",
      notes:
        "Territory-specific frequency tables for Puerto Rico (PR) and other U.S. territories (TR: AS, GU, MP, VI) from 1998-2025.",
    },
  };

  const compiledAt = "2026-08-28T00:00:00.000Z";

  const manifest: NamesSourceManifest = {
    schema_version: SCHEMA_VERSION,
    compiler_version: COMPILER_VERSION,
    compiled_at: compiledAt,
    sources: defaultSources,
    summary: {
      total_unique_given_names: givenRecords.length,
      total_unique_surnames: sortedSurnames.length,
      ssa_year_range: [earliestYear, latestYear],
      ssa_states: sortedStates,
      ssa_territories: sortedTerritories,
    },
    given_name_shards: givenShardMeta,
    surname_shards: surnameShardMeta,
  };

  const index: NamesSummaryIndex = {
    schema_version: SCHEMA_VERSION,
    compiler_version: COMPILER_VERSION,
    compiled_at: compiledAt,
    total_unique_given_names: givenRecords.length,
    total_unique_surnames: sortedSurnames.length,
    ssa_year_range: [earliestYear, latestYear],
    ssa_states: sortedStates,
    ssa_territories: sortedTerritories,
    given_name_shards: Object.values(givenShardMeta).map((s) => s.file),
    surname_shards: Object.values(surnameShardMeta).map((s) => s.file),
  };

  return {
    manifest,
    index,
    givenNameShards: givenShards,
    surnameShards,
    summary: {
      totalGivenNames: givenRecords.length,
      totalSurnames: sortedSurnames.length,
      earliestSSAYear: earliestYear,
      latestSSAYear: latestYear,
      states: sortedStates,
      territories: sortedTerritories,
    },
  };
}

export function writeCompiledDatasetToDisk(
  outputDir: string,
  result: CompileResult,
): void {
  const givenDir = path.join(outputDir, "given-names");
  const surnameDir = path.join(outputDir, "surnames");

  fs.mkdirSync(givenDir, { recursive: true });
  fs.mkdirSync(surnameDir, { recursive: true });

  for (const shard of result.givenNameShards.values()) {
    fs.writeFileSync(path.join(givenDir, shard.filename), shard.json, "utf8");
  }

  for (const shard of result.surnameShards.values()) {
    fs.writeFileSync(path.join(surnameDir, shard.filename), shard.json, "utf8");
  }

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(result.manifest, null, 2) + "\n",
    "utf8",
  );

  fs.writeFileSync(
    path.join(outputDir, "index.json"),
    JSON.stringify(result.index, null, 2) + "\n",
    "utf8",
  );
}
