import path from "path";
import { fileURLToPath } from "url";

import { buildArmMaskedCandidate } from "./people-visual4-arm-mask";

/**
 * `npm run derive:visual4-arm-mask`
 *
 * Writes the additive arm-masked candidate beside the original crop. Nothing
 * else changes: no manifest, no registry, and not the block in
 * `people-visual4.ts` that keeps the unmasked garment out of the game.
 */
const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const result = await buildArmMaskedCandidate(REPOSITORY_ROOT);
console.log(
  `visual4 arm mask — cleared ${result.clearedPixels}px; opaque ${result.opaqueBefore} -> ${result.opaqueAfter}; painted bounds ${result.boundsBefore.width}x${result.boundsBefore.height} -> ${result.boundsAfter.width}x${result.boundsAfter.height}`,
);
