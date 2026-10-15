#!/usr/bin/env node
/**
 * Imports each state's, D.C.'s and each territory's own capitol picture into
 * art/backdrops/ and merges them into art/backdrops/manifest.json.
 *
 * Usage:
 *   node scripts/art-asset-factory/import-capitol-backdrops.mjs [sourceDir]
 *
 * The source folder holds PNGs named `state-capitol-<usps>__<variant>.png`
 * (for example `state-capitol-tx__midday.png`) and a `sources.json` that says,
 * for each file, the Firefly generation it came from, the prompt, and the
 * reference photograph of the real building with its license and author.
 * Each picture paints the real capitol from that photo in the game's style.
 * Each is resized to the backdrops' 1672 × 941 and encoded with macOS `sips`
 * at JPEG quality 80, like import-place-backdrops.mjs.
 *
 * A place in the import replaces every earlier picture of that place: an old
 * morning or night picture of a different building must not outlive the new
 * midday one (the game falls back to midday for a light it doesn't have).
 * Every other backdrop in the manifest is kept as it is. Lamontae reviews the
 * pictures in play and removes any he doesn't want (2026-09-28).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const DEFAULT_SOURCE = join(
  homedir(),
  "political-game-play/cto-notes/firefly/capitols/out",
);
const OUT_DIR = resolve("art/backdrops");
const WIDTH = 1672;
const HEIGHT = 941;
const QUALITY = "80";
const OWN = /^state-capitol-[a-z]{2}$/;
const FILE =
  /^(state-capitol-[a-z]{2})__(midday|morning|night|rain|winter)\.png$/;

const source = resolve(process.argv[2] ?? DEFAULT_SOURCE);
const sources = JSON.parse(readFileSync(join(source, "sources.json"), "utf8"));
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const records = [];
for (const file of readdirSync(source).sort()) {
  const match = FILE.exec(file);
  if (!match) continue;
  const [, place, variant] = match;
  const input = join(source, file);
  const name = `${place}__${variant}.jpg`;
  const output = join(OUT_DIR, name);
  execFileSync(
    "sips",
    [
      "-z",
      String(HEIGHT),
      String(WIDTH),
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
    place,
    variant,
    file: name,
    width: WIDTH,
    height: HEIGHT,
    sha256: sha256(output),
    sourceFile: file,
    sourceSha256: sha256(input),
    fireflyAssetId: sources[file]?.assetId ?? null,
    referencePhoto: sources[file]?.referencePhoto ?? null,
    referenceLicense: sources[file]?.referenceLicense ?? null,
    referenceArtist: sources[file]?.referenceArtist ?? null,
    approval: "live-owner-reviews-in-play-2026-09-28",
  });
}

const manifestPath = join(OUT_DIR, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const importedPlaces = new Set(records.map((r) => r.place));
const dropped = manifest.backdrops.filter(
  (r) => OWN.test(r.place) && importedPlaces.has(r.place),
);
const kept = manifest.backdrops.filter((r) => !dropped.includes(r));
const written = new Set(records.map((r) => r.file));
for (const r of dropped)
  if (!written.has(r.file)) rmSync(join(OUT_DIR, r.file), { force: true });
const backdrops = [...kept, ...records].sort((a, b) =>
  `${a.place}__${a.variant}`.localeCompare(`${b.place}__${b.variant}`),
);
writeFileSync(
  manifestPath,
  `${JSON.stringify({ ...manifest, backdrops }, null, 2)}\n`,
);
process.stdout.write(
  `${records.length} capitol pictures written to ${OUT_DIR}\n`,
);
