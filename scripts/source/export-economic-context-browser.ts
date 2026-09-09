/**
 * Deterministically shard the committed BEA, LAUS, and HUD corpora for lazy
 * browser lookup. The browser never guesses a geography from a display name
 * and never needs to download the nationwide corpus for one exact binding.
 */
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ArtifactLock,
  NormalizedCorpus,
  Sourced,
} from "../../src/source/core/index";
import { toCanonicalJson, writeText } from "../../src/source/core/index";
import type { BeaObservationRecord } from "../../src/source/domains/bea-regional/index";
import type { LausObservationRecord } from "../../src/source/domains/bls-laus/index";
import type { HudRecord } from "../../src/source/domains/hud-housing/index";
import type {
  BrowserBeaRecord,
  BrowserEconomicManifest,
  BrowserEconomicShard,
  BrowserEconomicValue,
  BrowserHudRecord,
  BrowserLausRecord,
} from "../../src/presentation/economic-context-browser-types";
import { REPO_ROOT } from "./registry";

const DEFAULT_OUTPUT = resolve(REPO_ROOT, "public/data/economic-context/v1");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, path), "utf8")) as T;
}

function corpus<T>(domain: string): readonly T[] {
  return readJson<T[]>(`data/source/${domain}/corpus.json`);
}

function corpusManifest(domain: string): NormalizedCorpus {
  return readJson<NormalizedCorpus>(
    `data/source/${domain}/corpus-manifest.json`,
  );
}

function lock(domain: string): ArtifactLock {
  return readJson<ArtifactLock>(`data/source/${domain}/artifact-lock.json`);
}

function compactValue(value: Sourced<number>): BrowserEconomicValue {
  if (value.state === "KNOWN") {
    return {
      state: "KNOWN",
      value: value.value,
      release: value.release,
      asOf: value.asOf,
    };
  }
  if (value.state === "UNKNOWN") {
    return { state: "UNKNOWN", reason: value.reason };
  }
  throw new Error(
    `Economic browser export does not silently flatten ${value.state}.`,
  );
}

function compactBea(record: BeaObservationRecord): BrowserBeaRecord {
  return {
    ...record,
    value: compactValue(record.value),
  };
}

function compactLaus(record: LausObservationRecord): BrowserLausRecord {
  return {
    ...record,
    value: compactValue(record.value),
  };
}

function compactHud(record: HudRecord): BrowserHudRecord {
  return { ...record };
}

function addToShard<T>(
  shards: Map<string, T[]>,
  shardKey: string,
  record: T,
): void {
  const rows = shards.get(shardKey) ?? [];
  rows.push(record);
  shards.set(shardKey, rows);
}

function writeShards<T extends { readonly recordId: string }>(
  product: "bea" | "laus" | "hud",
  shards: ReadonlyMap<string, readonly T[]>,
  output: string,
): void {
  for (const [shardKey, rows] of [...shards].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const shard: BrowserEconomicShard<T> = {
      schemaVersion: "1",
      product,
      shardKey,
      records: [...rows].sort((left, right) =>
        left.recordId.localeCompare(right.recordId),
      ),
    };
    writeText(
      resolve(output, product, `${shardKey}.json`),
      compactCanonicalJson(shard),
    );
  }
}

export function exportEconomicContextBrowser(output = DEFAULT_OUTPUT): {
  readonly recordCount: number;
  readonly shardCount: number;
} {
  const beaRecords = corpus<BeaObservationRecord>("bea-regional");
  const lausRecords = corpus<LausObservationRecord>("bls-laus");
  const hudRecords = corpus<HudRecord>("hud-housing");
  const beaShards = new Map<string, BrowserBeaRecord[]>();
  const lausShards = new Map<string, BrowserLausRecord[]>();
  const hudShards = new Map<string, BrowserHudRecord[]>();
  const beaIndex: Record<string, string> = {};
  const lausIndex: Record<string, string> = {};
  const hudIndex: Record<string, string> = {};

  for (const record of beaRecords) {
    const shardKey = `${record.geographyLevel}-${record.geoFips.slice(0, 2)}`;
    addToShard(beaShards, shardKey, compactBea(record));
    beaIndex[`${record.geographyLevel}:${record.geoFips}`] =
      `bea/${shardKey}.json`;
  }
  for (const record of lausRecords) {
    const shardKey = record.area.areaCode.slice(0, 4).toLowerCase();
    addToShard(lausShards, shardKey, compactLaus(record));
    lausIndex[record.area.areaCode] = `laus/${shardKey}.json`;
  }
  for (const record of hudRecords) {
    const shardKey = record.area.stateFips;
    addToShard(hudShards, shardKey, compactHud(record));
    hudIndex[record.area.hudFipsCode] = `hud/${shardKey}.json`;
  }

  const lausLock = lock("bls-laus");
  const absentParent = lausLock.artifacts.find(
    (artifact) =>
      artifact.artifactId === "bls-laus-data-1-current-seasonally-adjusted",
  );
  if (!absentParent || absentParent.storage !== "cached-not-committed") {
    throw new Error(
      "Expected the checksum-pinned LAUS parent to remain absent.",
    );
  }

  const manifest: BrowserEconomicManifest = {
    schemaVersion: "1",
    corpora: {
      bea: corpusManifest("bea-regional"),
      laus: corpusManifest("bls-laus"),
      hud: corpusManifest("hud-housing"),
    },
    locks: {
      bea: lock("bea-regional"),
      laus: lausLock,
      hud: lock("hud-housing"),
    },
    indexes: {
      bea: beaIndex,
      laus: lausIndex,
      hud: hudIndex,
    },
    coverage: {
      bea: {
        recordCount: beaRecords.length,
        geographyCount: new Set(
          beaRecords.map(
            (record) => `${record.geographyLevel}:${record.geoFips}`,
          ),
        ).size,
        periods: [...new Set(beaRecords.map((record) => record.year))].sort(),
      },
      laus: {
        recordCount: lausRecords.length,
        geographyCount: new Set(
          lausRecords.map((record) => record.area.areaCode),
        ).size,
        firstCommittedYear: 2024,
        unavailableEarlierRangeReason:
          "The checksum-pinned full parent is cached-not-committed and absent from a fresh checkout; only the committed 2024+ slice can replay.",
        pinnedAbsentParentSha256: absentParent.bytes.sha256,
      },
      hud: {
        recordCount: hudRecords.length,
        geographyCount: new Set(
          hudRecords.map((record) => record.area.hudFipsCode),
        ).size,
        productVintages: [
          ...new Set(hudRecords.map((record) => record.productVintage)),
        ].sort(),
      },
    },
  };

  rmSync(output, { recursive: true, force: true });
  writeShards("bea", beaShards, output);
  writeShards("laus", lausShards, output);
  writeShards("hud", hudShards, output);
  writeText(resolve(output, "manifest.json"), toCanonicalJson(manifest));
  return {
    recordCount: beaRecords.length + lausRecords.length + hudRecords.length,
    shardCount: beaShards.size + lausShards.size + hudShards.size,
  };
}

function compactCanonicalJson(value: unknown): string {
  return `${JSON.stringify(JSON.parse(toCanonicalJson(value)))}\n`;
}

if (process.argv[1]?.endsWith("export-economic-context-browser.ts")) {
  const result = exportEconomicContextBrowser();
  console.log(
    `export:economic-context-browser: ${result.recordCount} records across ${result.shardCount} lazy shards`,
  );
}
