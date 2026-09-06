/**
 * Evidence of a retrieval.
 *
 * A `RawArtifact` says: these exact bytes came from this exact URL at this
 * exact instant, and here is their digest. It is deliberately a different
 * record from `NormalizedCorpus` (evidence of a *computation*), because 13B's
 * B2/M5/M6 findings were all one blended object letting a normalized-object
 * hash, or a hash of a URL string, stand in as artifact evidence.
 */

import { SourceProvenanceError } from "./errors";
import { isSha256Hex } from "./hashing";

/** How the bytes were obtained. */
export type RetrievalMethod = "GET" | "POST" | "bulk-download" | "api-query";

/**
 * Where the bytes live now.
 *
 * `derived-qa-slice` is a strict subset of a parent artifact, committed so CI
 * can compile without the full artifact — never a universe in its own right.
 */
export type ArtifactStorage =
  "committed" | "cached-not-committed" | "derived-qa-slice";

export interface ArtifactRetrieval {
  readonly url: string;
  readonly method: RetrievalMethod;
  readonly requestIdentity?: {
    readonly apiVersion?: string;
    readonly parameters?: Readonly<Record<string, string>>;
    readonly body?: string;
  };
  /** The instant of the actual retrieval. Never hand-authored, never compile time. */
  readonly retrievedAt: string;
  readonly httpStatus: number;
  readonly responseBytes: number;
}

/** A zip/tar member carries its own digest alongside its container's. */
export interface ArtifactContainerMember {
  readonly memberPath: string;
  readonly memberLength: number;
  readonly memberSha256: string;
}

/** What the publisher says about the product, in the publisher's own terms. */
export interface ArtifactPublisherFacts {
  readonly statedVintage: string | null;
  readonly releaseDate: string | null;
  readonly schemaVersion: string | null;
  readonly documentationUrl: string | null;
}

/**
 * Rights.
 *
 * `UNKNOWN` is a legitimate answer and must never be inferred from the fact
 * that something was publicly reachable — the same rule AGENTS.md already
 * applies to art assets, applied to data.
 *
 * `public-domain-government-edict` is a fourth answer and not a softening of
 * that rule. The substrate's first thirteen domains all read federal statistical
 * products, for which `public-domain-us-government` is exactly right. A state
 * constitution is not a work of the United States government, so that status
 * would be false for it; `UNKNOWN` would be false in the other direction,
 * because the edicts doctrine is a positive determination about the text of an
 * enacted law rather than an absence of information. The status therefore
 * carries a mandatory `edictBasis` naming the enacting body and the doctrine,
 * so that a reader sees the determination rather than an assumption. It covers
 * the enacted text only, never a publisher's annotations, headnotes or site
 * furniture, and it may never be reached by inferring that something was
 * publicly reachable.
 */
export interface ArtifactRights {
  readonly status:
    | "public-domain-us-government"
    | "public-domain-government-edict"
    | "declared-license"
    | "UNKNOWN";
  readonly declaredLicense: string | null;
  readonly attributionRequired: boolean | "UNKNOWN";
  /** Required for `public-domain-government-edict`: whose edict, under what doctrine. */
  readonly edictBasis?: string;
}

/** How a QA slice was cut out of its parent, precisely enough to re-cut it. */
export interface QaSliceDerivation {
  readonly parentArtifactId: string;
  readonly parentSha256: string;
  /** A predicate a reader can apply to the parent and get these bytes back. */
  readonly selectionPredicate: string;
}

export interface RawArtifact {
  readonly artifactId: string;
  readonly provider: string;
  readonly retrieval: ArtifactRetrieval;
  /** Digest of the retrieved bytes. Never of a URL, a parse result or a record set. */
  readonly bytes: { readonly length: number; readonly sha256: string };
  readonly mediaType: string;
  readonly container?: ArtifactContainerMember;
  readonly publisher: ArtifactPublisherFacts;
  readonly rights: ArtifactRights;
  readonly storage: ArtifactStorage;
  /** Where the bytes sit, relative to the repository root, when they are present. */
  readonly localPath: string | null;
  readonly derivation?: QaSliceDerivation;
  /** A quarantined artifact can never be opened for production. */
  readonly quarantined?: boolean;
  readonly quarantineReason?: string;
}

