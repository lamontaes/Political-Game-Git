import { OPAQUE_ALPHA } from "./anchors";
import { luminance, mix, parseHex, type Raster, type Rgb } from "./raster";

/**
 * GARMENT COLOR BY CODE.
 *
 * Garments are painted in gray. The engine keeps the painting's own light and
 * shade and changes only the color: each cloth pixel's brightness relative to
 * the cloth's base gray is applied to the chosen fabric's base color, so a
 * fold that is 13 percent darker in the painting is 13 percent darker in navy
 * or white. Stretching the painted shading across a color's full ramp made
 * soft chest folds read as breasts on the Sept. 27 men's crewnecks, so the
 * contrast is never increased. Pixels far darker than the cloth are ink lines:
 * they keep a dark line on any color, so the drawing survives on a white shirt
 * as well as a navy suit.
 */

export interface FabricRamp {
  readonly id: string;
  readonly shadow: string;
  readonly base: string;
  readonly highlight: string;
}

/**
 * These are the recorded fabric colors, selected by eye for the first two
 * outfits (Lamontae, September 27: a formal and a non-formal outfit). The art
 * team's approved palette may replace them.
 */
export const FABRIC_RAMPS: readonly FabricRamp[] = [
  { id: "navy", shadow: "#141c33", base: "#253459", highlight: "#34467a" },
  { id: "charcoal", shadow: "#23252a", base: "#3c3f46", highlight: "#50545d" },
  { id: "gray", shadow: "#5a5d63", base: "#80848b", highlight: "#9ca0a7" },
  { id: "black", shadow: "#0f1013", base: "#1e2025", highlight: "#2e3138" },
  { id: "white", shadow: "#b9bdc6", base: "#e9ebef", highlight: "#f8f9fb" },
  {
    id: "light-blue",
    shadow: "#7f9cc0",
    base: "#a9c3e2",
    highlight: "#c2d6ee",
  },
  { id: "burgundy", shadow: "#3e1119", base: "#6a1f2c", highlight: "#842b3a" },
  { id: "forest", shadow: "#16291f", base: "#274634", highlight: "#355d46" },
  {
    id: "slate-blue",
    shadow: "#2c3a4d",
    base: "#475b76",
    highlight: "#5c7392",
  },
  { id: "teal", shadow: "#123b3f", base: "#1f5f66", highlight: "#2d7881" },
  { id: "plum", shadow: "#321827", base: "#5a2d4f", highlight: "#743d66" },
  { id: "mustard", shadow: "#6e4f12", base: "#b88a2a", highlight: "#d1a444" },
  { id: "cream", shadow: "#b3a88f", base: "#e8dfc9", highlight: "#f6f0e2" },
  { id: "pink", shadow: "#a8737d", base: "#d9a3ad", highlight: "#ebbfc7" },
  { id: "olive", shadow: "#383c1d", base: "#5e6433", highlight: "#787f45" },
  { id: "brown", shadow: "#33221a", base: "#5a3d2b", highlight: "#76523b" },
  { id: "khaki", shadow: "#7b6a48", base: "#b59d72", highlight: "#cbb68d" },
  { id: "denim", shadow: "#23364b", base: "#3b5877", highlight: "#4f7094" },
];

export function fabricRamp(id: string): FabricRamp {
  const ramp = FABRIC_RAMPS.find((candidate) => candidate.id === id);
  if (!ramp) throw new Error(`Unknown fabric color: ${id}`);
  return ramp;
}

export interface MeasuredFabric {
  /** The cloth's own base gray: the median of its pixels. */
  readonly base: number;
}

/** Below this share of the cloth's base brightness a pixel is an ink line. */
export const INK_SHARE = 0.55;

export function measureFabricLuminance(layer: Raster): MeasuredFabric {
  const values: number[] = [];
  const { data } = layer;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! <= OPAQUE_ALPHA) continue;
    values.push(luminance(data[i]!, data[i + 1]!, data[i + 2]!));
  }
  if (values.length === 0) return { base: 128 };
  values.sort((a, b) => a - b);
  return { base: values[Math.floor(values.length / 2)]! };
}

function darker(a: Rgb, b: Rgb): Rgb {
  return luminance(a.r, a.g, a.b) <= luminance(b.r, b.g, b.b) ? a : b;
}

const scale = (color: Rgb, factor: number): Rgb => ({
  r: color.r * factor,
  g: color.g * factor,
  b: color.b * factor,
});

/** A copy of a gray garment layer in the chosen fabric color. */
export function recolorFabric(
  layer: Raster,
  target: FabricRamp,
  source: MeasuredFabric = measureFabricLuminance(layer),
  /**
   * How much of the painting's fold shading to keep: 1 keeps it all, lower
   * flattens it. Ink lines are never flattened. A garment whose painted folds
   * give the wrong shape (curved chest shading on a man's shirt) lowers it.
   */
  shading = 1,
): Raster {
  const shadow = parseHex(target.shadow);
  const base = parseHex(target.base);
  const highlight = parseHex(target.highlight);
  const baseValue = luminance(base.r, base.g, base.b);
  const ink = scale(shadow, 0.55);
  const inkBelow = source.base * INK_SHARE;
  const data = new Uint8ClampedArray(layer.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! === 0) continue;
    const own: Rgb = { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! };
    const value = luminance(own.r, own.g, own.b);
    const painted = value / Math.max(1, source.base);
    const ratio = value >= inkBelow ? 1 - (1 - painted) * shading : painted;
    let color: Rgb;
    if (ratio >= 1) {
      // Lighter than the base: toward the fabric's highlight, as painted.
      const room =
        luminance(highlight.r, highlight.g, highlight.b) / baseValue - 1;
      color = mix(
        base,
        highlight,
        Math.min(1, (ratio - 1) / Math.max(0.05, room)),
      );
    } else if (value >= inkBelow) {
      // Shade: exactly the painting's relative darkening, in the new color.
      color = scale(base, ratio);
    } else {
      // Ink: a dark line never lighter than the painting's own.
      const depth = Math.min(
        1,
        (inkBelow - value) / Math.max(1, inkBelow * 0.5),
      );
      color = mix(scale(base, INK_SHARE), darker(own, ink), depth);
    }
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
  }
  return { width: layer.width, height: layer.height, data };
}
