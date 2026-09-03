/**
 * `npm run source:verify-artifacts` — re-hash every locally present artifact.
 *
 * This is the behavioural check that makes a hash mean something. A provenance
 * record whose digest was of a URL string, of a normalized object, or simply
 * hand-typed (13B B2, M5, M6) fails here the first time anybody runs it,
 * because the bytes on disk are hashed and compared rather than trusted.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertValidArtifactLock,
  listZipMembers,
  readZipMemberEntry,
  sha256Hex,
} from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";
import { REPO_ROOT, loadDomains } from "./registry";

export interface ArtifactVerification {
  readonly artifactId: string;
  readonly outcome: "verified" | "absent" | "mismatch";
  readonly detail: string;
}

/** Verify every artifact in one lock whose bytes are present locally. */
export function verifyLock(lock: ArtifactLock): readonly ArtifactVerification[] {
  assertValidArtifactLock(lock);
  const results: ArtifactVerification[] = [];

  for (const artifact of lock.artifacts) {
    if (artifact.localPath === null) {
      results.push({
        artifactId: artifact.artifactId,
        outcome: "absent",
        detail: `${artifact.storage}; identity pinned, bytes not committed`,
      });
      continue;
    }
    const absolute = resolve(REPO_ROOT, artifact.localPath);
    if (!existsSync(absolute)) {
      results.push({
        artifactId: artifact.artifactId,
        outcome: "absent",
        detail: `${artifact.localPath} is not present`,
      });
      continue;
    }
    const bytes = readFileSync(absolute);
    const digest = sha256Hex(bytes);
    if (digest !== artifact.bytes.sha256) {
      results.push({
        artifactId: artifact.artifactId,
        outcome: "mismatch",
        detail: `${artifact.localPath} hashes to ${digest}; the lock pins ${artifact.bytes.sha256}`,
      });
      continue;
    }
    if (bytes.length !== artifact.bytes.length) {
      results.push({
        artifactId: artifact.artifactId,
        outcome: "mismatch",
        detail: `${artifact.localPath} is ${bytes.length} bytes; the lock pins ${artifact.bytes.length}`,
      });
      continue;
    }

    if (artifact.container) {
      const members = listZipMembers(bytes);
      const member = members.find(
        (entry) => entry.path === artifact.container?.memberPath,
      );
      if (!member) {
        results.push({
          artifactId: artifact.artifactId,
          outcome: "mismatch",
          detail: `container member "${artifact.container.memberPath}" is not in the archive`,
        });
        continue;
      }
      const memberDigest = sha256Hex(readZipMemberEntry(bytes, member));
      if (memberDigest !== artifact.container.memberSha256) {
        results.push({
          artifactId: artifact.artifactId,
          outcome: "mismatch",
          detail: `member "${member.path}" hashes to ${memberDigest}; the lock pins ${artifact.container.memberSha256}`,
        });
        continue;
      }
    }

    results.push({
      artifactId: artifact.artifactId,
      outcome: "verified",
      detail: `${bytes.length} bytes`,
    });
  }

  return results;
}

/** Verify every domain's lock. Returns the number of mismatches. */
export async function verifyAllArtifacts(): Promise<{
  results: readonly (ArtifactVerification & { domain: string })[];
  mismatches: number;
}> {
  const all: (ArtifactVerification & { domain: string })[] = [];
  for (const domain of await loadDomains()) {
    const lock = JSON.parse(
      readFileSync(resolve(REPO_ROOT, domain.lockPath), "utf-8"),
    ) as ArtifactLock;
    for (const result of verifyLock(lock)) {
      all.push({ ...result, domain: domain.domain });
    }
  }
  return { results: all, mismatches: all.filter((r) => r.outcome === "mismatch").length };
}

async function main(): Promise<void> {
  const { results, mismatches } = await verifyAllArtifacts();
  for (const result of results) {
    console.log(
      `  [${result.outcome}] ${result.domain}/${result.artifactId}: ${result.detail}`,
    );
  }
  console.log(
    `source:verify-artifacts: ${results.filter((r) => r.outcome === "verified").length} verified, ${results.filter((r) => r.outcome === "absent").length} absent, ${mismatches} mismatched`,
  );
  if (mismatches > 0) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("verify-artifacts.ts")) {
  await main();
}
