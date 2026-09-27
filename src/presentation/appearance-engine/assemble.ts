import { neckOffset, type BodyAnchors } from "./anchors";
import { createRaster, type Raster } from "./raster";

/**
 * One layer order for everybody. The head goes ABOVE the clothes, so a
 * collar can never draw over a jaw, and a garment layer may contain no skin
 * at all (see checks.ts). A dress replaces the top and the bottoms.
 */
export const LAYER_ORDER = [
  "back-hair",
  "body",
  "bottoms",
  "shoes",
  "top",
  "dress",
  "outerwear",
  "head",
  "front-hair",
  "accessories",
] as const;

export type LayerSlot = (typeof LAYER_ORDER)[number];

/** Layers drawn against a head, which follow the body's measured neck. */
const HEAD_BOUND: ReadonlySet<LayerSlot> = new Set([
  "back-hair",
  "head",
  "front-hair",
]);

export interface PersonLayer {
  readonly slot: LayerSlot;
  readonly raster: Raster;
  /**
   * For head-bound layers: the body the layer was drawn against. The layer
   * is moved by the difference between that body's neck and this body's.
   */
  readonly authoredFor?: BodyAnchors;
}

export interface PlacedLayer {
  readonly slot: LayerSlot;
  readonly raster: Raster;
  readonly dx: number;
  readonly dy: number;
}

/** The layers in drawing order, each with the offset it is drawn at. */
export function placeLayers(
  body: BodyAnchors,
  layers: readonly PersonLayer[],
): readonly PlacedLayer[] {
  const slots = new Set(layers.map((layer) => layer.slot));
  return layers
    .filter(
      (layer) =>
        !(
          slots.has("dress") &&
          (layer.slot === "top" || layer.slot === "bottoms")
        ),
    )
    .map((layer) => {
      const offset =
        HEAD_BOUND.has(layer.slot) && layer.authoredFor
          ? neckOffset(layer.authoredFor, body)
          : { dx: 0, dy: 0 };
      return { slot: layer.slot, raster: layer.raster, ...offset };
    })
    .sort((a, b) => LAYER_ORDER.indexOf(a.slot) - LAYER_ORDER.indexOf(b.slot));
}

/** Straight-alpha "over" compositing of placed layers onto one canvas. */
export function composite(
  width: number,
  height: number,
  placed: readonly PlacedLayer[],
): Raster {
  const out = createRaster(width, height);
  const dst = out.data;
  for (const layer of placed) {
    const src = layer.raster.data;
    for (let y = 0; y < layer.raster.height; y += 1) {
      const ty = y + layer.dy;
      if (ty < 0 || ty >= height) continue;
      for (let x = 0; x < layer.raster.width; x += 1) {
        const tx = x + layer.dx;
        if (tx < 0 || tx >= width) continue;
        const s = (y * layer.raster.width + x) * 4;
        const sa = src[s + 3]! / 255;
        if (sa === 0) continue;
        const d = (ty * width + tx) * 4;
        const da = dst[d + 3]! / 255;
        const oa = sa + da * (1 - sa);
        for (let c = 0; c < 3; c += 1) {
          dst[d + c] = (src[s + c]! * sa + dst[d + c]! * da * (1 - sa)) / oa;
        }
        dst[d + 3] = oa * 255;
      }
    }
  }
  return out;
}

/** Place and composite in one step, on the body's own canvas. */
export function assemblePerson(
  body: BodyAnchors,
  layers: readonly PersonLayer[],
): Raster {
  const canvas = layers.find((layer) => layer.slot === "body")?.raster;
  if (!canvas) throw new Error("A person needs a body layer.");
  return composite(canvas.width, canvas.height, placeLayers(body, layers));
}
