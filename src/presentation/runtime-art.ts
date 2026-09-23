/** Set before importing the application. One immutable snapshot per page/life. */
export interface RuntimeArtSnapshot {
  readonly schema: "ocd-runtime-art/v1";
  readonly id: string;
  readonly files: readonly {
    path: string;
    sha256: string;
    mime: string;
    bytes: number;
  }[];
  readonly metadata: Readonly<Record<string, object>>;
}
declare global {
  var __ocdRuntimeArt: RuntimeArtSnapshot | undefined;
}
export function runtimeArt() {
  return globalThis.__ocdRuntimeArt;
}

/**
 * Which library the page is composing from.
 *
 * `installed-snapshot` means a verified content snapshot was selected at
 * startup and is the only art this page may draw. `bundled-fallback` means no
 * snapshot was selected, so the finite art tracked in the repository is in use.
 * The two are never mixed: a snapshot that is missing something a consumer
 * needs is an error, not an invitation to reach into the bundle for the rest.
 */
export type RuntimeArtSelection = "installed-snapshot" | "bundled-fallback";
export function runtimeArtSelection(): RuntimeArtSelection {
  return runtimeArt() ? "installed-snapshot" : "bundled-fallback";
}

/**
 * An OPTIONAL metadata record: absent from both the snapshot and the bundle is
 * a legitimate state for the caller, which supplies its own empty default.
 *
 * Do not use this for a catalog, component registry or generation the render
 * path cannot work without. Reaching for the bundled default there is how a
 * session with a half-received snapshot ends up drawing the retired cast under
 * the new pack's name; `requiredRuntimeArtMetadata` refuses instead.
 */
export function runtimeArtMetadata<T>(name: string, fallback: T): T {
  return (runtimeArt()?.metadata[name] as T | undefined) ?? fallback;
}

/** Thrown when the selected snapshot cannot answer for something the render path requires. */
export class RuntimeArtIncompleteError extends Error {
  readonly name = "RuntimeArtIncompleteError";
  constructor(
    readonly missing: string,
    readonly snapshotId: string,
  ) {
    super(
      `The selected artwork is missing ${missing}. Your saved games are unchanged.`,
    );
  }
}

/**
 * A REQUIRED metadata record.
 *
 * With no snapshot selected this is the bundled default, exactly as before —
 * a public checkout has no snapshot and is not broken. With a snapshot
 * selected the snapshot is the whole answer: a missing name throws, so the
 * caller shows a specific error instead of composing this generation's people
 * out of the previous generation's pixels.
 */
export function requiredRuntimeArtMetadata<T>(name: string, fallback: T): T {
  const snapshot = runtimeArt();
  if (!snapshot) return fallback;
  const value = snapshot.metadata[name] as T | undefined;
  if (value === undefined)
    throw new RuntimeArtIncompleteError(name, snapshot.id);
  return value;
}

export function runtimeArtUrls(): Record<string, string> {
  const snapshot = runtimeArt();
  return snapshot
    ? Object.fromEntries(
        snapshot.files.map((f) => [
          f.path,
          `/__content/${snapshot.id}/${f.sha256}`,
        ]),
      )
    : {};
}

/**
 * Origins that may carry a content snapshot.
 *
 * `app:` is the installed client's own protocol. `http:`/`https:` are the
 * ordinary browser origins — the Vite dev server, `vite preview`, and the
 * preview Antigravity opens — which serve the same verified bytes from the
 * same cache under the same `/__content` path. Serving the snapshot on the
 * page's own origin is what lets the three agree on one art identity; it is
 * not a second loader, and nothing here fetches across origins.
 */
function mayCarrySnapshot(protocol: string): boolean {
  return protocol === "app:" || protocol === "http:" || protocol === "https:";
}

export async function initializeRuntimeArt(required = false) {
  if (
    typeof window === "undefined" ||
    !mayCarrySnapshot(window.location.protocol)
  ) {
    if (required)
      throw new Error("This game requires its installed artwork snapshot.");
    return;
  }
  const result = await fetch("/__content/manifest.json", { cache: "no-store" });
  // A browser origin with no snapshot mounted answers either 404 or, under a
  // dev server's history fallback, 200 with the application's own HTML. Both
  // mean "no snapshot here"; only the second could be mistaken for one.
  const absent =
    result.status === 404 ||
    !(result.headers.get("content-type") ?? "").includes("application/json");
  if (absent && !required) return;
  if (!result.ok || absent)
    throw new Error(
      "The selected artwork could not be loaded. Your saved games are unchanged.",
    );
  const value = (await result.json()) as RuntimeArtSnapshot;
  if (
    value.schema !== "ocd-runtime-art/v1" ||
    !Array.isArray(value.files) ||
    !value.metadata ||
    !/^[a-f0-9]{64}$/.test(value.id)
  )
    throw new Error("The selected artwork is incompatible.");
  globalThis.__ocdRuntimeArt = Object.freeze(value);
}
