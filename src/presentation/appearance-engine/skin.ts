import { luminance, mix, parseHex, type Raster, type Rgb } from "./raster";

/**
 * SKIN TONE BY CODE.
 *
 * One painted body covers every skin tone. The engine finds the skin pixels,
 * reads where each sits between the painting's own shadow, base and highlight,
 * and repaints it at the same position on the chosen tone's ramp. Shading,
 * outlines, underwear and anti-aliasing survive because only warm, saturated,
 * non-outline pixels are skin, and their light-to-dark position is kept.
 */

export interface SkinRamp {
  readonly id: string;
  /** For the creator's arrows; never a race or ethnicity label. */
  readonly label: string;
  readonly shadow: string;
  readonly base: string;
  readonly highlight: string;
}

/**
 * Seven shades, lightest to darkest (Lamontae: "six or seven shades, from
 * lightest to darkest"). Shades 1–6 were sampled from the art team's six-tone
 * skin reference sheet (forearm shading: 2–10th, 45–60th and 98.5–99.8th
 * luminance percentiles). PLACEHOLDER(wave2): shade 7 is shade 6 darkened by
 * 22 percent until it is painted.
 */
export const SKIN_RAMPS: readonly SkinRamp[] = [
  {
    id: "shade-1",
    label: "Shade 1",
    shadow: "#dca78b",
    base: "#fddabd",
    highlight: "#fee7ce",
  },
  {
    id: "shade-2",
    label: "Shade 2",
    shadow: "#cc8a61",
    base: "#f9c290",
    highlight: "#fdd2a1",
  },
  {
    id: "shade-3",
    label: "Shade 3",
    shadow: "#b06e48",
    base: "#e4a26d",
    highlight: "#f7b77d",
  },
  {
    id: "shade-4",
    label: "Shade 4",
    shadow: "#905130",
    base: "#c67f4f",
    highlight: "#dc945d",
  },
  {
    id: "shade-5",
    label: "Shade 5",
    shadow: "#5b2f1b",
    base: "#8e5332",
    highlight: "#a8653e",
  },
  {
    id: "shade-6",
    label: "Shade 6",
    shadow: "#4b2717",
    base: "#78452b",
    highlight: "#965634",
  },
  {
    id: "shade-7",
    label: "Shade 7",
    shadow: "#3a1e11",
    base: "#5d3521",
    highlight: "#754328",
  },
];

/** Warm, saturated and not an outline: the pixel is painted skin. */
export function isSkinPixel(
  r: number,
  g: number,
  b: number,
  a: number,
): boolean {
  if (a <= 16) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r >= g && g >= b && max - min > 18 && luminance(r, g, b) > 40;
}

export interface MeasuredRamp {
  readonly shadow: number;
  readonly base: number;
  readonly highlight: number;
}

/** The painting's own skin luminance at its shadow, base and highlight. */
export function measureSkinLuminance(raster: Raster): MeasuredRamp {
  const values: number[] = [];
  const { data } = raster;
  for (let i = 0; i < data.length; i += 4) {
    if (isSkinPixel(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) {
      values.push(luminance(data[i]!, data[i + 1]!, data[i + 2]!));
    }
  }
  if (values.length === 0) throw new Error("No skin pixels were found.");
  values.sort((a, b) => a - b);
  const at = (fraction: number) =>
    values[Math.min(values.length - 1, Math.floor(values.length * fraction))]!;
  return { shadow: at(0.06), base: at(0.5), highlight: at(0.995) };
}

function rampColor(ramp: SkinRamp, t: number): Rgb {
  const shadow = parseHex(ramp.shadow);
  const base = parseHex(ramp.base);
  const highlight = parseHex(ramp.highlight);
  if (t < 0) {
    const f = Math.max(0.2, 1 + t * 0.8);
    return { r: shadow.r * f, g: shadow.g * f, b: shadow.b * f };
  }
  if (t <= 0.5) return mix(shadow, base, t / 0.5);
  if (t <= 1) return mix(base, highlight, (t - 0.5) / 0.5);
  return mix(highlight, { r: 255, g: 255, b: 255 }, Math.min(1, (t - 1) * 0.5));
}

/** Where a luminance sits on the painting's ramp: 0 shadow, 0.5 base, 1 highlight. */
export function rampPosition(value: number, source: MeasuredRamp): number {
  if (value <= source.base) {
    const span = Math.max(1, source.base - source.shadow);
    return 0.5 * (1 - (source.base - value) / span);
  }
  const span = Math.max(1, source.highlight - source.base);
  return 0.5 + 0.5 * ((value - source.base) / span);
}

/** A copy of the layer with its skin repainted in the target shade. */
export function recolorSkin(
  raster: Raster,
  target: SkinRamp,
  source: MeasuredRamp = measureSkinLuminance(raster),
): Raster {
  const data = new Uint8ClampedArray(raster.data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (!isSkinPixel(r, g, b, data[i + 3]!)) continue;
    const color = rampColor(target, rampPosition(luminance(r, g, b), source));
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
  }
  return { width: raster.width, height: raster.height, data };
}
