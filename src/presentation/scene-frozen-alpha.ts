import type { CharacterRecipe } from "./character-components";
import type { PlacementBox } from "./scene-placement";

/** Measured PEOPLE40 union alpha, from the frozen supplied default/polo proofs.
 * This is scene clearance metadata, not an art/catalog edit. Unknown recipes
 * keep their conservative canvas box; never infer a silhouette by gender. */
export function frozenSceneAlpha(
  recipe: CharacterRecipe,
  box: PlacementBox,
): PlacementBox | null {
  const ids = new Set(
    recipe.context.components.map((component) => component.assetId),
  );
  const family = ids.has("ep40-masc-average-body")
    ? "masc-average"
    : ids.has("ep40-fem-average-body")
      ? "fem-average"
      : null;
  if (
    !family ||
    !ids.has(`ep40-${family}-head`) ||
    !ids.has(`ep40-${family}-hair`)
  )
    return null;
  const prefix = `ep40-${family}-`;
  const shirt =
    family === "masc-average"
      ? ids.has(`${prefix}navy-shirt-torso`)
        ? "navy-shirt"
        : ids.has(`${prefix}blue-polo-torso`)
          ? "blue-polo"
          : null
      : ids.has(`${prefix}burgundy-blouse-torso`)
        ? "burgundy-blouse"
        : null;
  if (!shirt) return null;
  const expected = [
    "body",
    "head",
    "hair",
    "trousers",
    "shoes",
    `${shirt}-torso`,
    `${shirt}-collar`,
  ].map((id) => prefix + id);
  if (ids.size !== expected.length || expected.some((id) => !ids.has(id)))
    return null;
  const [left, top, right, bottom] =
    family === "fem-average"
      ? [70, 31, 504, 1153]
      : shirt === "blue-polo"
        ? [98, 34, 490, 1169]
        : [95, 34, 492, 1169];
  return {
    leftPercent: box.leftPercent + (left / 600) * box.widthPercent,
    topPercent: box.topPercent + (top / 1200) * box.heightPercent,
    widthPercent: ((right - left) / 600) * box.widthPercent,
    heightPercent: ((bottom - top) / 1200) * box.heightPercent,
  };
}
