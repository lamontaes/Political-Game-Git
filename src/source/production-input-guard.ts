/**
 * Keeps synthetic fixtures out of production source compilation.
 *
 * The failure this prevents is specific and has already happened twice in this
 * repository. PR #57 compiled a synthetic "HB 999 / John Doe" fixture into its
 * committed normalized corpus, where it was indistinguishable from a real bill.
 * PR #56 committed invented employment and finance figures carrying
 * `sourceSystem: "US_CENSUS_BUREAU"` and hand-typed `sourceHash` values. Both
 * passed CI, because CI checked that the pipeline ran, not that its inputs were
 * real.
 *
 * So the guard is structural rather than advisory. A production compiler calls
 * `assertProductionInputPath` on every file it opens and
 * `assertNotSyntheticPayload` on every document it parses. A fixture cannot
 * reach committed normalized data without deleting one of those calls, and the
 * substrate integrity test fails if a compiler stops making them.
 */

/**
 * Path segments that mark a directory as test-only.
 *
 * The double-underscore convention is deliberate: an ordinary `fixtures/`
 * directory name is too easy to reach for when a domain wants a word for
 * "sample inputs", and #56 did exactly that for data it presented as
 * empirical. A quarantined directory has to be named as one.
 */
export const QUARANTINED_PATH_SEGMENTS: readonly string[] = [
  "__fixtures__",
  "__synthetic_fixtures__",
  "__mocks__",
  "__tests__",
];

/** Field values that declare a document synthetic. */
const SYNTHETIC_SOURCE_SYSTEMS: readonly string[] = [
  "SYNTHETIC_FIXTURE",
  "SYNTHETIC",
  "TEST_FIXTURE",
];

export class SyntheticInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyntheticInputError";
  }
}

/** Splits a path on either separator so the check is platform-independent. */
function pathSegments(filePath: string): string[] {
  return filePath.split(/[/\\]+/).filter((segment) => segment.length > 0);
}

/**
 * Throws when a production compiler is asked to read from a quarantined path.
 */
export function assertProductionInputPath(filePath: string): void {
  const offending = pathSegments(filePath).find((segment) =>
    QUARANTINED_PATH_SEGMENTS.includes(segment),
  );

  if (offending !== undefined) {
    throw new SyntheticInputError(
      `Refusing to compile production source data from quarantined path segment "${offending}" (${filePath}). ` +
        "Synthetic fixtures exercise compilers in tests; they must never reach committed normalized data.",
    );
  }
}

/** True when a path is inside a quarantined directory. */
export function isQuarantinedPath(filePath: string): boolean {
  return pathSegments(filePath).some((segment) =>
    QUARANTINED_PATH_SEGMENTS.includes(segment),
  );
}

function collectSyntheticMarkers(value: unknown, path: string): string[] {
  const found: string[] = [];

  const walk = (node: unknown, at: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => walk(entry, `${at}[${index}]`));
      return;
    }
    if (node === null || typeof node !== "object") return;

    for (const [key, entry] of Object.entries(node)) {
      const here = `${at}.${key}`;
      if (key === "__synthetic__" && entry === true) {
        found.push(here);
      }
      if (
        (key === "sourceSystem" || key === "surveyName") &&
        typeof entry === "string" &&
        SYNTHETIC_SOURCE_SYSTEMS.includes(entry)
      ) {
        found.push(`${here} = ${entry}`);
      }
      if (key === "isSynthetic" && (entry === true || entry === "true")) {
        found.push(here);
      }
      walk(entry, here);
    }
  };

  walk(value, path);
  return found;
}

/**
 * Throws when a parsed document declares itself synthetic.
 *
 * This is the second line of defence: a fixture copied out of its quarantined
 * directory into a production input directory still carries its own marker.
 */
export function assertNotSyntheticPayload(
  payload: unknown,
  describedAs = "document",
): void {
  const markers = collectSyntheticMarkers(payload, describedAs);
  if (markers.length > 0) {
    throw new SyntheticInputError(
      `Refusing to compile a document that declares itself synthetic (${markers.join(", ")}). ` +
        "No synthetic record may enter an empirical corpus, however green CI is.",
    );
  }
}

/**
 * Convenience wrapper for the common compiler step: check the path, parse, and
 * check the payload.
 */
export function readProductionSourceDocument<T>(
  filePath: string,
  parse: (filePath: string) => T,
): T {
  assertProductionInputPath(filePath);
  const parsed = parse(filePath);
  assertNotSyntheticPayload(parsed, filePath);
  return parsed;
}
