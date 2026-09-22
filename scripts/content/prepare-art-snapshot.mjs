/* global process, URL, console */
/** Prepare the existing registered artwork closure; never generate/approve pixels. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  CONTENT_SCHEMA,
  CONTENT_CAPABILITY,
  contentHash,
  validateContentManifest,
  containedFile,
  verifyContentBytes,
} from "../../desktop/runtime-content.mjs";
export function prepareArtSnapshot(
  root,
  { metadataOverrides = {}, dependencyRoots = [] } = {},
) {
  const metadata = {};
  const names = [
    "asset_manifest.json",
    ...readdirSync(path.join(root, "art/manifest")).filter((n) =>
      /^character_candidate_(?:engine(?:29|34|35|36|40|41)|kit41)_(?:registry|generation)\.json$|^character_candidate_modular(?:41_heads|45_registry)\.json$/.test(
        n,
      ),
    ),
  ];
  for (const name of names)
    metadata["art/manifest/" + name] = JSON.parse(
      readFileSync(containedFile(root, "art/manifest/" + name), "utf8"),
    );
  for (const family of [
    "pose41",
    "modular41-head-v2",
    "modular45",
    "systemic-repair",
    "modular47",
    "modular47-r1",
  ]) {
    const name = `art/authoring/${family}/${family === "pose41" ? "pack" : "pose-pack"}.json`;
    if (existsSync(path.join(root, name)))
      metadata[name] = JSON.parse(
        readFileSync(containedFile(root, name), "utf8"),
      );
  }
  Object.assign(metadata, metadataOverrides);
  const declared = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) {
        if (
          [
            "final_path",
            "svgPath",
            "coverageMaskPath",
            "path",
            "sourcePath",
          ].includes(k) &&
          typeof x === "string" &&
          /^art\/.*\.(png|jpe?g|webp|svg)$/.test(x)
        )
          declared.add(x);
        else walk(x);
      }
  };
  Object.values(metadata).forEach(walk);
  const mime = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  const files = [...declared].sort().map((file) => {
    const source = [root, ...dependencyRoots].find((dir) =>
      existsSync(path.join(dir, file)),
    );
    if (!source) throw new Error(`Missing content dependency: ${file}`);
    const bytes = readFileSync(containedFile(source, file));
    const entry = {
      path: file,
      sha256: contentHash(bytes),
      bytes: bytes.length,
      mime: mime[path.extname(file)],
    };
    verifyContentBytes(entry, bytes);
    return entry;
  });
  const manifest = {
    schema: CONTENT_SCHEMA,
    capability: CONTENT_CAPABILITY,
    files,
    metadata,
  };
  validateContentManifest(manifest);
  return manifest;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [root, output] = process.argv.slice(2);
  if (!root || !output)
    throw new Error("Usage: prepare-art-snapshot ROOT OUTPUT");
  const manifest = prepareArtSnapshot(root),
    bytes = JSON.stringify(manifest);
  writeFileSync(output, bytes + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      manifest: output,
      files: manifest.files.length,
      bytes: manifest.files.reduce((n, f) => n + f.bytes, 0),
      manifestSha256: contentHash(bytes + "\n"),
    }),
  );
}
