/**
 * The government-edicts rights contract, and the content boundary that makes it
 * mean something.
 *
 * The edicts doctrine is a statement about the text of an enacted law. It is
 * not a statement about the web page that happens to carry that text. A state
 * constitution served inside a publisher's site arrives wrapped in navigation,
 * search widgets, revisor's notes, annotation blocks, case citations and a
 * copyright footer, and none of that is an edict. A rights record that said
 * "this page is a government edict" would therefore be false about most of the
 * bytes it covers, and a capability layer that read the status label alone
 * would hand every one of those bytes to a production compiler.
 *
 * So the determination is structured and scoped. It names the jurisdiction, the
 * body that enacted the instrument, what kind of instrument it is, the doctrine
 * relied on, and — the part that is actually enforceable — a deterministic
 * boundary saying which spans of the retrieved page are the enacted text. The
 * capability layer cuts that boundary out of the verified publisher bytes and
 * hands a compiler only what came out. The whole mixed capture is never
 * production-readable, and its untouched bytes stay on disk exactly as they
 * were retrieved.
 *
 * The boundary is expressed over normalized text rather than raw byte offsets
 * because offsets are unreadable and unreviewable: a reviewer can check
 * "beginsWith … endsWith" against the published instrument, and cannot check
 * that byte 107,419 is where an article starts.
 */

import { SourceProvenanceError } from "./errors";
import { isSha256Hex, sha256Hex } from "./hashing";
import { normalizeRetrievedText } from "./parse/html-text";

/** The classes of legal instrument this substrate will accept as an edict. */
export type LegalEdictInstrumentKind =
  | "constitution"
  | "statute"
  | "ordinance"
  | "court-opinion"
  | "administrative-regulation";

/**
 * The recognized doctrine, as data rather than prose.
 *
 * One member today. It is an enum and not a free string so that a future
 * determination has to be added here — where it can be argued about — rather
 * than typed into a record.
 */
export type LegalEdictDoctrine = "us-government-edicts";

/**
 * One span of enacted text, delimited by words a reader can look up.
 *
 * Both markers are verbatim normalized text. `endsWith` is searched from the
 * start of `beginsWith`, so a single-sentence span may use the same words for
 * both.
 */
export interface EnactedTextRegion {
  readonly beginsWith: string;
  readonly endsWith: string;
}

/**
 * Which parts of a capture the edict determination covers.
 *
 * `extracted` pins what the regions actually cut out, so a later edit to a
 * marker that silently widened the scope fails instead of quietly enlarging
 * what production may read.
 */
export interface EnactedTextScope {
  readonly boundaryKind: "normalized-text-regions";
  readonly regions: readonly EnactedTextRegion[];
  readonly extracted: { readonly length: number; readonly sha256: string };
}

/** A government-edict rights determination, in full. */
export interface GovernmentEdictBasis {
  /** Whose law it is: `US-CA`, and never inferred from a filename. */
  readonly jurisdictionKey: string;
  /** The body that enacted the instrument, named. */
  readonly enactingAuthority: string;
  readonly instrumentKind: LegalEdictInstrumentKind;
  /** The instrument's own title, as the publisher states it. */
  readonly instrumentTitle: string;
  readonly doctrine: LegalEdictDoctrine;
  /**
   * The only scope this substrate recognizes.
   *
   * A literal rather than a free field: publisher annotations, headnotes,
   * navigation and site furniture are not covered by any determination here,
   * and their rights status stays UNKNOWN.
   */
  readonly contentScope: "enacted-legal-text-only";
  readonly scope: EnactedTextScope;
}

const JURISDICTION_KEY = /^[A-Z]{2}-[A-Z0-9]{2,3}$/;

const INSTRUMENT_KINDS: ReadonlySet<string> = new Set<LegalEdictInstrumentKind>(
  [
    "constitution",
    "statute",
    "ordinance",
    "court-opinion",
    "administrative-regulation",
  ],
);

const DOCTRINES: ReadonlySet<string> = new Set<LegalEdictDoctrine>([
  "us-government-edicts",
]);

/**
 * Whether a field names something rather than merely being non-empty.
 *
 * The independent audit's finding was that `edictBasis: "x"` validated. Two
 * words of three or more letters is the smallest rule that rejects a
 * placeholder without pretending to know what an enacting body is called.
 */
function namesSomething(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const words = value.trim().split(/\s+/).filter(Boolean);
  return (
    value.trim().length >= 10 &&
    words.filter((word) => /[A-Za-z]{3}/.test(word)).length >= 2
  );
}

/** The shortest marker that can identify a span rather than matching anywhere. */
const MIN_MARKER_LENGTH = 12;

/**
 * Structural validation of an edict determination. Throws naming the artifact.
 *
 * This is a runtime check and not only a type, because a lock is JSON on disk:
 * the compiler's opinion about a literal is no protection against a record
 * loaded from a file.
 */
