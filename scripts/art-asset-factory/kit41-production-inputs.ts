/* eslint-disable @typescript-eslint/no-explicit-any -- exact source schemas are copied, never remeasured. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { hashArtFile } from "./content-hash";

/** Add the delivered POSE41 contacts and versioned repairs to the existing kit.
 * The inbox and import contract are unchanged. No inferred seated templates.
 */
export function exportProductionInputs(root: string, destination: string) {
  const files = new Set<string>();
  const read = (file: string): any =>
    JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  const take = (file: string | undefined) => {
    if (!file || files.has(file)) return;
    const source = path.resolve(root, file);
    if (!source.startsWith(path.resolve(root) + path.sep))
      throw Error("Production input escapes source root");
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    files.add(file);
  };
  const posePath = "art/authoring/pose41/pack.json";
  if (!fs.existsSync(path.join(root, posePath))) return null;
  const repairPath = "art/manifest/character_candidate_modular41_heads.json";
  const repairedPosesPath = "art/authoring/modular41-head-v2/pose-pack.json";
  const pose = read(posePath);
  const repair = read(repairPath);
  const repairedPoses = read(repairedPosesPath);
  for (const file of [
    posePath,
    repairPath,
    repairedPosesPath,
    "art/authoring/pose41/coverage.json",
    "art/authoring/pose41/assemble.py",
    "art/authoring/engine-people41/source-manifest.json",
    "art/authoring/engine-people41/build.py",
    "art/authoring/modular41-head-v2/build.py",
    "art/authoring/modular41-head-v2/freeze.ts",
    "art/authoring/modular41-head-v2/pose.py",
    "art/manifest/character_candidate_engine41_registry.json",
    "art/manifest/character_candidate_engine41_generation.json",
    "src/presentation/pose41-adapter.ts",
    "src/presentation/scene-framing.ts",
    "src/player/SceneBackdrop.tsx",
    "scripts/art-asset-factory/cli-kit41.ts",
    "scripts/art-asset-factory/kit41.ts",
    "scripts/art-asset-factory/kit41-production-inputs.ts",
  ])
    take(file);
  for (const variant of [...pose.variants, ...repairedPoses.variants]) {
    for (const layer of variant.layers) take(layer.path);
    take(variant.source?.rawPath);
  }
  for (const source of read(
    "art/authoring/engine-people41/source-manifest.json",
  ).sources)
    take(`art/authoring/engine-people41/${source.path}`);
  for (const asset of repair.assets) take(asset.final_path);
  for (const parts of Object.values(repair.familyAdditions) as any[][])
    for (const part of parts) {
      take(part.svgPath);
      take(part.svgPath.replace(/\.svg$/, ".png"));
    }
  for (const source of Object.values(repair.sourceHeads) as any[]) {
    take(source.sourcePath);
    take(source.extractedPath);
  }
  const manifest = {
    schema: "kit41-production-inputs-v2",
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    standingRegistry: "art/manifest/character_candidate_engine41_registry.json",
    correctedHeads: repairPath,
    poseMetadata: [posePath, repairedPosesPath],
    counts: {
      standingFamilies: 6,
      preservedPoseFits: pose.variants.length,
      correctedIdentityFits: repairedPoses.variants.length,
    },
    measurementPolicy:
      "Standing canvases, seated support points, soles, crown, source transforms, uncertainty and confidence come verbatim from delivered POSE41 metadata. Only derived raster bounds/crown change with the corrected identity. Physical dimensions remain unknown.",
    privacy: "private-unapproved",
    rightsStatus: "unknown",
    hashes: Object.fromEntries(
      [...files]
        .sort()
        .map((file) => [file, hashArtFile(path.join(destination, file))]),
    ),
  };
  fs.writeFileSync(
    path.join(destination, "production-inputs.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(destination, "README.md"),
    `# Private KIT41 production kit — repaired source\n\nSource: ${manifest.sourceCommit}. Open index.html to inspect individual components. contract.json remains the executable KIT41 contract; production-inputs.json identifies the final source and every added pose/master file.\n\nFrom a checkout at that source, use:\n\n\`npm run kit:art -- preview /absolute/path/to/inbox/top/bundle.json\`\n\nThen use the same command with \`import\` for an explicitly versioned private item. Use individual PNG files with genuine straight alpha, exact source family/canvas/pose, and all required collar/front/back pieces. The importer refuses unsupported body/head intake; the versioned head corrections are supplied separately as authored source. Do not relabel standing geometry as seated fit.\n\nAll six standing families and their short/long garments are preserved. The delivered POSE41 pack and additional corrected identity fits retain exact contacts and confidence. No new physical measurements were made. Older masters, generations, kit versions and saved lives remain unchanged. All sources retain unknown rights status and private, unapproved acceptance.\n`,
  );
  return manifest;
}
