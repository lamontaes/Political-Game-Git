#!/usr/bin/env node
/**
 * Imports the owner's place backdrops (the Sept. 27 overnight art wave) into
 * art/backdrops/ as runtime JPEGs, and writes art/backdrops/manifest.json.
 *
 * Usage:
 *   node scripts/art-asset-factory/import-place-backdrops.mjs [sourceDir]
 *
 * The source folder is the art team's candidate folder with its manifest.json.
 * Superseded and defective entries are skipped. Each kept PNG is converted
 * with macOS `sips` at JPEG quality 80 and its original width, so the runtime
 * file is a re-encode of exactly the pixels the owner reviewed. The manifest
 * keeps the source file name and SHA-256 of the reviewed original beside the
 * SHA-256 of the runtime file, so either can be traced to the other.
 *
 * Lamontae approved these as placeholders on Sept. 27, 2026 ("most of them I
 * approve ... I want to see them in the game"). Any he rejects are listed in
 * REJECTED below and are removed on the next run.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const DEFAULT_SOURCE = join(
  homedir(),
  "Documents/PG-LAND/art/generated/candidates/art-desk/overnight-wave-2026-09-27",
);
const OUT_DIR = resolve("art/backdrops");
const QUALITY = "80";

/** "<place>__<variant>" keys the owner has rejected. */
const REJECTED = new Set([]);

const source = resolve(process.argv[2] ?? DEFAULT_SOURCE);
const entries = JSON.parse(readFileSync(join(source, "manifest.json"), "utf8"));

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const kept = entries
  .filter((entry) => !/^(superseded|defective)/.test(entry.status))
  .filter((entry) => !REJECTED.has(`${entry.place}__${entry.variant}`))
  .sort((a, b) =>
    `${a.place}__${a.variant}`.localeCompare(`${b.place}__${b.variant}`),
  );

mkdirSync(OUT_DIR, { recursive: true });
const wanted = new Set(kept.map((e) => `${e.place}__${e.variant}.jpg`));
for (const file of readdirSync(OUT_DIR)) {
  if (file.endsWith(".jpg") && !wanted.has(file)) rmSync(join(OUT_DIR, file));
}

const records = [];
for (const entry of kept) {
  const input = join(source, entry.file);
  if (!existsSync(input)) throw new Error(`Missing source ${input}`);
  const sourceSha = sha256(input);
  if (sourceSha !== entry.sha256) {
    throw new Error(`${entry.file} changed since review (sha256 mismatch).`);
  }
  const name = `${entry.place}__${entry.variant}.jpg`;
  const output = join(OUT_DIR, name);
  execFileSync(
    "sips",
    [
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      QUALITY,
      input,
      "--out",
      output,
    ],
    { stdio: "ignore" },
  );
  records.push({
    place: entry.place,
    variant: entry.variant,
    file: name,
    width: entry.width,
    height: entry.height,
    sha256: sha256(output),
    sourceFile: entry.file,
    sourceSha256: entry.sha256,
    approval: "owner-placeholder-2026-09-27",
  });
}

writeFileSync(
  join(OUT_DIR, "manifest.json"),
  `${JSON.stringify({ schema: "ocd-place-backdrops/v1", backdrops: records }, null, 2)}\n`,
);
process.stdout.write(`${records.length} backdrops written to ${OUT_DIR}\n`);
