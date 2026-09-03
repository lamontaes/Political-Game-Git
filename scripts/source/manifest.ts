/**
 * `npm run source:manifest` — the manifest of manifests.
 *
 * It records each domain's corpus digest and its coverage claim, so a reader
 * can see at a glance which corpora are complete universes and which are
 * bounded slices. It carries no wall clock: a build-time observation is not a
 * fact about the world (13B B5).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  sha256HexOfUtf8,
  toCanonicalJson,
  writeText,
} from "../../src/source/core/index";
import type { ArtifactLock, NormalizedCorpus } from "../../src/source/core/index";
import { REPO_ROOT, domainDataDir, loadDomains } from "./registry";

export interface SourceManifestEntry {
  readonly domain: string;
  readonly corpusId: string;
  readonly asOf: string;
  readonly recordCount: number;
  readonly canonicalSha256: string;
  readonly corpusFileSha256: string;
  readonly compiler: { readonly name: string; readonly version: string };
  readonly isCompleteUniverse: boolean;
  readonly universeDescription: string;
  readonly boundedSampleReason: string | null;
  readonly artifacts: readonly {
    readonly artifactId: string;
    readonly sha256: string;
    readonly storage: string;
    readonly sliceOfParent: string | null;
  }[];
}

export interface SourceManifest {
  readonly manifestVersion: string;
  readonly domains: readonly SourceManifestEntry[];
}

/** Build the manifest by reading the compiled tree at `root`. */
export async function buildManifest(root: string): Promise<SourceManifest> {
  const domains = await loadDomains();
  const entries: SourceManifestEntry[] = [];

  for (const domain of domains) {
    const dir = resolve(root, domain.domain);
    const corpusText = readFileSync(resolve(dir, "corpus.json"), "utf-8");
    const manifestText = readFileSync(resolve(dir, "corpus-manifest.json"), "utf-8");
    const corpus = JSON.parse(manifestText) as NormalizedCorpus;
    const lock = JSON.parse(
      readFileSync(resolve(REPO_ROOT, domain.lockPath), "utf-8"),
    ) as ArtifactLock;

    entries.push({
      domain: domain.domain,
      corpusId: corpus.corpusId,
      asOf: corpus.asOf,
      recordCount: corpus.recordCount,
      canonicalSha256: corpus.canonicalSha256,
      corpusFileSha256: sha256HexOfUtf8(corpusText),
      compiler: corpus.compiler,
      isCompleteUniverse: corpus.coverage.isCompleteUniverse,
      universeDescription: corpus.coverage.universeDescription,
      boundedSampleReason: corpus.coverage.boundedSampleReason,
      artifacts: lock.artifacts.map((artifact) => ({
        artifactId: artifact.artifactId,
        sha256: artifact.bytes.sha256,
        storage: artifact.storage,
        sliceOfParent: artifact.derivation?.parentArtifactId ?? null,
      })),
    });
  }

  return { manifestVersion: "1", domains: entries };
}

async function main(): Promise<void> {
  const root = resolve(REPO_ROOT, "data/source");
  const manifest = await buildManifest(root);
  writeText(resolve(root, "MANIFEST.json"), toCanonicalJson(manifest));
  console.log(`source:manifest: ${manifest.domains.length} domains`);
}

if (process.argv[1]?.endsWith("manifest.ts")) {
  await main();
}
export { domainDataDir };
