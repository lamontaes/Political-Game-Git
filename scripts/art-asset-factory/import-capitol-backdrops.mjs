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
 * for each file, the Firefly generation it came from and the prompt. They are
 * Firefly edits of the shared dome picture, so the tree, lamp posts, street
 * and style stay those of the owner's placeholder set; only the building
 * changes. Each is resized to the backdrops' 1672 × 941 and encoded with
 * macOS `sips` at JPEG quality 80, like import-place-backdrops.mjs.
 *
 * Only `state-capitol-<usps>` entries are replaced; every other backdrop in
 * the manifest is kept as it is. They await Lamontae's review, which the
 * `approval` field says.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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
    approval: "pending-owner-review-2026-09-28",
  });
}

const manifestPath = join(OUT_DIR, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const replaced = new Set(records.map((r) => `${r.place}__${r.variant}`));
const kept = manifest.backdrops.filter(
  (r) => !(OWN.test(r.place) && replaced.has(`${r.place}__${r.variant}`)),
);
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
