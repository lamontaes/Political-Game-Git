// Skin and clothing colors for the people-engine figures. The v2 figures are
// painted in one skin tone and gray clothes, so a figure is recolored from two
// masks found in the picture itself: skin is the warm, saturated pixels and
// clothing the unsaturated mid-gray ones. Outlines, eyes and shadows are
// neither, so they never change. One recolor path serves the creator's preview
// and every room; a color is a record field the player or the world's people
// set, never something rolled at draw time.
import { PNG } from "pngjs";

export interface Swatch {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

/** Light to dark. "tan" is the tone the figures are painted in. */
export const SKIN_SWATCHES: readonly Swatch[] = [
  { id: "fair", label: "Fair", color: "#f6d3b8" },
  { id: "light", label: "Light", color: "#efbf98" },
  { id: "tan", label: "Tan", color: "#e09867" },
  { id: "olive", label: "Olive", color: "#c58a5a" },
  { id: "brown", label: "Brown", color: "#a06a44" },
  { id: "deep", label: "Deep brown", color: "#7a4b2f" },
  { id: "dark", label: "Dark", color: "#573420" },
  { id: "ebony", label: "Ebony", color: "#3e2517" },
];

/** "gray" is the clothing the figures are painted in. */
export const CLOTHES_SWATCHES: readonly Swatch[] = [
  { id: "gray", label: "Gray", color: "#9b9b9b" },
  { id: "navy", label: "Navy", color: "#34507e" },
  { id: "red", label: "Red", color: "#b0413e" },
  { id: "green", label: "Green", color: "#4f7f55" },
  { id: "mustard", label: "Mustard", color: "#c79a2e" },
  { id: "purple", label: "Purple", color: "#755a9c" },
  { id: "teal", label: "Teal", color: "#3f8c93" },
  { id: "brown", label: "Brown", color: "#7b5a3f" },
  { id: "black", label: "Black", color: "#3a3a40" },
  { id: "white", label: "White", color: "#e6e6e1" },
];

export const DEFAULT_SKIN = "tan";
export const DEFAULT_CLOTHES = "gray";

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const find = (list: readonly Swatch[], id: string): Swatch | undefined =>
  list.find((row) => row.id === id);
export const skinSwatch = (id: string) => find(SKIN_SWATCHES, id);
export const clothesSwatch = (id: string) => find(CLOTHES_SWATCHES, id);

type Region = "skin" | "clothes" | "other";
function regionOf(r: number, g: number, b: number): Region {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (
    sat > 0.25 &&
    r >= g &&
    g >= b &&
    max > 128 &&
    (g - b) / (r - b || 1) > 0.25
  )
    return "skin";
  if (sat < 0.12 && lum > 60 && lum < 235) return "clothes";
  return "other";
}

/** The picture's own mean luminance in each region, so a swatch keeps the painted shading. */
function means(png: PNG) {
  const sum = { skin: 0, clothes: 0, other: 0 };
  const count = { skin: 0, clothes: 0, other: 0 };
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3]! < 200) continue;
    const r = png.data[i]!;
    const g = png.data[i + 1]!;
    const b = png.data[i + 2]!;
    const region = regionOf(r, g, b);
    sum[region] += 0.299 * r + 0.587 * g + 0.114 * b;
    count[region]++;
  }
  return {
    skin: sum.skin / Math.max(1, count.skin),
    clothes: sum.clothes / Math.max(1, count.clothes),
  };
}

/** The figure's masks recolored: pixels outside the skin and clothing masks are returned unchanged. */
export function recolorFigure(
  source: Buffer,
  skinId: string = DEFAULT_SKIN,
  clothesId: string = DEFAULT_CLOTHES,
): Buffer {
  const skin = skinSwatch(skinId);
  const clothes = clothesSwatch(clothesId);
  if (!skin || !clothes) throw new Error("No such color.");
  if (skin.id === DEFAULT_SKIN && clothes.id === DEFAULT_CLOTHES) return source;
  const png = PNG.sync.read(source);
  const mean = means(png);
  const skinTo = rgb(skin.color);
  const clothesTo = rgb(clothes.color);
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3]! < 200) continue;
    const r = png.data[i]!;
    const g = png.data[i + 1]!;
    const b = png.data[i + 2]!;
    const region = regionOf(r, g, b);
    if (region === "other") continue;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (region === "skin" && skin.id === DEFAULT_SKIN) continue;
    if (region === "clothes" && clothes.id === DEFAULT_CLOTHES) continue;
    const [to, base0] =
      region === "skin" ? [skinTo, mean.skin] : [clothesTo, mean.clothes];
    // Shading: the pixel's brightness against the region's mean, applied to the swatch.
    const shade = lum / base0;
    for (let c = 0; c < 3; c++)
      png.data[i + c] = Math.max(0, Math.min(255, Math.round(to[c]! * shade)));
  }
  return PNG.sync.write(png);
}
