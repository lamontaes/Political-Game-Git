/** Bounded additive neckline alpha authoring. No source RGB, sizing or fit changes. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { format } from "prettier";

const root = process.cwd();
const check = process.argv.includes("--check");
function emit(file: string, bytes: Uint8Array | string) {
  if (check) {
    if (
      !fs.existsSync(file) ||
      !fs.readFileSync(file).equals(Buffer.from(bytes))
    )
      throw new Error(`Stale ${file}`);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  }
}
const registry = JSON.parse(
  fs.readFileSync(
    "art/manifest/character_candidate_visual4_registry.json",
    "utf8",
  ),
);
const authoring = [
  {
    id: "pv4_wave_a_male_top_burgundy_long_sleeve_polo_v1",
    polygon: [
      [129, 24],
      [144, 23],
      [167, 23],
      [188, 24],
      [204, 26],
      [199, 38],
      [189, 50],
      [179, 60],
      [170, 72],
      [160, 59],
      [147, 51],
      [137, 40],
    ],
  },
  {
    id: "pv4_wave_a_male_top_white_button_up_shirt_v1",
    polygon: [
      [134, 25],
      [151, 24],
      [172, 24],
      [196, 26],
      [190, 38],
      [181, 46],
      [172, 58],
      [165, 73],
      [159, 58],
      [148, 47],
      [140, 36],
    ],
  },
];
const assets = [];
const evidence = [];
function inside(x: number, y: number, points: number[][]) {
  let yes = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    if (
      yi! > y !== yj! > y &&
      x < ((xj! - xi!) * (y - yi!)) / (yj! - yi!) + xi!
    )
      yes = !yes;
  }
  return yes;
}
for (const a of authoring) {
  const source = registry.assets.find(
    (r: { asset_id: string }) => r.asset_id === a.id,
  );
  if (!source) throw new Error(a.id);
  const bytes = fs.readFileSync(path.join(root, source.final_path));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== source.hash) throw new Error("Source hash changed");
  const bitmap = PNG.sync.read(bytes);
  let changed = 0;
  for (let y = 0; y < bitmap.height; y++)
    for (let x = 0; x < bitmap.width; x++) {
      let covered = 0;
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++)
          if (inside(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4, a.polygon))
            covered++;
      if (covered) {
        const at = (y * bitmap.width + x) * 4 + 3;
        bitmap.data[at] = Math.round(bitmap.data[at]! * (1 - covered / 16));
        changed++;
      }
    }
  const id = a.id + "_neckline_v1";
  const family = source.candidate_component.family;
  const dest = "art/generated/candidates/people-coherence/" + id + ".png";
  const output = PNG.sync.write(bitmap);
  emit(dest, output);
  assets.push({
    ...source,
    asset_id: id,
    final_path: dest,
    hash: createHash("sha256").update(output).digest("hex"),
    candidate_component: {
      ...source.candidate_component,
      family,
      supersedes_asset_id: source.asset_id,
    },
  });
  evidence.push({
    asset_id: id,
    source_asset_id: source.asset_id,
    source_path: source.final_path,
    source_sha256: hash,
    source_canvas: { width: bitmap.width, height: bitmap.height },
    alpha_mask_polygon: a.polygon,
    alpha_samples_per_pixel: 16,
    changed_pixels: changed,
    coordinate_class: "game-authored visual-estimate",
    basis:
      "Inner back lining bounded by the visible collar seam and front opening. Source RGB and outer silhouette preserved. Inspect complete composition, not merely self-reference edge error.",
    rights_status: "Unknown; inherited source lineage remains authoritative.",
    acceptance: "Unreleased candidate; no owner visual approval.",
  });
}
for (const [file, data] of Object.entries({
  "art/manifest/character_candidate_coherence_registry.json": {
    schema: "character-candidate-registry-v1",
    release_status: "candidate-only",
    production_pixels_released: false,
    assets,
  },
  "art/manifest/people_coherence_neckline_authoring.json": {
    schema: "people-coherence-neckline-v1",
    evidence,
  },
}))
  emit(file, await format(JSON.stringify(data), { parser: "json" }));