/** The pinned closed world for one domain. */
export interface ArtifactLock {
  readonly domain: string;
  readonly artifacts: readonly RawArtifact[];
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** Structural validation of one artifact record. Throws with the id named. */
export function assertValidRawArtifact(artifact: RawArtifact): void {
  const fail = (message: string): never => {
    throw new SourceProvenanceError(
      `Artifact "${artifact.artifactId}": ${message}`,
    );
  };

  if (!artifact.artifactId.trim()) fail("has no artifactId.");
  if (!artifact.provider.trim()) fail("has no provider.");
  if (!isSha256Hex(artifact.bytes.sha256)) {
    fail(
      `bytes.sha256 "${artifact.bytes.sha256}" is not a SHA-256 hex digest.`,
    );
  }
  if (artifact.bytes.length <= 0) fail("declares no retrieved bytes.");
  if (!ISO_INSTANT.test(artifact.retrieval.retrievedAt)) {
    fail(
      `retrievedAt "${artifact.retrieval.retrievedAt}" is not an ISO instant produced by a retrieval.`,
    );
  }
  if (!/^https?:\/\//.test(artifact.retrieval.url)) {
    fail(`retrieval.url "${artifact.retrieval.url}" is not an http(s) URL.`);
  }
  if (artifact.retrieval.httpStatus !== 200) {
    fail(`retrieval.httpStatus is ${artifact.retrieval.httpStatus}, not 200.`);
  }
  if (artifact.retrieval.responseBytes !== artifact.bytes.length) {
    fail(
      `responseBytes (${artifact.retrieval.responseBytes}) disagrees with bytes.length (${artifact.bytes.length}).`,
    );
  }
  if (artifact.container && !isSha256Hex(artifact.container.memberSha256)) {
    fail("container.memberSha256 is not a SHA-256 hex digest.");
  }
  if (
    artifact.container &&
    artifact.container.memberSha256 === artifact.bytes.sha256
  ) {
    fail(
      "container member digest equals the container digest; a zip and its member are different bytes.",
    );
  }
  if (artifact.storage === "derived-qa-slice") {
    if (!artifact.derivation) {
      fail("is a derived QA slice but declares no derivation.");
    } else {
      if (!isSha256Hex(artifact.derivation.parentSha256)) {
        fail("derivation.parentSha256 is not a SHA-256 hex digest.");
      }
      if (!artifact.derivation.selectionPredicate.trim()) {
        fail(
          "derivation names no selection predicate, so the slice cannot be re-cut.",
        );
      }
    }
  } else if (artifact.derivation) {
    fail('declares a derivation but is not storage "derived-qa-slice".');
  }
  if (
    artifact.storage === "cached-not-committed" &&
    artifact.localPath !== null
  ) {
    fail("is cached-not-committed but declares a committed localPath.");
  }
  if (artifact.quarantined && !artifact.quarantineReason?.trim()) {
    fail("is quarantined without a reason.");
  }
  if (artifact.rights.status === "public-domain-government-edict") {
    if (!artifact.rights.edictBasis?.trim()) {
      fail(
        "claims the government-edicts doctrine but names no enacting body or doctrine. An edict determination that will not say whose edict it is has not been made.",
      );
    }
  } else if (artifact.rights.edictBasis !== undefined) {
    fail(
      `names an edictBasis while claiming rights status "${artifact.rights.status}"; the basis belongs only to public-domain-government-edict.`,
    );
  }
}

/** Validate a whole lock, including id uniqueness and parent resolution. */
export function assertValidArtifactLock(lock: ArtifactLock): void {
  const seen = new Set<string>();
  for (const artifact of lock.artifacts) {
    assertValidRawArtifact(artifact);
    if (seen.has(artifact.artifactId)) {
      throw new SourceProvenanceError(
        `Domain "${lock.domain}" locks artifact id "${artifact.artifactId}" twice.`,
      );
    }
    seen.add(artifact.artifactId);
  }
  for (const artifact of lock.artifacts) {
    const parentId = artifact.derivation?.parentArtifactId;
    if (parentId && !seen.has(parentId)) {
      throw new SourceProvenanceError(
        `Artifact "${artifact.artifactId}" derives from "${parentId}", which is not in the ${lock.domain} lock.`,
      );
    }
  }
}

/** Find one artifact in a lock, or throw naming what was asked for. */
export function requireArtifact(
  lock: ArtifactLock,
  artifactId: string,
): RawArtifact {
  const found = lock.artifacts.find((entry) => entry.artifactId === artifactId);
  if (!found) {
    throw new SourceProvenanceError(
      `Artifact "${artifactId}" is not in the ${lock.domain} lock; a compiler may read no artifact outside it.`,
    );
  }
  return found;
}
