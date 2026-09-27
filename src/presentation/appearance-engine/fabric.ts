import { OPAQUE_ALPHA } from "./anchors";
import { luminance, mix, parseHex, type Raster, type Rgb } from "./raster";

/**
 * GARMENT COLOR BY CODE.
 *
 * Garments are painted in gray. The engine reads where each cloth pixel sits
 * between the painting's own shadow, base and highlight and repaints it at
 * the same place on the chosen fabric ramp, so one painted pair of trousers
 * comes in navy, charcoal or black. Pixels darker than the cloth's shadow are
 * ink lines and fold creases: they keep the painting's own dark value, so the
 * drawing survives on a white shirt as well as a navy suit.
 */

export interface FabricRamp {
  readonly id: string;
  readonly shadow: string;
  readonly base: string;
  readonly highlight: string;
}

/**
 * The first fabric colors. PLACEHOLDER(wave2): picked by eye for the first
 * two outfits (Lamontae, Sept. 27: a formal and a non-formal outfit); the art
 * team's approved palette replaces them.
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
];

export function fabricRamp(id: string): FabricRamp {
  const ramp = FABRIC_RAMPS.find((candidate) => candidate.id === id);
  if (!ramp) throw new Error(`Unknown fabric color: ${id}`);
  return ramp;
}

export interface MeasuredFabric {
  readonly shadow: number;
  readonly base: number;
  readonly highlight: number;
}

/**
 * The cloth's own shadow, base and highlight. The low end is taken above the
 * darkest tenth, which is mostly ink, so the outlines do not set the shadow.
 */
export function measureFabricLuminance(layer: Raster): MeasuredFabric {
  const values: number[] = [];
  const { data } = layer;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! <= OPAQUE_ALPHA) continue;
    values.push(luminance(data[i]!, data[i + 1]!, data[i + 2]!));
  }
  if (values.length === 0) throw new Error("The garment layer is empty.");
  values.sort((a, b) => a - b);
  const at = (fraction: number) =>
    values[Math.min(values.length - 1, Math.floor(values.length * fraction))]!;
  const shadow = at(0.15);
  const base = at(0.55);
  const highlight = Math.max(
    at(0.98),
    base + Math.max(10, (base - shadow) * 0.5),
  );
  return { shadow, base, highlight };
}

function darker(a: Rgb, b: Rgb): Rgb {
  return luminance(a.r, a.g, a.b) <= luminance(b.r, b.g, b.b) ? a : b;
}

/** A copy of a gray garment layer in the chosen fabric color. */
export function recolorFabric(
  layer: Raster,
  target: FabricRamp,
  source: MeasuredFabric = measureFabricLuminance(layer),
): Raster {
  const shadow = parseHex(target.shadow);
  const base = parseHex(target.base);
  const highlight = parseHex(target.highlight);
  const ink: Rgb = {
    r: shadow.r * 0.55,
    g: shadow.g * 0.55,
    b: shadow.b * 0.55,
  };
  const data = new Uint8ClampedArray(layer.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! === 0) continue;
    const own: Rgb = { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! };
    const value = luminance(own.r, own.g, own.b);
    let color: Rgb;
    if (value >= source.base) {
      const span = Math.max(1, source.highlight - source.base);
      color = mix(base, highlight, Math.min(1, (value - source.base) / span));
    } else if (value >= source.shadow) {
      const span = Math.max(1, source.base - source.shadow);
      color = mix(shadow, base, (value - source.shadow) / span);
    } else {
      // Ink and creases: from the fabric's shadow toward a dark line that is
      // never lighter than the painting's own.
      const depth = Math.min(
        1,
        (source.shadow - value) / Math.max(1, source.shadow * 0.5),
      );
      color = mix(shadow, darker(own, ink), depth);
    }
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
  }
  return { width: layer.width, height: layer.height, data };
}
