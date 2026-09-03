/**
 * `npm run source:validate` — schema, algebra, oracles, coverage, missingness.
 *
 * It reads the tracked corpora rather than recompiling, so it validates what is
 * actually committed. Every domain is covered because the domain list is the
 * directory listing.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  FORBIDDEN_WALL_CLOCK_KEYS,
  assertValidNormalizedCorpus,
  corpusCanonicalDigest,
  isClean,
} from "../../src/source/core/index";
import type {
  CompiledCorpus,
  NormalizedCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../src/source/core/index";
import { REPO_ROOT, domainDataDir, loadDomains } from "./registry";
import { readLock } from "./compile";
import { verifyLock } from "./verify-artifacts";

/** Every tracked file under data/source/, so the wall-clock sweep sees them all. */
function trackedSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      trackedSourceFiles(path, found);
    } else if (entry.name.endsWith(".json")) {
      found.push(path);
    }
  }
  return found;
}

/**
 * No tracked generated artifact may carry a wall clock.
 *
 * `retrievedAt` inside an artifact lock is the one legitimate instant in this
 * tree: it is acquisition evidence, recorded by the retrieval that produced it.
 * Every other timestamp key is a build-time observation masquerading as a fact.
 */
export function findWallClockKeys(): readonly string[] {
  const offences: string[] = [];
  const root = resolve(REPO_ROOT, "data/source");
  for (const file of trackedSourceFiles(root)) {
    const text = readFileSync(file, "utf-8");
    for (const key of FORBIDDEN_WALL_CLOCK_KEYS) {
      if (text.includes(`"${key}"`)) {
        offences.push(`${file.slice(REPO_ROOT.length + 1)} carries "${key}"`);
      }
    }
  }
  return offences;
}

async function main(): Promise<void> {
  const reports: ValidationReport[] = [];
  let failed = false;

  for (const domain of await loadDomains()) {
    const dir = domainDataDir(domain.domain);
    const corpusPath = resolve(dir, "corpus.json");
    const manifestPath = resolve(dir, "corpus-manifest.json");
    const findings: ValidationFinding[] = [];

    const records = JSON.parse(readFileSync(corpusPath, "utf-8")) as unknown[];
    const corpus = JSON.parse(readFileSync(manifestPath, "utf-8")) as NormalizedCorpus;
    assertValidNormalizedCorpus(corpus);

    if (corpus.recordCount !== records.length) {
      findings.push({
        severity: "error",
        code: "corpus/record-count",
        message: `${domain.domain}: manifest declares ${corpus.recordCount} records; corpus.json holds ${records.length}.`,
      });
    }
    const digest = corpusCanonicalDigest(records);
    if (digest !== corpus.canonicalSha256) {
      findings.push({
        severity: "error",
        code: "corpus/canonical-digest",
        message: `${domain.domain}: corpus.json hashes to ${digest}; the manifest declares ${corpus.canonicalSha256}.`,
      });
    }
    if (corpus.inputClass !== "production") {
      findings.push({
        severity: "error",
        code: "corpus/input-class",
        message: `${domain.domain}: a ${corpus.inputClass} corpus is committed under data/source/.`,
      });
    }

    const lock = readLock(domain);
    const lockedIds = new Set(lock.artifacts.map((artifact) => artifact.artifactId));
    for (const input of corpus.inputs) {
      if (!lockedIds.has(input.artifactId)) {
        findings.push({
          severity: "error",
          code: "corpus/unlocked-input",
          message: `${domain.domain}: corpus cites artifact "${input.artifactId}", which is not in the lock.`,
        });
      }
      const locked = lock.artifacts.find((a) => a.artifactId === input.artifactId);
      if (locked?.quarantined) {
        findings.push({
          severity: "error",
          code: "corpus/quarantined-input",
          message: `${domain.domain}: corpus cites quarantined artifact "${input.artifactId}".`,
        });
      }
    }
    for (const artifact of lock.artifacts) {
      if (artifact.bytes.sha256 === corpus.canonicalSha256) {
        findings.push({
          severity: "error",
          code: "artifact/normalized-hash-as-evidence",
          message: `${domain.domain}: artifact "${artifact.artifactId}" carries the corpus's own canonical digest as its byte hash. A normalized hash is not artifact evidence.`,
        });
      }
    }
    for (const result of verifyLock(lock)) {
      if (result.outcome === "mismatch") {
        findings.push({
          severity: "error",
          code: "artifact/digest-mismatch",
          message: `${domain.domain}/${result.artifactId}: ${result.detail}`,
        });
      }
    }

    const domainReport = domain.validateCorpus({
      corpus,
      records,
    } as CompiledCorpus<unknown>);
    const report: ValidationReport = {
      domain: domain.domain,
      checked: records.length,
      findings: [...findings, ...domainReport.findings],
    };
    reports.push(report);
  }

  const wallClock = findWallClockKeys();

  for (const report of reports) {
    const errors = report.findings.filter((f) => f.severity === "error");
    console.log(
      `  ${isClean(report) ? "ok  " : "FAIL"} ${report.domain}: ${report.checked} records, ${errors.length} errors`,
    );
    for (const finding of report.findings) {
      console.log(`        [${finding.severity}] ${finding.code}: ${finding.message}`);
      if (finding.severity === "error") failed = true;
    }
  }
  for (const offence of wallClock) {
    console.log(`        [error] source/wall-clock: ${offence}`);
    failed = true;
  }

  const bytes = trackedSourceFiles(resolve(REPO_ROOT, "data/source")).reduce(
    (total, file) => total + statSync(file).size,
    0,
  );
  console.log(
    `source:validate: ${reports.length} domains, ${(bytes / 1_048_576).toFixed(2)} MiB of tracked JSON`,
  );
  if (failed) process.exitCode = 1;
}

await main();
