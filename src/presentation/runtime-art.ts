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
export function runtimeArtMetadata<T>(name: string, fallback: T): T {
  return (runtimeArt()?.metadata[name] as T | undefined) ?? fallback;
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
export async function initializeRuntimeArt(required = false) {
  if (typeof window === "undefined" || window.location.protocol !== "app:") {
    if (required)
      throw new Error("This game requires its installed artwork snapshot.");
    return;
  }
  const result = await fetch("/__content/manifest.json", { cache: "no-store" });
  if (result.status === 404 && !required) return;
  if (!result.ok)
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
