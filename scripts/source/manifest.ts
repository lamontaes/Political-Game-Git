/**
 * `npm run source:manifest` — the manifest of manifests.
 *
 * It records each domain's corpus digest and its coverage claim, so a reader
 * can see at a glance which corpora are complete universes and which are
 * bounded slices. It carries no wall clock: a build-time observation is not a
 * fact about the world (13B B5).
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  sha256HexOfUtf8,
  toCanonicalJson,
  writeText,
} from "../../src/source/core/index";
import type {
  ArtifactLock,
  NormalizedCorpus,
} from "../../src/source/core/index";
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

/** A domain that is wired in but compiles nothing yet, and why. */
export interface GatedDomainEntry {
  readonly domain: string;
  readonly productionGate: string;
}

export interface SourceManifest {
  readonly manifestVersion: string;
  readonly domains: readonly SourceManifestEntry[];
  readonly gatedDomains: readonly GatedDomainEntry[];
  readonly researchFiles?: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly asOf: string;
    readonly recordCount: number;
  }[];
}

/** Deterministic non-domain inputs that are included in MANIFEST.json. */
export const RESEARCH_FILE_INPUTS = [
  {
    path: "data/research/places/local-institutions.json",
    rootRelativePath: "../research/places/local-institutions.json",
  },
] as const;

/** Copy every declared research input into a replay tree at manifest-relative paths. */
export function stageResearchFileInputs(
  sourceRoot: string,
  compiledRoot: string,
): void {
  for (const input of RESEARCH_FILE_INPUTS) {
    const source = resolve(sourceRoot, input.path);
    if (!existsSync(source)) {
      throw new Error(`Declared research input is missing: ${input.path}`);
    }
    const target = resolve(compiledRoot, input.rootRelativePath);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
}

/** Build the manifest by reading the compiled tree at `root`. */
export async function buildManifest(root: string): Promise<SourceManifest> {
  const domains = await loadDomains();
  const entries: SourceManifestEntry[] = [];
  const gated: GatedDomainEntry[] = [];

  for (const domain of domains) {
    if (domain.productionGate) {
      gated.push({
        domain: domain.domain,
        productionGate: domain.productionGate,
      });
      continue;
    }
    const dir = resolve(root, domain.domain);
    const corpusText = readFileSync(resolve(dir, "corpus.json"), "utf-8");
    const manifestText = readFileSync(
      resolve(dir, "corpus-manifest.json"),
      "utf-8",
    );
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

  const researchFiles = RESEARCH_FILE_INPUTS.map((input) => {
    const researchPath = resolve(root, input.rootRelativePath);
    if (!existsSync(researchPath)) {
      throw new Error(
        `Declared research input is missing: ${input.path} (expected at ${researchPath})`,
      );
    }
    const researchText = readFileSync(researchPath, "utf-8");
    const researchCorpus = JSON.parse(researchText) as {
      asOf: string;
      places: Record<string, unknown>;
    };
    return {
      path: input.path,
      sha256: sha256HexOfUtf8(researchText),
      asOf: researchCorpus.asOf,
      recordCount: Object.keys(researchCorpus.places).length,
    };
  });
  return {
    manifestVersion: "1",
    domains: entries,
    gatedDomains: gated,
    ...(researchFiles.length ? { researchFiles } : {}),
  };
}

async function main(): Promise<void> {
  const root = resolve(REPO_ROOT, "data/source");
  const manifest = await buildManifest(root);
  writeText(resolve(root, "MANIFEST.json"), toCanonicalJson(manifest));
  console.log(
    `source:manifest: ${manifest.domains.length} compiled domains, ${manifest.gatedDomains.length} gated`,
  );
}

if (process.argv[1]?.endsWith("manifest.ts")) {
  await main();
}
export { domainDataDir };
