import scenes from "../generated/retained-scenes.generated.json" with { type: "json" };
import type { EnvironmentSceneSpec } from "../environment-scene-spec";
/** Frozen development evidence. Ordinary scenes use shared production producers. */
export const OFFICE_COUNCIL_STAFF_FIXTURE_SCENE = scenes.find(
  (scene) => scene.scene_id === "office-council-staff-fixture",
) as unknown as EnvironmentSceneSpec;
