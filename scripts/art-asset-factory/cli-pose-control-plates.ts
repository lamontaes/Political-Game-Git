import path from "path";

import { POSE_CONTROL_PLATE_VERSION } from "../../src/presentation/pose-control-plate";
import {
  derivePoseControlPlates,
  POSE_REGISTRY_PATHS,
} from "./pose-control-plates";

/**
 * Regenerates every pose control plate and records its hash on the registry.
 * Run after any landmark, contact or canvas edit; the art validator rejects a
 * registry whose plates were not re-derived.
 */

const repositoryRoot = path.resolve(process.cwd());
const outputs = POSE_REGISTRY_PATHS.flatMap((registryPath) =>
  derivePoseControlPlates(repositoryRoot, registryPath),
);

console.log(
  JSON.stringify(
    {
      version: POSE_CONTROL_PLATE_VERSION,
      plate_count: outputs.length,
      plates: outputs,
    },
    null,
    2,
  ),
);
