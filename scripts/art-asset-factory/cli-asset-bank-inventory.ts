import fs from "fs";
import path from "path";

import { SCENE_REGISTRY } from "../../src/presentation/scene-registry";
import { writeFormatted } from "./write-formatted";
import {
  buildAssetBankInventory,
  renderAssetBankInventory,
  type AnchorDemand,
} from "./asset-bank-inventory";

/**
 * Regenerates the asset bank inventory and the generation queue.
 *
 * Anchor demand is read from the live scene registry, so "blocks current
 * gameplay" means a scene anchor really does ask for that pose today, rather
 * than someone's opinion about priority.
 */

const repositoryRoot = path.resolve(process.cwd());

function load<T>(relative: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, relative), "utf8"),
  ) as T;
}

const demands: AnchorDemand[] = [];
for (const scene of SCENE_REGISTRY.scenes.values()) {
  for (const anchor of scene.anchors.values()) {
    if (!anchor.allowedPoseFamilies) continue;
    demands.push({
      sceneId: scene.sceneId,
      anchorId: anchor.id,
      poseFamilyIds: anchor.allowedPoseFamilies,
    });
  }
}

const intakeRequest = load<{ candidates: readonly unknown[] }>(
  "art/intake/environment-batch-2026-09-03.request.json",
);

const inventory = buildAssetBankInventory(
  {
    manifest: load("art/manifest/asset_manifest.json"),
    catalog: load("art/manifest/character_catalog.json"),
    poseFamilies: load("art/manifest/pose_families.json"),
    environmentFamilies: load("art/manifest/environment_families.json"),
    cargo: load("art/manifest/cargo_disposition.json"),
  },
  demands,
  intakeRequest.candidates.length,
);

const markdownPath = path.join(
  repositoryRoot,
  "art/qa/asset_bank_inventory.md",
);
const jsonPath = path.join(repositoryRoot, "art/qa/asset_bank_inventory.json");
await writeFormatted(markdownPath, renderAssetBankInventory(inventory));
await writeFormatted(jsonPath, JSON.stringify(inventory, null, 2));

console.log(
  JSON.stringify(
    {
      version: inventory.version,
      released_environment_plates: inventory.environments.releasedPlates.length,
      released_component_kinds: Object.keys(
        inventory.characterComponents.releasedByKind,
      ).length,
      masters: inventory.masters.length,
      pose_families: inventory.poseCoverage.length,
      generation_queue: inventory.generationQueue.length,
    },
    null,
    2,
  ),
);
