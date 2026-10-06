import { neckOffset, type BodyAnchors } from "./anchors";
import { createRaster, type Raster } from "./raster";
import { withoutWhiteMatte } from "./white-matte";

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
  "outfit",
  "outerwear",
  "jewelry",
  "head",
  "facial-hair",
  "glasses",
  "earrings",
  "front-hair",
  "accessories",
] as const;

export type LayerSlot = (typeof LAYER_ORDER)[number];

/** Layers drawn against a head, which follow the body's measured neck. */
const HEAD_BOUND: ReadonlySet<LayerSlot> = new Set([
  "back-hair",
  "head",
  "facial-hair",
  "glasses",
  "earrings",
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
  /** For garments: body pixels the garment hides entirely (see extract.ts). */
  readonly hidesBody?: Uint8Array | null;
  /**
   * For trousers: the shirt is tucked in. The trousers are drawn over the top
   * from their waistband down, and the top ends just under the waistband's
   * top edge (the waistline from extract.ts).
   */
  readonly tucksTop?: { readonly waistline: Int32Array };
  /** For tops: cloth just below the waist, used only when tucked in (extract.ts). */
  readonly tuckTail?: Raster | null;
}

/** How far under the waistband's top edge a tucked shirt still reaches. */
const TUCK_DEPTH = 6;

/** A top cut off just under a waistband, where it goes into the trousers. */
function tuckInto(raster: Raster, waistline: Int32Array): Raster {
  const data = new Uint8ClampedArray(raster.data);
  for (let x = 0; x < raster.width; x += 1) {
    const waist = waistline[x]!;
    if (waist < 0) continue;
    for (let y = waist + TUCK_DEPTH; y < raster.height; y += 1)
      data[(y * raster.width + x) * 4 + 3] = 0;
  }
  return { width: raster.width, height: raster.height, data };
}

export interface PlacedLayer {
  readonly slot: LayerSlot;
  readonly raster: Raster;
  readonly dx: number;
  readonly dy: number;
}

/**
 * Fades the bottom of a layer into what is under it: in each column, the
 * last `rows` opaque rows ramp from full to no opacity. A head layer ends in
 * a horizontal cut across the neck; faded, the body's own neck shows through
 * the join and no line is left.
 */
export function featherBottomEdge(raster: Raster, rows: number): Raster {
  const data = new Uint8ClampedArray(raster.data);
  const { width, height } = raster;
  const bottoms = new Int32Array(width).fill(-1);
  for (let x = 0; x < width; x += 1)
    for (let y = height - 1; y >= 0; y -= 1)
      if (data[(y * width + x) * 4 + 3]! > 0) {
        bottoms[x] = y;
        break;
      }
  const lowest = Math.max(...bottoms);
  for (let x = 0; x < width; x += 1) {
    const bottom = bottoms[x]!;
    // Only the cut across the neck fades; an earlobe or a jaw stays solid.
    if (bottom < 0 || bottom < lowest - rows) continue;
    for (let k = 0; k < rows; k += 1) {
      const y = bottom - k;
      if (y < 0) break;
      const i = (y * width + x) * 4 + 3;
      data[i] = Math.round(data[i]! * ((k + 1) / (rows + 1)));
    }
  }
  return { width, height, data };
}

/** How far up the neck a head layer fades into the body: 2% of the canvas. */
export const HEAD_FEATHER_SHARE = 0.02;

/** The layers in drawing order, each with the offset it is drawn at. */
export function placeLayers(
  body: BodyAnchors,
  layers: readonly PersonLayer[],
): readonly PlacedLayer[] {
  const slots = new Set(layers.map((layer) => layer.slot));
  const shown = (layer: PersonLayer) =>
    !(
      slots.has("dress") &&
      (layer.slot === "top" || layer.slot === "bottoms")
    ) &&
    !(
      slots.has("outfit") &&
      (layer.slot === "top" ||
        layer.slot === "bottoms" ||
        layer.slot === "shoes" ||
        layer.slot === "dress")
    );
  const tucking = layers.find(
    (layer) => layer.tucksTop && shown(layer),
  )?.tucksTop;
  return layers
    .filter(shown)
    .map((layer) => {
      const offset =
        HEAD_BOUND.has(layer.slot) && layer.authoredFor
          ? neckOffset(layer.authoredFor, body)
          : { dx: 0, dy: 0 };
      const raster =
        layer.slot === "head"
          ? featherBottomEdge(
              layer.raster,
              Math.round(layer.raster.height * HEAD_FEATHER_SHARE),
            )
          : layer.slot === "top" && tucking
            ? tuckInto(
                layer.tuckTail
                  ? composite(layer.raster.width, layer.raster.height, [
                      { slot: "top", raster: layer.tuckTail, dx: 0, dy: 0 },
                      { slot: "top", raster: layer.raster, dx: 0, dy: 0 },
                    ])
                  : layer.raster,
                tucking.waistline,
              )
            : layer.raster;
      // Trousers a shirt is tucked into are drawn right after the top.
      const rank = layer.tucksTop
        ? LAYER_ORDER.indexOf("top") + 0.5
        : LAYER_ORDER.indexOf(layer.slot);
      return { placed: { slot: layer.slot, raster, ...offset }, rank };
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ placed }) => placed);
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

const CLOTHING: ReadonlySet<LayerSlot> = new Set([
  "top",
  "dress",
  "outerwear",
  "outfit",
]);

/** The rows of a clothing layer that lie in the collar band, and nothing else. */
function collarBand(raster: Raster, fromRow: number, toRow: number): Raster {
  const data = new Uint8ClampedArray(raster.data.length);
  const start = Math.max(0, fromRow) * raster.width * 4;
  const end = Math.min(raster.height, toRow + 1) * raster.width * 4;
  data.set(raster.data.subarray(start, end), start);
  return { width: raster.width, height: raster.height, data };
}

/** The body with every pixel a garment hides made empty. */
function hideBody(raster: Raster, garments: readonly PersonLayer[]): Raster {
  const data = new Uint8ClampedArray(raster.data);
  for (const garment of garments) {
    const mask = garment.hidesBody!;
    for (let p = 0; p < mask.length; p += 1) if (mask[p]) data[p * 4 + 3] = 0;
  }
  return { width: raster.width, height: raster.height, data };
}

/**
 * The body with its own head removed, when a head layer is drawn over it.
 * Bodies are painted with heads of their own sizes (the fuller bodies' heads
 * are about a tenth bigger), but every face and hairstyle is drawn for the
 * canonical head. Left in place, the body's head shows around the face, as a
 * band of bare scalp above the hair. Only the head box above the neck row is
 * cleared, so a raised hand beside the head is kept.
 */
function withoutOwnHead(raster: Raster, body: BodyAnchors): Raster {
  const data = new Uint8ClampedArray(raster.data);
  const { left, right } = body.head;
  for (let y = 0; y < body.neck.row && y < raster.height; y += 1)
    for (
      let x = Math.max(0, left - HEAD_MARGIN);
      x <= Math.min(raster.width - 1, right + HEAD_MARGIN);
      x += 1
    )
      data[(y * raster.width + x) * 4 + 3] = 0;
  return { width: raster.width, height: raster.height, data };
}

/** Pixels of slack around the measured head box (anti-aliased edges). */
const HEAD_MARGIN = 2;

/**
 * Place and composite in one step, on the body's own canvas.
 *
 * The head is drawn above the clothes, so a collar can never cover a jaw.
 * But a collar and a tie sit in FRONT of the neck: in the band between the
 * measured neck row and the standard neckline, clothing is drawn once more on
 * top of the head. Above the neck row the head always wins.
 */
export function assemblePerson(
  body: BodyAnchors,
  layers: readonly PersonLayer[],
): Raster {
  const canvas = layers.find((layer) => layer.slot === "body")?.raster;
  if (!canvas) throw new Error("A person needs a body layer.");
  const drawn = placeLayers(
    body,
    layers.map((layer) =>
      CLOTHING.has(layer.slot) || layer.slot === "bottoms"
        ? {
            ...layer,
            raster: withoutWhiteMatte(layer.raster),
            ...(layer.tuckTail
              ? { tuckTail: withoutWhiteMatte(layer.tuckTail) }
              : {}),
          }
        : layer,
    ),
  );
  const kept = new Set(drawn.map((layer) => layer.slot));
  const hides = layers.filter(
    (layer) => layer.hidesBody && kept.has(layer.slot),
  );
  const ownHeadHidden = kept.has("head");
  const placed =
    hides.length === 0 && !ownHeadHidden
      ? drawn
      : drawn.map((layer) => {
          if (layer.slot !== "body") return layer;
          const hidden =
            hides.length === 0 ? layer.raster : hideBody(layer.raster, hides);
          return {
            ...layer,
            raster: ownHeadHidden ? withoutOwnHead(hidden, body) : hidden,
          };
        });
  const neckline =
    body.neck.row + Math.round((body.feet - body.top) * COLLAR_BAND_SHARE);
  const collars = placed
    .filter((layer) => CLOTHING.has(layer.slot))
    .map((layer) => ({
      ...layer,
      raster: collarBand(
        layer.raster,
        body.neck.row - layer.dy,
        neckline - layer.dy,
      ),
    }));
  return composite(canvas.width, canvas.height, [...placed, ...collars]);
}

/** The collar band reaches this share of the figure's height below the neck row. */
export const COLLAR_BAND_SHARE = 0.03;
