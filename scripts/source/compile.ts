/**
 * `npm run source:compile` — every domain, always all of them.
 *
 * 13B B5 found a compile command that omitted a domain and a validate command
 * that covered two. Here the domain list comes from the directory listing, so
 * omission is not expressible.
 */

import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { assertValidArtifactLock, writeProductionCorpus } from "../../src/source/core/index";
import type { ArtifactLock, SourceDomainModule } from "../../src/source/core/index";
import { REPO_ROOT, domainDataDir, domainFlag, loadDomains } from "./registry";

/** Read and structurally validate one domain's pinned artifact lock. */
export function readLock(domain: SourceDomainModule): ArtifactLock {
  const path = resolve(REPO_ROOT, domain.lockPath);
  let text: string;
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    throw new Error(
      `Domain "${domain.domain}" has no artifact lock at ${domain.lockPath}. Run: npm run source:acquire -- --domain ${domain.domain}`,
    );
  }
  const lock = JSON.parse(text) as ArtifactLock;
  assertValidArtifactLock(lock);
  return lock;
}

/** Compile one domain into a target directory. */
export function compileDomainInto(domain: SourceDomainModule, outputDir: string): number {
  const lock = readLock(domain);
  const compiled = domain.compileProduction(lock);
  writeProductionCorpus(
    compiled,
    resolve(outputDir, "corpus.json"),
    resolve(outputDir, "corpus-manifest.json"),
  );
  return compiled.records.length;
}

async function main(): Promise<void> {
  const only = domainFlag(process.argv.slice(2));
  for (const domain of await loadDomains()) {
    if (only && domain.domain !== only) continue;
    if (domain.productionGate) {
      console.log(`source:compile ${domain.domain}: gated, no production corpus — ${domain.productionGate}`);
      continue;
    }
    const count = compileDomainInto(domain, domainDataDir(domain.domain));
    console.log(`source:compile ${domain.domain}: ${count} records`);
  }
}

if (process.argv[1]?.endsWith("compile.ts")) {
  await main();
}
