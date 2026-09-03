import fs from "fs";
import path from "path";

import {
  poseControlPlatePath,
  renderPoseControlPlate,
} from "../../src/presentation/pose-control-plate";
import type {
  PoseFamilyDefinition,
  PoseFamilyRegistryData,
} from "../../src/presentation/pose-families";
import { hashArtFile } from "./content-hash";

/**
 * Derives every pose family's control plate and records its path and hash back
 * onto the registry.
 *
 * The plates are authoring inputs, not runtime assets: they are never
 * registered in the asset manifest, never loaded by the browser, and never
 * composited into a character. They exist so external image generation receives
 * measured structure instead of prose.
 *
 * Deterministic by construction — the renderer reads only the registry — which
 * is what lets the art validator reject a landmark edit whose plate was not
 * re-derived.
 */

export const POSE_REGISTRY_PATH = "art/manifest/pose_families.json";

/**
 * Every registry whose plates this repository derives. The fixture registry is
 * here so the contract fixture exercises the same code path as production art
 * rather than a second, weaker one.
 */
export const POSE_REGISTRY_PATHS: readonly string[] = [
  POSE_REGISTRY_PATH,
  "art/fixtures/valid_pose_families.json",
];

export interface PoseControlPlateOutput {
  readonly poseFamilyId: string;
  readonly repositoryPath: string;
  readonly hash: string;
}

export function readPoseRegistry(
  repositoryRoot: string,
  registryPath: string = POSE_REGISTRY_PATH,
): PoseFamilyRegistryData {
  return JSON.parse(
    fs.readFileSync(path.resolve(repositoryRoot, registryPath), "utf8"),
  ) as PoseFamilyRegistryData;
}

/**
 * Writes one family's plate and returns its recorded path and hash. Exported so
 * validation can re-derive into a scratch directory without touching the
 * repository copy.
 */
export function writePoseControlPlate(
  family: PoseFamilyDefinition,
  outputRoot: string,
): PoseControlPlateOutput {
  const repositoryPath = poseControlPlatePath(family);
  const filePath = path.resolve(outputRoot, repositoryPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, renderPoseControlPlate(family), "utf8");
  return {
    poseFamilyId: family.pose_family_id,
    repositoryPath,
    hash: hashArtFile(filePath),
  };
}

/**
 * Regenerates every plate in the repository and rewrites the registry's
 * `control_plate` records. Returns what it wrote.
 */
export function derivePoseControlPlates(
  repositoryRoot: string,
  registryPath: string = POSE_REGISTRY_PATH,
): readonly PoseControlPlateOutput[] {
  const registry = readPoseRegistry(repositoryRoot, registryPath);
  const outputs = registry.families.map((family) =>
    writePoseControlPlate(family, repositoryRoot),
  );
  const byId = new Map(
    outputs.map((output) => [output.poseFamilyId, output] as const),
  );
  const updated: PoseFamilyRegistryData = {
    ...registry,
    families: registry.families.map((family) => {
      const output = byId.get(family.pose_family_id);
      if (!output) return family;
      return {
        ...family,
        control_plate: { path: output.repositoryPath, hash: output.hash },
      };
    }),
  };
  fs.writeFileSync(
    path.resolve(repositoryRoot, registryPath),
    `${JSON.stringify(updated, null, 2)}\n`,
    "utf8",
  );
  return outputs;
}
