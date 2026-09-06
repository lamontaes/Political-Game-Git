/**
 * The production/fixture capability boundary.
 *
 * 13B M2: the guard protected CLI filenames, not compiler APIs, so calling an
 * exported compiler directly with an unmarked synthetic payload produced a
 * production corpus containing a bill that does not exist.
 *
 * Here a compiler's parameter type is a branded interface whose key is a
 * `unique symbol` that is not nameable outside this module. There is no
 * exported cast and no `fromJson`. A caller holding arbitrary JSON has no path
 * to a compiler at all — the refusal is a type error first and a runtime throw
 * second.
 */

import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";
import { SourceCapabilityError } from "./errors";
import { sha256Hex } from "./hashing";
import type { ArtifactLock, RawArtifact } from "./artifact";
import { requireArtifact } from "./artifact";
import {
  assertValidGovernmentEdictBasis,
  extractPinnedEnactedText,
} from "./enacted-text";

declare const PRODUCTION: unique symbol;
declare const FIXTURE: unique symbol;

/** Bytes proven to be the locked publisher artifacts they claim to be. */
export interface ProductionInput<T> {
  readonly [PRODUCTION]: true;
  readonly artifacts: T;
  readonly lock: ArtifactLock;
}

/** Bytes that are explicitly not production, and cannot become production. */
export interface FixtureInput<T> {
  readonly [FIXTURE]: true;
  readonly artifacts: T;
  readonly fixtureId: string;
}

/**
 * How much of an artifact a production compiler is allowed to read.
 *
 * `whole-artifact` is the ordinary case: a federal statistical product carries
 * no rights boundary inside it. `enacted-text-only` is what a government-edict
 * determination buys — the doctrine covers enacted law and not the publisher's
 * page, so the opener cuts the declared enacted-text spans and the compiler
 * receives those and nothing else.
 */
export type ProductionContentScope = "whole-artifact" | "enacted-text-only";

/**
 * One opened artifact: its locked identity, and the bytes production may read.
 *
 * For an edict artifact `bytes` is the extracted enacted text, not the page.
 * There is no field carrying the rest, because a field carrying the rest would
 * be the boundary not existing.
 */
export interface OpenedArtifact {
  readonly artifact: RawArtifact;
  readonly bytes: Buffer;
  readonly contentScope: ProductionContentScope;
}

/** The shape a domain receives: every artifact it asked for, by role name. */
export type OpenedArtifacts<TRole extends string> = Readonly<
  Record<TRole, OpenedArtifact>
>;

/**
 * Decide what a production compiler may read from verified publisher bytes.
 *
 * Refuses UNKNOWN outright. For a government edict it re-validates the
 * structured determination — a lock is JSON on disk, so a type is not a check —
 * and then narrows the bytes to the enacted-text spans that determination
 * covers. The status label on its own opens nothing.
 */
function readableForProduction(
  artifactId: string,
  artifact: RawArtifact,
  verifiedBytes: Buffer,
): { bytes: Buffer; contentScope: ProductionContentScope } {
  if (artifact.rights.status === "UNKNOWN") {
    throw new SourceCapabilityError(
      `Artifact "${artifactId}" has UNKNOWN rights status and may not be opened for production compilation.`,
    );
  }
  if (artifact.rights.status !== "public-domain-government-edict") {
    return { bytes: verifiedBytes, contentScope: "whole-artifact" };
  }
  const edict = artifact.rights.edict;
  try {
    assertValidGovernmentEdictBasis(artifactId, edict);
  } catch (cause) {
    throw new SourceCapabilityError(
      `Artifact "${artifactId}" may not be opened for production: ${(cause as Error).message}`,
    );
  }
  let bytes: Buffer;
  try {
    bytes = extractPinnedEnactedText(artifactId, verifiedBytes, edict.scope);
  } catch (cause) {
    throw new SourceCapabilityError(
      `Artifact "${artifactId}" may not be opened for production: ${(cause as Error).message}`,
    );
  }
  return { bytes, contentScope: "enacted-text-only" };
}

