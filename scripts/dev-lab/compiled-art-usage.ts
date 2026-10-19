/** Build-time projection of existing consumer bindings and verified bundled bytes. */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import manifest from "../../art/manifest/asset_manifest.json";
import type { BuildArtBinding } from "../../src/authoring/art-desk-usage";

const root = process.cwd();
const client = join(root, "dist/client");
const assets = join(client, "assets");
const files = existsSync(assets) ? readdirSync(assets) : [];
// The screens that bound art (the opening plates, the regional introductions
// and the character consumers) were removed with the old engine (#4036). The
// game on the new core binds no configured art yet, so the build records an
// empty, still-valid usage file until a screen on the new core binds some.
type ArtConsumer = {
  assetId: string;
  labels: string[];
  eligible: string[];
};
const consumers: ArtConsumer[] = [];
const configured: {
  consumers: ArtConsumer[];
  gaps: string[];
  generation: number | null;
  completePlans: number;
} = { consumers: [], gaps: [], generation: null, completePlans: 0 };

if (process.env.VITE_RUNTIME_CONTENT === "1")
  writeFileSync(
    join(client, "runtime-art-consumers.json"),
    JSON.stringify(
      {
        schema: "ocd-runtime-consumers/v1",
        consumers: [...consumers, ...configured.consumers],
      },
      null,
      2,
    ) + "\n",
  );

type SourcePointer = { path: string; sha256: string };
type Asset = {
  asset_id: string;
  hash?: string;
  final_path?: string;
  calibration_lineage?: { source?: SourcePointer; sourceHash?: string };
};
const registries = readdirSync(join(root, "art/manifest"))
  .filter((name) =>
    /^character_candidate_.*(?:registry|heads)\.json$/.test(name),
  )
  .map(
    (name) =>
      JSON.parse(readFileSync(join(root, "art/manifest", name), "utf8")) as {
        assets?: Asset[];
        receipts?: { inputs?: Record<string, string> };
      },
  );
const allAssets = new Map<string, Asset>([
  ...manifest.assets.map((asset): [string, Asset] => [asset.asset_id, asset]),
  ...registries.flatMap((registry) =>
    (registry.assets ?? []).map((asset): [string, Asset] => [
      asset.asset_id,
      asset,
    ]),
  ),
]);
const sourcesByHash = new Map<string, string[]>();
// Explicit paint descriptors provide a hash-to-path join for semantic-fitted
// heads/hair. Geometry profiles are deliberately not treated as paint lineage.
for (const relativePath of [
  "art/authoring/modular47-r1/heads.json",
  "art/authoring/modular47-r1/hairs.json",
]) {
  const path = join(root, relativePath);
  if (!existsSync(path)) continue;
  const descriptors = JSON.parse(readFileSync(path, "utf8")) as {
    paint?: SourcePointer;
  }[];
  for (const { paint } of descriptors)
    if (paint)
      sourcesByHash.set(paint.sha256, [
        ...(sourcesByHash.get(paint.sha256) ?? []),
        paint.path,
      ]);
}
for (const registry of registries)
  for (const [path, sha] of Object.entries(registry.receipts?.inputs ?? {})) {
    sourcesByHash.set(sha, [...(sourcesByHash.get(sha) ?? []), path]);
  }
const hashed = new Map<string, string>();
function verified(pointer: SourcePointer) {
  const absolute = resolve(root, pointer.path);
  if (relative(root, absolute).startsWith("..") || !existsSync(absolute))
    return false;
  let sha = hashed.get(absolute);
  if (!sha) {
    sha = createHash("sha256").update(readFileSync(absolute)).digest("hex");
    hashed.set(absolute, sha);
  }
  return sha === pointer.sha256;
}
const gaps = [...configured.gaps];
const bindings: BuildArtBinding[] = [];
for (const consumer of [...consumers, ...configured.consumers]) {
  const asset = allAssets.get(consumer.assetId);
  if (!asset?.hash || !asset.final_path) {
    gaps.push(`Missing source descriptor: ${consumer.assetId}`);
    continue;
  }
  if (!verified({ path: asset.final_path, sha256: asset.hash })) {
    gaps.push(`Changed source bytes: ${asset.asset_id}`);
    continue;
  }
  const stem = basename(asset.final_path, extname(asset.final_path));
  const shipped = files.find(
    (file) =>
      file.startsWith(`${stem}-`) &&
      createHash("sha256")
        .update(readFileSync(join(assets, file)))
        .digest("hex") === asset.hash,
  );
  if (!shipped) {
    gaps.push(`Configured consumer not bundled: ${asset.asset_id}`);
    continue;
  }
  const sourceHashes = new Set([asset.hash]);
  const lineage = asset.calibration_lineage;
  if (lineage?.source) {
    if (verified(lineage.source)) sourceHashes.add(lineage.source.sha256);
    else gaps.push(`Unverified prepared source: ${asset.asset_id}`);
    gaps.push(
      `Original-to-prepared paint edge not recorded: ${asset.asset_id}; verified prepared source ${lineage.source.sha256} only`,
    );
  }
  if (lineage?.sourceHash) {
    const paths = sourcesByHash.get(lineage.sourceHash) ?? [];
    if (paths.some((path) => verified({ path, sha256: lineage.sourceHash! })))
      sourceHashes.add(lineage.sourceHash);
    else
      gaps.push(
        `Original source path not proven: ${asset.asset_id} (${lineage.sourceHash})`,
      );
  }
  for (const sourceSha256 of sourceHashes)
    bindings.push({
      assetId: asset.asset_id,
      sourceSha256,
      derivativeSha256: asset.hash,
      derivativePath: `assets/${shipped}`,
      useLabels: consumer.labels,
      eligible: consumer.eligible,
    });
}
writeFileSync(
  join(client, "art-usage.json"),
  JSON.stringify(
    {
      schema: "ocd-compiled-art-usage-v1",
      sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      bindings,
      coverage: {
        kind: "configured-consumers",
        characterGeneration: configured.generation,
        completeCharacterPlans: configured.completePlans,
        gaps: [...new Set(gaps)].sort(),
        limits: [
          "Configured selectable slots are not a report of a saved person's currently worn outfit.",
          "Prepared profile geometry alone does not prove original paint ancestry.",
          "An unmatched original or later child is not known to be unused.",
        ],
      },
    },
    null,
    2,
  ) + "\n",
);
