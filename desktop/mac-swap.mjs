/**
 * The unsigned Mac app's update install, as decisions rather than wiring.
 *
 * Squirrel.Mac refuses to install an update into an app without a Developer
 * ID signature, and this game ships unsigned. So on a Mac the shell installs
 * a downloaded update itself: it downloads the release's zip, checks the
 * zip's sha512 against the release manifest (latest-mac.yml), unpacks it,
 * ad-hoc signs the unpacked bundle, and when the player quits, a small helper
 * script waits for the app to exit, swaps the new bundle in place of the old
 * one (keeping the old one until the new one is in place) and opens it.
 *
 * Everything here is free of Electron and of the file system so the
 * decisions are proved deterministically (tests/mac-swap.test.mjs);
 * mac-install.mjs does the downloading, unpacking and spawning.
 */

/** The running .app bundle for a Mac executable path, or null. */
export function macBundleFromExecPath(execPath) {
  const match = /^(\/.+?\.app)\/Contents\/MacOS\/[^/]+$/.exec(
    String(execPath ?? ""),
  );
  return match ? match[1] : null;
}

/**
 * The zip to download for this Mac's architecture, from the manifest's
 * `files`. A name that says arm64 is Apple Silicon; one without it is Intel.
 */
export function pickMacZip(files, arch) {
  const zips = (Array.isArray(files) ? files : []).filter(
    (file) =>
      file &&
      typeof file.url === "string" &&
      file.url.endsWith(".zip") &&
      typeof file.sha512 === "string" &&
      file.sha512 !== "",
  );
  const isArm = (file) => /arm64/.test(file.url);
  const wanted = zips.filter((file) =>
    arch === "arm64" ? isArm(file) : !isArm(file),
  );
  return wanted[0] ?? null;
}

/**
 * Whether this Mac install can be swapped, and what to download.
 *
 * Refused (with a reason the dialog reports) when the app is not a bundle,
 * runs from the disk image or from macOS's translocated read-only copy (the
 * swap would not stick: the player moves the app to Applications first), its
 * folder cannot be written, or the release has no zip for this Mac.
 */
export function planMacSwap({ execPath, arch, updateInfo, folderWritable }) {
  const bundle = macBundleFromExecPath(execPath);
  if (bundle === null) return { action: "refuse", reason: "not-a-bundle" };
  if (bundle.includes("/AppTranslocation/"))
    return { action: "refuse", reason: "translocated" };
  if (bundle.startsWith("/Volumes/"))
    return { action: "refuse", reason: "disk-image" };
  if (!folderWritable) return { action: "refuse", reason: "not-writable" };
  const zip = pickMacZip(updateInfo?.files, arch);
  if (zip === null) return { action: "refuse", reason: "no-zip" };
  return { action: "swap", bundle, zip };
}

/**
 * The download address of a release file. GitHub stores a name with spaces
 * under dashes, as electron-updater's GitHub provider reads it.
 */
export function releaseFileUrl({ owner, repo, tag, name }) {
  return `https://github.com/${owner}/${repo}/releases/download/${encodeURIComponent(
    tag,
  )}/${encodeURIComponent(String(name).replace(/ /g, "-"))}`;
}

/** Whether a downloaded file's sha512 (base64) is the manifest's. */
export function sha512Matches(actualBase64, expectedBase64) {
  return (
    typeof actualBase64 === "string" &&
    typeof expectedBase64 === "string" &&
    actualBase64 !== "" &&
    actualBase64 === expectedBase64
  );
}

/** One shell word, safe for any path. */
export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * The helper script run when the player quits: wait for this app to exit,
 * move the old bundle aside, move the new one in, put the old one back if
 * that fails, and open whichever is in place. Nothing is deleted until the
 * new bundle is in place.
 */
export function swapScript({ pid, bundle, staged, backup }) {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error("bad pid");
  for (const value of [bundle, staged, backup])
    if (typeof value !== "string" || !value.startsWith("/"))
      throw new Error("paths must be absolute");
  const [b, s, k] = [bundle, staged, backup].map(shellQuote);
  return [
    "#!/bin/sh",
    `while kill -0 ${pid} 2>/dev/null; do sleep 0.5; done`,
    `rm -rf ${k}`,
    `if mv ${b} ${k}; then`,
    `  if mv ${s} ${b}; then`,
    `    rm -rf ${k}`,
    "  else",
    `    mv ${k} ${b}`,
    "  fi",
    "fi",
    `xattr -dr com.apple.quarantine ${b} 2>/dev/null`,
    `open ${b}`,
    "",
  ].join("\n");
}
