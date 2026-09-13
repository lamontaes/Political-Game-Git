import path from "node:path";

/**
 * Where a renderer-initiated portable-save download may land.
 *
 * The shell has no general filesystem bridge. This is only the ordinary
 * browser download of a JSON life file the game already produced.
 */
export function portableDownloadSavePath(
  filename,
  url,
  destinationDir,
  appOrigin,
) {
  const base = path.basename(String(filename ?? ""));
  if (base === "" || base === "." || base === "..") return null;
  if (!base.endsWith(".ocd-life.json") && !base.endsWith(".json")) return null;
  const source = String(url ?? "");
  const allowedOrigin =
    source.startsWith("blob:") ||
    source.startsWith("data:application/json") ||
    source.startsWith("data:text/plain") ||
    source.startsWith(`${appOrigin}/`);
  if (!allowedOrigin) return null;
  return path.join(destinationDir, base);
}
