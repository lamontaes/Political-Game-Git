import type { CharacterRenderPlan } from "./character-render-plan";
import {
  resolveSceneTransform,
  type SceneCameraPolicy,
  type SceneSize,
} from "./scene-transform";

/** Review camera only. The original plate, rig, contacts and layers stay intact. */
export function frameCharacterReview(
  viewport: SceneSize,
  plate: SceneSize,
  plans: readonly CharacterRenderPlan[],
  camera: SceneCameraPolicy,
  devicePixelRatio = 1,
) {
  const boxes = plans.flatMap((plan) =>
    plan.layers.map((layer) => ({
      x: (layer.leftPercent * plate.width) / 100,
      y: (layer.topPercent * plate.height) / 100,
      width: (layer.widthPercent * plate.width) / 100,
      height: (layer.heightPercent * plate.height) / 100,
    })),
  );
  const padding = 12;
  const left = Math.min(0, ...boxes.map((box) => box.x)) - padding;
  const top = Math.min(0, ...boxes.map((box) => box.y)) - padding;
  const right =
    Math.max(plate.width, ...boxes.map((box) => box.x + box.width)) + padding;
  const bottom =
    Math.max(plate.height, ...boxes.map((box) => box.y + box.height)) + padding;
  const transform = resolveSceneTransform(
    viewport,
    { width: right - left, height: bottom - top },
    {
      ...camera,
      minimumAspectRatio: (right - left) / (bottom - top),
      maximumAspectRatio: (right - left) / (bottom - top),
      horizontalFocus: 0.5,
      verticalFocus: 0.5,
    },
    devicePixelRatio,
  );
  return {
    ...transform,
    xOffset: transform.xOffset - left * transform.uniformScale,
    yOffset: transform.yOffset - top * transform.uniformScale,
    framing: { left, top, right, bottom },
  };
}
