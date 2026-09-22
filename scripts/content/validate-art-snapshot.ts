/** Validate the catalog with the same constructors the game imports. Runs in
 * Node against a frozen manifest; no Vite, raster transformation or approval. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { RuntimeArtSnapshot } from "../../src/presentation/runtime-art";
const raw = readFileSync(process.argv[2]);
const manifest = JSON.parse(raw.toString()) as RuntimeArtSnapshot;
globalThis.__ocdRuntimeArt = {
  ...manifest,
  id: createHash("sha256").update(raw).digest("hex"),
};
const {
  ENGINE_PEOPLE29_INPUT_ERROR,
  ENGINE_PEOPLE29_CHARACTER_LIBRARY: library,
} = await import("../../src/presentation/engine-people29-review");
if (ENGINE_PEOPLE29_INPUT_ERROR) throw new Error(ENGINE_PEOPLE29_INPUT_ERROR);
const { SCENE_REGISTRY } =
  await import("../../src/presentation/scene-registry");
console.log(
  JSON.stringify({
    schema: "ocd-content-validation/v1",
    contentId: globalThis.__ocdRuntimeArt.id,
    generation: library.catalogGeneration,
    components: library.components.size,
    scenes: SCENE_REGISTRY.scenes.size,
  }),
);
