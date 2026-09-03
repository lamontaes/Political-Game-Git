/**
 * `npm run source:acquire` — the only command that touches the network.
 *
 * It retrieves each artifact a domain declares, hashes the bytes it actually
 * received, and writes the artifact lock from that retrieval. `retrievedAt` is
 * the instant of this request; it is never hand-authored and never equal to a
 * compile time. Nothing downstream may reach the network, so an acquisition
 * accidentally invoked from a compiler fails loudly on a CI runner instead of
 * quietly succeeding.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  listZipMembers,
  readZipMemberEntry,
  sha256Hex,
  toCanonicalJson,
  assertValidArtifactLock,
} from "../../src/source/core/index";
import type {
  AcquisitionRequest,
  ArtifactLock,
  RawArtifact,
} from "../../src/source/core/index";
import {
  REPO_ROOT,
  domainDataDir,
  domainFlag,
  loadDomain,
  loadDomains,
} from "./registry";

const USER_AGENT =
  "PoliticalGameSourceSubstrate/1.0 (+https://github.com/lamontaes/Political-Game-Git; source acquisition)";

/** Fetch bytes, reporting the status and instant of the retrieval that happened. */
async function retrieve(url: string): Promise<{
  bytes: Buffer;
  httpStatus: number;
  retrievedAt: string;
}> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "*/*" },
    redirect: "follow",
  });
  const retrievedAt = new Date().toISOString();
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, httpStatus: response.status, retrievedAt };
}

function writeBytes(absolutePath: string, bytes: Buffer): void {
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, bytes);
}

async function acquireOne(
  request: AcquisitionRequest,
  alreadyAcquired: ReadonlyMap<string, { artifact: RawArtifact; bytes: Buffer }>,
): Promise<{ artifact: RawArtifact; bytes: Buffer }> {
  if (request.sliceOf) {
    const parent = alreadyAcquired.get(request.sliceOf.parentArtifactId);
    if (!parent) {
      throw new Error(
        `QA slice "${request.artifactId}" needs parent "${request.sliceOf.parentArtifactId}" acquired first.`,
      );
    }
    const bytes = request.sliceOf.cut(
      parent.bytes,
      new Map([...alreadyAcquired].map(([id, entry]) => [id, entry.bytes])),
    );
    if (request.localPath === null) {
      throw new Error(`QA slice "${request.artifactId}" must be committed somewhere.`);
    }
    writeBytes(resolve(REPO_ROOT, request.localPath), bytes);
    const artifact: RawArtifact = {
      artifactId: request.artifactId,
      provider: request.provider,
      retrieval: {
        url: parent.artifact.retrieval.url,
        method: parent.artifact.retrieval.method,
        ...(parent.artifact.retrieval.requestIdentity
          ? { requestIdentity: parent.artifact.retrieval.requestIdentity }
          : {}),
        retrievedAt: parent.artifact.retrieval.retrievedAt,
        httpStatus: parent.artifact.retrieval.httpStatus,
        responseBytes: bytes.length,
      },
      bytes: { length: bytes.length, sha256: sha256Hex(bytes) },
      mediaType: request.mediaType,
      publisher: request.publisher,
      rights: request.rights,
      storage: "derived-qa-slice",
      localPath: request.localPath,
      derivation: {
        parentArtifactId: request.sliceOf.parentArtifactId,
        parentSha256: parent.artifact.bytes.sha256,
        selectionPredicate: request.sliceOf.selectionPredicate,
      },
    };
    return { artifact, bytes };
  }

  const { bytes, httpStatus, retrievedAt } = await retrieve(request.url);
  if (httpStatus !== 200) {
    throw new Error(
      `Retrieving ${request.artifactId} from ${request.url} returned HTTP ${httpStatus}.`,
    );
  }

  const destination = request.localPath ?? request.cachePath;
  if (!destination) {
    throw new Error(`Artifact "${request.artifactId}" declares nowhere to put its bytes.`);
  }
  writeBytes(resolve(REPO_ROOT, destination), bytes);

  let container: RawArtifact["container"];
  if (request.containerMemberPath) {
    const members = listZipMembers(bytes);
    const member = members.find((entry) => entry.path === request.containerMemberPath);
    if (!member) {
      throw new Error(
        `Artifact "${request.artifactId}" has no member "${request.containerMemberPath}"; it holds ${members.map((entry) => entry.path).join(", ")}.`,
      );
    }
    const memberBytes = readZipMemberEntry(bytes, member);
    container = {
      memberPath: member.path,
      memberLength: memberBytes.length,
      memberSha256: sha256Hex(memberBytes),
    };
  }

  const artifact: RawArtifact = {
    artifactId: request.artifactId,
    provider: request.provider,
    retrieval: {
      url: request.url,
      method: request.method,
      ...(request.requestIdentity ? { requestIdentity: request.requestIdentity } : {}),
      retrievedAt,
      httpStatus,
      responseBytes: bytes.length,
    },
    bytes: { length: bytes.length, sha256: sha256Hex(bytes) },
    mediaType: request.mediaType,
    ...(container ? { container } : {}),
    publisher: request.publisher,
    rights: request.rights,
    storage: request.storage,
    localPath: request.localPath,
  };
  return { artifact, bytes };
}

async function acquireDomain(domainName: string): Promise<void> {
  const domain = await loadDomain(domainName);
  const acquired = new Map<string, { artifact: RawArtifact; bytes: Buffer }>();
  const artifacts: RawArtifact[] = [];

  for (const request of domain.acquisitionPlan.requests) {
    process.stdout.write(`  ${request.artifactId} ... `);
    const result = await acquireOne(request, acquired);
    acquired.set(request.artifactId, result);
    artifacts.push(result.artifact);
    process.stdout.write(
      `${result.artifact.bytes.length} bytes, sha256 ${result.artifact.bytes.sha256.slice(0, 12)}…\n`,
    );
  }

  const lock: ArtifactLock = { domain: domainName, artifacts };
  assertValidArtifactLock(lock);
  const lockPath = resolve(domainDataDir(domainName), "artifact-lock.json");
  mkdirSync(dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, toCanonicalJson(lock), "utf-8");
  console.log(`  wrote ${artifacts.length} artifacts to ${lockPath}`);
}

async function main(): Promise<void> {
  const only = domainFlag(process.argv.slice(2));
  const domains = only ? [only] : (await loadDomains()).map((domain) => domain.domain);
  for (const domain of domains) {
    console.log(`source:acquire ${domain}`);
    await acquireDomain(domain);
  }
}

/** Re-hash a locally present artifact; used by verify-artifacts. */
export function localDigest(relativePath: string): string {
  return sha256Hex(readFileSync(resolve(REPO_ROOT, relativePath)));
}

await main();