function repoRoot(): string {
  // core/ -> source/ -> src/ -> repository root
  return resolve(new URL("../../..", import.meta.url).pathname);
}

function insideRepo(relativeOrAbsolute: string): string {
  const absolute = isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : resolve(repoRoot(), relativeOrAbsolute);
  return absolute;
}

/**
 * Open locked publisher bytes for production compilation.
 *
 * Refuses unless, for every artifact: its id is in the lock, it is not
 * quarantined, and the bytes on disk hash to the digest the lock pins. It reads
 * bytes; it does not trust filenames.
 */
export function openProductionArtifacts<T extends string>(
  domain: string,
  lock: ArtifactLock,
  artifactPathsByRole: Readonly<Record<T, string>>,
): ProductionInput<OpenedArtifacts<T>> {
  if (lock.domain !== domain) {
    throw new SourceCapabilityError(
      `Domain "${domain}" was handed the lock for "${lock.domain}".`,
    );
  }

  const opened: Record<string, OpenedArtifact> = {};
  for (const [role, artifactId] of Object.entries(artifactPathsByRole) as [
    string,
    string,
  ][]) {
    const artifact = requireArtifact(lock, artifactId);

    if (artifact.quarantined) {
      throw new SourceCapabilityError(
        `Artifact "${artifactId}" is quarantined and cannot be opened for production: ${artifact.quarantineReason}`,
      );
    }
    if (artifact.localPath === null) {
      throw new SourceCapabilityError(
        `Artifact "${artifactId}" is ${artifact.storage} and has no local bytes; compile from its committed QA slice instead.`,
      );
    }
    let bytes: Buffer;
    try {
      bytes = readFileSync(insideRepo(artifact.localPath));
    } catch {
      throw new SourceCapabilityError(
        `Artifact "${artifactId}" is locked at "${artifact.localPath}" but those bytes are not present. Run source:acquire.`,
      );
    }

    const digest = sha256Hex(bytes);
    if (digest !== artifact.bytes.sha256) {
      throw new SourceCapabilityError(
        `Artifact "${artifactId}" at "${artifact.localPath}" hashes to ${digest}, but the lock pins ${artifact.bytes.sha256}. These are not the publisher's bytes.`,
      );
    }

    opened[role] = {
      artifact,
      ...readableForProduction(artifactId, artifact, bytes),
    };
  }

  return {
    artifacts: opened as OpenedArtifacts<T>,
    lock,
  } as ProductionInput<OpenedArtifacts<T>>;
}

export interface CachedArtifactPath {
  readonly artifactId: string;
  /** Repository-relative path under `.source-cache/<domain>/`. */
  readonly cachePath: string;
}

/**
 * Open locked publisher bytes that are intentionally cache-only.
 *
 * State-sharded products can be large enough that committing every raw archive
 * would turn the repository into the runtime data store. The lock still pins
 * the exact retrieval and digest; this opener adds only a guarded local cache
 * path, verifies that its real path remains inside this domain's cache, and
 * hashes the bytes before granting the same opaque production capability.
 */
