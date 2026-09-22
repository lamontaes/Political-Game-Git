/**
 * Types for `runtime-content.mjs`, which is plain ESM shared by the desktop
 * shell, the receiver CLI and the dev/preview content route. The runtime is the
 * `.mjs` module; this file only describes the surface TypeScript callers use,
 * so a typed caller cannot drift from it silently.
 */

export const CONTENT_SCHEMA: "ocd-runtime-art/v1";
export const CONTENT_CAPABILITY: "runtime-art-v1";

export interface ContentFile {
  readonly path: string;
  readonly sha256: string;
  readonly mime: string;
  readonly bytes: number;
}

export interface ContentManifest {
  readonly schema: typeof CONTENT_SCHEMA;
  readonly capability: typeof CONTENT_CAPABILITY;
  readonly files: readonly ContentFile[];
  readonly metadata: Readonly<Record<string, object>>;
}

/** A published snapshot: the manifest's own hash plus where its blobs live. */
export interface ContentSnapshot {
  readonly schema: typeof CONTENT_SCHEMA;
  readonly id: string;
  readonly cacheRoot: string;
}

export interface LoadedContent {
  readonly snapshot: ContentSnapshot;
  readonly manifest: ContentManifest;
}

export function contentHash(bytes: Uint8Array | string): string;
export function containedFile(root: string, relative: string): string;
export function verifyContentBytes(file: ContentFile, bytes: Uint8Array): void;
export function validateContentManifest(manifest: unknown): ContentManifest;

export function receiveContent(options: {
  readonly sourceRoot: string;
  readonly manifestPath: string;
  readonly cacheRoot: string;
  readonly dependencyRoots?: readonly string[];
}): ContentSnapshot & {
  readonly changedBytes: number;
  readonly cacheHits: number;
  readonly fileCount: number;
};

/** Verifies every blob against the manifest it was received under. Throws otherwise. */
export function loadContent(snapshot: ContentSnapshot): LoadedContent;

/**
 * `host` is the one origin allowed to ask; it defaults to the installed
 * client's `game`. A browser origin passes its own host and gets the same
 * bytes through the same validation.
 */
export function serveRuntimeContent(
  loaded: LoadedContent,
  request: Request,
  options?: { readonly host?: string },
): Response;
