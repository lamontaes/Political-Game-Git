/**
 * What a source domain is, from the command matrix's point of view.
 *
 * Domains are discovered by listing `src/source/domains/`, so a domain is
 * included in acquire/compile/manifest/validate/replay by existing. A directory
 * that does not export this shape fails the wiring test rather than being
 * quietly skipped — 13B B5 found `source:compile` omitting a domain and nobody
 * noticing.
 */

import type { CompiledCorpus, ValidationReport } from "./corpus";
import type { ArtifactLock, ArtifactRights, ArtifactPublisherFacts, ArtifactStorage, QaSliceDerivation, RetrievalMethod } from "./artifact";

/** One artifact this domain needs, and how to go and get it. */
export interface AcquisitionRequest {
  readonly artifactId: string;
  readonly provider: string;
  readonly url: string;
  readonly method: RetrievalMethod;
  readonly requestIdentity?: {
    readonly apiVersion?: string;
    readonly parameters?: Readonly<Record<string, string>>;
  };
  readonly mediaType: string;
  readonly publisher: ArtifactPublisherFacts;
  readonly rights: ArtifactRights;
  readonly storage: ArtifactStorage;
  /** Repository-relative path for committed bytes; null when cached only. */
  readonly localPath: string | null;
  /** Cache path for artifacts too large to commit. */
  readonly cachePath?: string;
  /** When the useful bytes are a member of a zip, which member. */
  readonly containerMemberPath?: string;
  /** A QA slice cut from an already-acquired parent, rather than a retrieval. */
  readonly sliceOf?: {
    readonly parentArtifactId: string;
    readonly selectionPredicate: string;
    /** Cut the slice out of the parent's bytes, deterministically. */
    readonly cut: (parentBytes: Buffer) => Buffer;
  };
}

export interface AcquisitionPlan {
  readonly domain: string;
  readonly requests: readonly AcquisitionRequest[];
}

/**
 * A source domain.
 *
 * `compileProduction` opens the domain's locked artifacts through the
 * capability boundary and returns a production corpus. There is no variant that
 * accepts arbitrary JSON, which is the point.
 */
export interface SourceDomainModule<TRecord = unknown> {
  readonly domain: string;
  readonly compilerVersion: string;
  readonly acquisitionPlan: AcquisitionPlan;
  readonly lockPath: string;
  compileProduction(lock: ArtifactLock): CompiledCorpus<TRecord, "production">;
  validateCorpus(corpus: CompiledCorpus<TRecord>): ValidationReport;
}
