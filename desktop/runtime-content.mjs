/* global Buffer, process, URL, Response */
/** Immutable private artwork snapshots. Data only, served on the existing app origin. */
import { createHash } from "node:crypto";
import {
  readFileSync,
  realpathSync,
  statSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import path from "node:path";
export const CONTENT_SCHEMA = "ocd-runtime-art/v1";
export const CONTENT_CAPABILITY = "runtime-art-v1";
export const contentHash = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const sha = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const types = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
export function containedFile(root, relative) {
  if (
    typeof relative !== "string" ||
    relative.includes("\\") ||
    relative.includes("\0") ||
    path.isAbsolute(relative) ||
    relative.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Invalid content path");
  const base = realpathSync(root),
    file = realpathSync(path.join(base, relative));
  if (!file.startsWith(base + path.sep) || !statSync(file).isFile())
    throw new Error("Content escapes its root");
  return file;
}
function safeSvg(bytes) {
  const text = bytes.toString("utf8");
  if (
    !/<svg[\s>]/i.test(text) ||
    /<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|use|iframe|style|animate\w*|set)\b|\son\w+\s*=|url\(\s*[^#]/i.test(
      text,
    )
  )
    throw new Error("Unsafe SVG content");
  for (const match of text.matchAll(/(?:xlink:)?href\s*=\s*(["'])(.*?)\1/gis))
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(match[2]))
      throw new Error("External SVG resource");
}
export function verifyContentBytes(file, bytes) {
  if (
    !sha(file.sha256) ||
    !Number.isSafeInteger(file.bytes) ||
    file.bytes < 1 ||
    file.bytes > 100 * 1024 * 1024 ||
    bytes.length !== file.bytes ||
    contentHash(bytes) !== file.sha256
  )
    throw new Error("Content bytes do not match manifest");
  const ext = path.extname(file.path).toLowerCase();
  if (types[ext] !== file.mime) throw new Error("Unsupported content MIME");
  if (ext === ".svg") safeSvg(bytes);
  else if (
    ext === ".png" &&
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("Invalid PNG");
  else if (
    (ext === ".jpg" || ext === ".jpeg") &&
    (bytes[0] !== 255 || bytes[1] !== 216)
  )
    throw new Error("Invalid JPEG");
  else if (
    ext === ".webp" &&
    (bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP")
  )
    throw new Error("Invalid WebP");
}
export function validateContentManifest(m) {
  if (
    m?.schema !== CONTENT_SCHEMA ||
    m.capability !== CONTENT_CAPABILITY ||
    !Array.isArray(m.files) ||
    m.files.length > 50000 ||
    !m.metadata ||
    typeof m.metadata !== "object"
  )
    throw new Error("Unsupported runtime content schema");
  const paths = new Set();
  for (const file of m.files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      !/^art\//.test(file.path) ||
      file.path.includes("\\") ||
      file.path.split("/").some((p) => !p || p === "." || p === "..") ||
      paths.has(file.path) ||
      !sha(file.sha256) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 1 ||
      file.bytes > 100 * 1024 * 1024 ||
      types[path.extname(file.path).toLowerCase()] !== file.mime
    )
      throw new Error("Invalid or duplicate artwork file");
    paths.add(file.path);
  }
  const walk = (v, key = "") => {
    if (Array.isArray(v)) {
      for (const x of v) walk(x, key);
    } else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) {
        if (["__proto__", "prototype", "constructor"].includes(k))
          throw new Error("Invalid metadata key");
        walk(x, k);
      }
    else if (
      typeof v === "string" &&
      ["final_path", "sourcePath", "svgPath", "coverageMaskPath"].includes(
        key,
      ) &&
      !paths.has(v)
    )
      throw new Error(`Missing declared dependency: ${v}`);
  };
  for (const [name, record] of Object.entries(m.metadata)) {
    if (
      !/^art\/(?:manifest\/[A-Za-z0-9_-]+\.json|authoring\/[A-Za-z0-9_-]+\/(?:pose-)?pack\.json)$/.test(
        name,
      )
    )
      throw new Error("Unsupported metadata entry");
    if (!record || typeof record !== "object" || Array.isArray(record))
      throw new Error("Invalid metadata record");
    if (Array.isArray(record.assets)) {
      const ids = new Set();
      for (const a of record.assets) {
        if (typeof a.asset_id !== "string" || ids.has(a.asset_id))
          throw new Error("Duplicate asset ID");
        ids.add(a.asset_id);
        if (a.final_path && !paths.has(a.final_path))
          throw new Error(`Missing asset ${a.asset_id}`);
        if (
          a.final_path &&
          m.files.find((f) => f.path === a.final_path)?.sha256 !== a.hash
        )
          throw new Error(`Asset hash mismatch: ${a.asset_id}`);
      }
    }
    walk(record);
  }
  return m;
}
export function receiveContent({
  sourceRoot,
  manifestPath,
  cacheRoot,
  dependencyRoots = [],
}) {
  const raw = readFileSync(containedFile(sourceRoot, manifestPath));
  if (raw.length > 32 * 1024 * 1024)
    throw new Error("Content manifest is too large");
  const manifest = validateContentManifest(JSON.parse(raw));
  const id = contentHash(raw),
    blobs = path.join(cacheRoot, "blobs"),
    snapshots = path.join(cacheRoot, "snapshots");
  mkdirSync(blobs, { recursive: true });
  mkdirSync(snapshots, { recursive: true });
  let changedBytes = 0,
    cacheHits = 0;
  // A manifest is published only after every immutable blob verifies. A failed
  // transfer can leave reusable verified blobs, never an active partial snapshot.
  for (const file of manifest.files) {
    const dest = path.join(blobs, file.sha256);
    if (existsSync(dest)) {
      verifyContentBytes(file, readFileSync(containedFile(blobs, file.sha256)));
      cacheHits++;
      continue;
    }
    const inputRoot = [sourceRoot, ...dependencyRoots].find((root) =>
      existsSync(path.join(root, file.path)),
    );
    if (!inputRoot) throw new Error(`Missing content dependency: ${file.path}`);
    const bytes = readFileSync(containedFile(inputRoot, file.path));
    verifyContentBytes(file, bytes);
    const temporary = dest + ".next-" + process.pid;
    writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
    renameSync(temporary, dest);
    changedBytes += bytes.length;
  }
  const target = path.join(snapshots, id + ".json");
  if (existsSync(target)) {
    if (
      contentHash(readFileSync(containedFile(snapshots, id + ".json"))) !== id
    )
      throw new Error("Cached manifest changed");
  } else {
    const temp = target + ".next-" + process.pid;
    writeFileSync(temp, raw, { flag: "wx", mode: 0o600 });
    renameSync(temp, target);
  }
  return {
    schema: CONTENT_SCHEMA,
    id,
    cacheRoot: path.resolve(cacheRoot),
    changedBytes,
    cacheHits,
    fileCount: manifest.files.length,
  };
}
export function loadContent(snapshot) {
  if (
    snapshot?.schema !== CONTENT_SCHEMA ||
    !sha(snapshot.id) ||
    !path.isAbsolute(snapshot.cacheRoot)
  )
    throw new Error("Invalid snapshot reference");
  const raw = readFileSync(
    containedFile(
      path.join(snapshot.cacheRoot, "snapshots"),
      snapshot.id + ".json",
    ),
  );
  if (raw.length > 32 * 1024 * 1024 || contentHash(raw) !== snapshot.id)
    throw new Error("Snapshot manifest changed");
  const manifest = validateContentManifest(JSON.parse(raw));
  for (const file of manifest.files)
    verifyContentBytes(
      file,
      readFileSync(
        containedFile(path.join(snapshot.cacheRoot, "blobs"), file.sha256),
      ),
    );
  return { snapshot, manifest };
}
/**
 * `host` is the one origin allowed to ask. The installed client serves the
 * snapshot at `app://game`, so that stays the default. A browser origin — the
 * dev server, `vite preview`, the preview Antigravity opens — passes its own
 * host instead and gets the identical bytes through the identical validation:
 * one loader, several origins, not a second delivery path.
 */
export function serveRuntimeContent(loaded, request, { host = "game" } = {}) {
  const url = new URL(request.url);
  if (url.host !== host || request.method !== "GET")
    return new Response("Not found", { status: 404 });
  if (url.pathname === "/__content/manifest.json")
    return new Response(
      JSON.stringify({ id: loaded.snapshot.id, ...loaded.manifest }),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  const match = /^\/__content\/([a-f0-9]{64})\/([a-f0-9]{64})$/.exec(
    url.pathname,
  );
  if (!match || match[1] !== loaded.snapshot.id)
    return new Response("Not found", { status: 404 });
  const file = loaded.manifest.files.find((f) => f.sha256 === match[2]);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const bytes = readFileSync(
      containedFile(path.join(loaded.snapshot.cacheRoot, "blobs"), file.sha256),
    );
    verifyContentBytes(file, bytes);
    return new Response(bytes, {
      headers: {
        "content-type": file.mime,
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; img-src data:; sandbox",
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Artwork unavailable", { status: 503 });
  }
}