export function openCachedProductionArtifacts<T extends string>(
  domain: string,
  lock: ArtifactLock,
  artifactsByRole: Readonly<Record<T, CachedArtifactPath>>,
): ProductionInput<OpenedArtifacts<T>> {
  if (lock.domain !== domain) {
    throw new SourceCapabilityError(
      `Domain "${domain}" was handed the lock for "${lock.domain}".`,
    );
  }

  const cacheRoot = resolve(repoRoot(), ".source-cache", domain);
  const opened: Record<string, OpenedArtifact> = {};
  for (const [role, requested] of Object.entries(artifactsByRole) as [
    string,
    CachedArtifactPath,
  ][]) {
    const artifact = requireArtifact(lock, requested.artifactId);
    if (
      artifact.storage !== "cached-not-committed" ||
      artifact.localPath !== null
    ) {
      throw new SourceCapabilityError(
        `Artifact "${requested.artifactId}" is not a cache-only artifact.`,
      );
    }
    if (artifact.quarantined) {
      throw new SourceCapabilityError(
        `Artifact "${requested.artifactId}" is quarantined and cannot be opened for production: ${artifact.quarantineReason}`,
      );
    }
    let real: string;
    try {
      real = realpathSync(insideRepo(requested.cachePath));
    } catch {
      throw new SourceCapabilityError(
        `Artifact "${requested.artifactId}" is locked but cache bytes are absent at "${requested.cachePath}". Run its declared acquisition first.`,
      );
    }
    if (real !== cacheRoot && !real.startsWith(cacheRoot + sep)) {
      throw new SourceCapabilityError(
        `Artifact "${requested.artifactId}" resolves to "${real}", outside the ${domain} source cache.`,
      );
    }

    const bytes = readFileSync(real);
    const digest = sha256Hex(bytes);
    if (digest !== artifact.bytes.sha256) {
      throw new SourceCapabilityError(
        `Artifact "${requested.artifactId}" at "${requested.cachePath}" hashes to ${digest}, but the lock pins ${artifact.bytes.sha256}. These are not the publisher's bytes.`,
      );
    }
    opened[role] = {
      artifact,
      ...readableForProduction(requested.artifactId, artifact, bytes),
    };
  }

  return {
    artifacts: opened as OpenedArtifacts<T>,
    lock,
  } as ProductionInput<OpenedArtifacts<T>>;
}

/**
 * Open a fixture.
 *
 * Two independent conditions, because either alone is forgeable: the resolved
 * real path must be under `fixtures/source/`, *and* the fixture must declare
 * itself one. A path check alone falls to a symlink; a marker alone falls to an
 * unmarked file sitting in the right directory.
 */
export function openFixture<T>(
  domain: string,
  fixturePath: string,
): FixtureInput<T> {
  const fixtureRoot = resolve(repoRoot(), "fixtures", "source");
  let real: string;
  try {
    real = realpathSync(insideRepo(fixturePath));
  } catch {
    throw new SourceCapabilityError(`Fixture "${fixturePath}" does not exist.`);
  }

  if (real !== fixtureRoot && !real.startsWith(fixtureRoot + sep)) {
    throw new SourceCapabilityError(
      `Fixture "${fixturePath}" resolves to "${real}", which is outside fixtures/source/. Fixtures live in exactly one place.`,
    );
  }

  const parsed: unknown = JSON.parse(readFileSync(real, "utf-8"));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { __fixture?: unknown }).__fixture !== true ||
    typeof (parsed as { fixtureId?: unknown }).fixtureId !== "string"
  ) {
    throw new SourceCapabilityError(
      `Fixture "${fixturePath}" does not declare {"__fixture": true, "fixtureId": "..."}. An undeclared file under fixtures/source/ is still not a fixture.`,
    );
  }

  const marked = parsed as { fixtureId: string; artifacts: T };
  if (!marked.fixtureId.startsWith(domain)) {
    throw new SourceCapabilityError(
      `Fixture "${marked.fixtureId}" is not a ${domain} fixture.`,
    );
  }

  return {
    artifacts: marked.artifacts,
    fixtureId: marked.fixtureId,
  } as FixtureInput<T>;
}

/** Which side of the boundary an input came from. */
export function inputClassOf<T>(
  input: ProductionInput<T> | FixtureInput<T>,
): "production" | "fixture" {
  return "lock" in input ? "production" : "fixture";
}

/** The artifacts an input carries, whichever side it came from. */
export function artifactsOf<T>(input: ProductionInput<T> | FixtureInput<T>): T {
  return input.artifacts;
}

/** The lock a production input was opened against. */
export function lockOf<T>(input: ProductionInput<T>): ArtifactLock {
  return input.lock;
}