export function assertValidGovernmentEdictBasis(
  artifactId: string,
  edict: GovernmentEdictBasis | undefined,
): void {
  const fail = (message: string): never => {
    throw new SourceProvenanceError(
      `Artifact "${artifactId}" claims the government-edicts doctrine but ${message}`,
    );
  };

  if (!edict || typeof edict !== "object") {
    fail("carries no structured edict determination.");
    return;
  }
  if (!JURISDICTION_KEY.test(edict.jurisdictionKey ?? "")) {
    fail(
      `names jurisdiction "${edict.jurisdictionKey}", which is not a structured jurisdiction key.`,
    );
  }
  if (!namesSomething(edict.enactingAuthority)) {
    fail(
      `names enacting authority "${edict.enactingAuthority}". A determination that will not say whose edict it is has not been made.`,
    );
  }
  if (!namesSomething(edict.instrumentTitle)) {
    fail(
      `names instrument title "${edict.instrumentTitle}", which names no instrument.`,
    );
  }
  if (!INSTRUMENT_KINDS.has(edict.instrumentKind)) {
    fail(
      `declares instrument kind "${edict.instrumentKind}", which is not a supported legal-edict class.`,
    );
  }
  if (!DOCTRINES.has(edict.doctrine)) {
    fail(
      `relies on doctrine "${edict.doctrine}", which is not a recognized doctrine in this substrate.`,
    );
  }
  if (edict.contentScope !== "enacted-legal-text-only") {
    fail(
      `declares content scope "${edict.contentScope}". The doctrine reaches enacted text and nothing else.`,
    );
  }

  const scope = edict.scope;
  if (!scope || scope.boundaryKind !== "normalized-text-regions") {
    fail(
      "declares no enacted-text boundary of a supported kind, so nothing limits what production could read.",
    );
    return;
  }
  if (!Array.isArray(scope.regions) || scope.regions.length === 0) {
    fail(
      "declares an enacted-text boundary containing no region. A scope covering nothing cannot authorize a whole page.",
    );
  }
  for (const [index, region] of scope.regions.entries()) {
    for (const [side, marker] of [
      ["beginsWith", region.beginsWith],
      ["endsWith", region.endsWith],
    ] as const) {
      if (
        typeof marker !== "string" ||
        marker.trim().length < MIN_MARKER_LENGTH
      ) {
        fail(
          `region ${index} has a ${side} marker of fewer than ${MIN_MARKER_LENGTH} characters, which does not identify a span.`,
        );
      }
    }
  }
  if (!isSha256Hex(scope.extracted?.sha256 ?? "")) {
    fail("pins no SHA-256 digest for the text its boundary extracts.");
  }
  if (!(scope.extracted.length > 0)) {
    fail("pins an empty extraction, which authorizes no text at all.");
  }
}

/**
 * Cut the enacted text out of a retrieved capture.
 *
 * Regions are consumed in document order and may not overlap: each search for
 * the next region begins where the last one ended, so a boundary cannot double
 * back to re-include something it already passed.
 */
export function extractEnactedText(
  artifactId: string,
  bytes: Uint8Array,
  scope: EnactedTextScope,
): string {
  const text = normalizeRetrievedText(bytes);
  const cut: string[] = [];
  let cursor = 0;
  for (const [index, region] of scope.regions.entries()) {
    const start = text.indexOf(region.beginsWith, cursor);
    if (start < 0) {
      throw new SourceProvenanceError(
        `Artifact "${artifactId}" declares an enacted-text region ${index} beginning "${region.beginsWith.slice(0, 60)}…", which is not in the retrieved text at or after the previous region. The page is not the page this determination was made about.`,
      );
    }
    const closes = text.indexOf(region.endsWith, start);
    if (closes < 0) {
      throw new SourceProvenanceError(
        `Artifact "${artifactId}" declares an enacted-text region ${index} ending "${region.endsWith.slice(0, 60)}…", which does not appear after its own beginning.`,
      );
    }
    const end = closes + region.endsWith.length;
    cut.push(text.slice(start, end));
    cursor = end;
  }
  return cut.join("\n");
}

/**
 * Extract and prove the extraction is the one that was pinned.
 *
 * Returned as bytes because that is what a compiler is handed: a caller holding
 * an opened edict artifact holds the enacted text and has no route back to the
 * page it was cut from.
 */
export function extractPinnedEnactedText(
  artifactId: string,
  bytes: Uint8Array,
  scope: EnactedTextScope,
): Buffer {
  const extracted = Buffer.from(
    extractEnactedText(artifactId, bytes, scope),
    "utf-8",
  );
  const digest = sha256Hex(extracted);
  if (digest !== scope.extracted.sha256) {
    throw new SourceProvenanceError(
      `Artifact "${artifactId}" extracts enacted text hashing to ${digest}, but its rights determination pins ${scope.extracted.sha256}. The scope of the edict determination has moved.`,
    );
  }
  if (extracted.length !== scope.extracted.length) {
    throw new SourceProvenanceError(
      `Artifact "${artifactId}" extracts ${extracted.length} bytes of enacted text where its rights determination pins ${scope.extracted.length}.`,
    );
  }
  return extracted;
}
