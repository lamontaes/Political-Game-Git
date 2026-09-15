import {
  TITLE41_POSE_PACK as pack,
  TITLE41_PART_URLS as urls,
  TITLE41_CORRECTED_URL,
} from "./title41-private-inputs";
import type { CharacterRecipe } from "./character-components";
import type { PersonAppearance } from "../simulation";
import {
  placeSourceScenePose,
  type SourceScenePose,
} from "./scene-source-pose";
import { TITLE_LECTERN_SCENE } from "./title-lectern-scene";
import type { PlacedScenePerson } from "./life-scene-people";

/** Exact recipe coverage, including face/hair/outfit; never substitute another likeness. */
export function titleLecternVariant(
  recipe: CharacterRecipe,
  appearance: PersonAppearance,
) {
  // New material colors/features need their own compatible masks, not ignored edits.
  if (
    appearance.material &&
    (Object.values(appearance.material.palettes).some(
      (id) => id !== "source-colour",
    ) ||
      Object.keys(appearance.material.features).length > 0)
  )
    return null;
  if (!pack || !TITLE41_CORRECTED_URL) return null;
  const ids = recipe.context.components.map((c) => c.assetId);
  return (
    pack.variants.find(
      (v) =>
        v.sourceAssetIds.length === ids.length &&
        v.sourceAssetIds.every((id) => ids.includes(id)),
    ) ?? null
  );
}
export function composeTitleLectern(
  recipe: CharacterRecipe,
  appearance: PersonAppearance,
  personId: string,
  name: string,
): PlacedScenePerson | null {
  const variant = titleLecternVariant(recipe, appearance);
  if (!variant || !pack) return null;
  const point = (p: readonly number[]) => ({ x: p[0]!, y: p[1]! });
  const source: SourceScenePose = {
    variantId: `title41-v2-${variant.family}-lectern`,
    pose: pack.pose,
    facing: pack.facing,
    canvas: variant.canvas,
    alphaBounds: variant.alphaBounds,
    contacts: {
      crown: point(variant.crown),
      leftFoot: point(variant.leftFoot),
      rightFoot: point(variant.rightFoot),
    },
    layers: variant.layers.map((layer) => ({
      ...layer,
      kind: layer.kind as SourceScenePose["layers"][number]["kind"],
      url: urls[`../../${layer.path}`]!,
    })),
  };
  if (source.layers.some((l) => !l.url)) return null;
  // Both axes derive from one authored uniform source scale. Hands are tested
  // against the actual reading surface; staggered soles stay distinct.
  const [tx, ty] = variant.translation;
  const floor = Math.max(variant.leftFoot[1]!, variant.rightFoot[1]!);
  const middle = (variant.leftFoot[0]! + variant.rightFoot[0]!) / 2;
  const scene = {
    ...TITLE_LECTERN_SCENE,
    standingHeightPercent:
      (((floor - variant.crown[1]!) * variant.scale) /
        TITLE_LECTERN_SCENE.plate.height) *
      100,
  };
  const original = scene.anchors.get("title41-speaker")!;
  const floorPercent =
    ((ty! + floor * variant.scale) / scene.plate.height) * 100;
  const anchor = {
    ...original,
    xPercent: ((tx! + middle * variant.scale) / scene.plate.width) * 100,
    contactFloorYPercent: floorPercent,
    floorContact: { ...original.floorContact!, floor_y_percent: floorPercent },
  };
  const fitted = placeSourceScenePose(
    scene,
    anchor,
    personId,
    recipe.identity.bodyFamily,
    source,
  );
  if (!fitted) return null;
  return {
    personId,
    name,
    relationship: null,
    anchorId: anchor.id,
    seated: false,
    ...fitted.placement.box,
    visibleBounds: fitted.bounds,
    sourcePoseId: source.variantId,
    hasArt: true,
    presence: name,
    layers: fitted.layers.map((l) => ({ ...l, url: l.url! })),
    artDiagnostics: fitted.placement.diagnostics.map((d) => d.code),
  };
}
