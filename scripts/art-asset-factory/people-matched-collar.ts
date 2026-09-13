/** Split existing alpha into coordinated collar/torso pieces; never paint or rescale. */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { format } from "prettier";
import registry from "../../art/manifest/character_candidate_coherence_registry.json";
const check = process.argv.includes("--check");
function emit(file: string, bytes: Uint8Array | string) {
  if (check) {
    if (!fs.readFileSync(file).equals(Buffer.from(bytes)))
      throw new Error(`Stale ${file}`);
  } else fs.writeFileSync(file, bytes);
}
const assets = [];
const evidence = [];
for (const source of registry.assets) {
  const input = fs.readFileSync(source.final_path);
  if (createHash("sha256").update(input).digest("hex") !== source.hash)
    throw new Error("Source hash changed");
  const back = PNG.sync.read(input),
    front = PNG.sync.read(input);
  // Source-pixel partition follows the two front collar flaps, below the back band.
  // Integer cut lies within continuous opaque cloth: exact disjoint alpha conservation.
  const box = { left: 108, right: 227, top: 25, bottom: 82 };
  for (let y = 0; y < back.height; y++)
    for (let x = 0; x < back.width; x++) {
      const at = (y * back.width + x) * 4 + 3;
      const selected =
        x >= box.left && x < box.right && y >= box.top && y < box.bottom;
      if (selected) back.data[at] = 0;
      else front.data[at] = 0;
    }
  const ownerId = source.asset_id.replace("_neckline_v1", "_matched_v1");
  const frontId = ownerId + "_collar_front";
  const definition = { ...source.candidate_component };
  delete (definition as Partial<typeof definition>).supersedes_asset_id;
  for (const [id, bitmap, component] of [
    [
      ownerId,
      back,
      {
        ...definition,
        supersedes_asset_id: source.asset_id,
        render_piece_ids: [frontId],
      },
    ],
    [frontId, front, { ...definition, layer: 43, render_piece_of: ownerId }],
  ] as const) {
    const output = PNG.sync.write(bitmap);
    const final_path = `art/generated/candidates/people-coherence/${id}.png`;
    emit(final_path, output);
    assets.push({
      ...source,
      asset_id: id,
      final_path,
      hash: createHash("sha256").update(output).digest("hex"),
      candidate_component: component,
    });
  }
  evidence.push({
    source_asset_id: source.asset_id,
    source_path: source.final_path,
    source_sha256: source.hash,
    owner_asset_id: ownerId,
    front_asset_id: frontId,
    source_canvas: definition.canvas,
    front_partition: box,
    coordinate_class: "game-authored visual-estimate",
    behind_layer: 35,
    head_layer: 40,
    front_layer: 43,
    template: {
      bodies: definition.compatible_body_families,
      poses: definition.compatible_pose_families,
      view: "front",
      attachment: definition.attaches_to,
      origin: definition.origin,
    },
    geometry:
      "Exact source canvas/origin and existing per-body fit; intentional cloth ease unchanged. Alpha partition is disjoint and lossless relative to neckline-v1. No painted anatomy or hidden surfaces supplied.",
    rights_status: "Unknown; original source lineage preserved",
    acceptance: "Candidate only, no automatic art approval",
  });
}
emit(
  "art/manifest/character_candidate_matched_registry.json",
  await format(
    JSON.stringify({
      schema: "character-candidate-registry-v1",
      release_status: "candidate-only",
      production_pixels_released: false,
      assets,
    }),
    { parser: "json" },
  ),
);
emit(
  "art/manifest/people_matched_collar_authoring.json",
  await format(
    JSON.stringify({ schema: "people-matched-collar-v1", evidence }),
    { parser: "json" },
  ),
);
