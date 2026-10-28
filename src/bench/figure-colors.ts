// Skin and clothing colors for the people-engine figures. The v2 figures are
// painted in one skin tone and gray clothes. Each piece of clothing (jacket or
// vest, shirt, pants, shoes) has its own color, read from the figure's garment
// map (art/people-engine/v2/garments, painted by the art session: only pixels
// that were clothing are marked, so eyes, skin and hair never change). Skin is
// the warm, saturated pixels. One recolor path serves the creator's preview
// and every room; a color is a record field the player or the world's people
// set, never something rolled at draw time.
import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import heads from "./data/figure-heads.json" with { type: "json" };
import figures from "../../art/people-engine/v2/index.json" with { type: "json" };

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

/** The pieces of clothing a figure's garment map marks, in its colors. */
export const GARMENTS = ["jacket", "shirt", "pants", "shoes"] as const;
export type Garment = (typeof GARMENTS)[number];
const MAP_COLORS: Readonly<Record<Garment, readonly [number, number, number]>> =
  {
    jacket: [255, 0, 0],
    shirt: [255, 255, 0],
    pants: [0, 0, 255],
    shoes: [0, 255, 0],
  };

/**
 * The colors each piece comes in (presentation, TUNABLE by eye): any color
 * for a jacket or shirt; pants and shoes in the colors they are usually sold in.
 */
export const GARMENT_SWATCHES: Readonly<Record<Garment, readonly Swatch[]>> = {
  jacket: CLOTHES_SWATCHES,
  shirt: CLOTHES_SWATCHES,
  pants: CLOTHES_SWATCHES.filter((row) =>
    ["gray", "navy", "black", "brown", "green", "white"].includes(row.id),
  ),
  shoes: CLOTHES_SWATCHES.filter((row) =>
    ["gray", "black", "brown", "white"].includes(row.id),
  ),
};

/** A person's colors: their skin, and each piece of clothing; a piece left out keeps its painted gray. */
export type FigureColors = {
  skin?: string;
  /** A hair style's number (figure-hair.ts); bald where absent. */
  hair?: string;
  /** A hair swatch id. */
  hairColor?: string;
  /** A face's number (figure-hair.ts); the painted bald face where absent. */
  face?: string;
} & Partial<Record<Garment, string>>;

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
/**
 * Skin is found from the picture's own colors (warm and saturated). Clothing
 * is read from the figure's garment map; a figure the art session has not
 * mapped yet falls back to the unsaturated mid-gray pixels below its head.
 * stopgapId: SG-PLAY-figure-color-masks-from-picture
 */
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

/**
 * How much a pixel of a figure with no map yet reads as gray cloth, 0 to 1:
 * fully below 0.12 saturation, fading out by 0.22, and inside the cloth's
 * brightness with a soft edge, so lightly tinted folds (the heavy blazers'
 * pants) recolor instead of staying as gray patches.
 */
function clothShare(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const ramp = (value: number, from: number, to: number) =>
    Math.max(0, Math.min(1, (value - from) / (to - from)));
  return (
    (1 - ramp(sat, 0.12, 0.22)) * ramp(lum, 45, 60) * (1 - ramp(lum, 235, 250))
  );
}

// Where pieces meet on a figure with no map yet (presentation, TUNABLE by
// eye): the hip at this share of the height to the feet, and the shoes in
// this share of the picture above the foot line.
const HIP = 0.5;
const FEET = 0.06;
const ROWS = new Map(
  (
    figures.figures as {
      file: string;
      outfit: string;
      footY: number;
      seatY?: number;
    }[]
  ).map((row) => [
    row.file
      .split("/")
      .pop()!
      .replace(/\.png$/, ""),
    row,
  ]),
);

/** Where a figure's garment map is: beside a pose painted at furniture (art/people-rooms/poses), else in the set's garments folder. */
const garmentFile = (name: string) =>
  new URL(
    name.startsWith("pose-")
      ? `../../art/people-rooms/poses/${name}-garments.png`
      : `../../art/people-engine/v2/garments/${name}-garments.png`,
    import.meta.url,
  );

const maps = new Map<string, PNG | null>();
/** The figure's garment map, or null where the art session has not painted one yet. */
function garmentMap(name: string): PNG | null {
  if (!maps.has(name)) {
    const file = garmentFile(name);
    maps.set(name, existsSync(file) ? PNG.sync.read(readFileSync(file)) : null);
  }
  return maps.get(name)!;
}

/** Whether the art session has painted a garment map for this figure file (`figures/v2-…png`). */
export function hasGarmentMap(file: string): boolean {
  return existsSync(
    garmentFile(
      file
        .split("/")
        .pop()!
        .replace(/\.png$/, ""),
    ),
  );
}

function garmentAt(map: PNG, i: number): Garment | null {
  const [r, g, b] = [map.data[i]!, map.data[i + 1]!, map.data[i + 2]!];
  for (const garment of GARMENTS) {
    const [mr, mg, mb] = MAP_COLORS[garment];
    if (
      Math.abs(r - mr) + Math.abs(g - mg) + Math.abs(b - mb) < 60 &&
      map.data[i + 3]! > 0
    )
      return garment;
  }
  return null;
}

const luminance = (data: Uint8Array, i: number) =>
  0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
const median = (values: number[]) =>
  values.length ? values.sort((a, b) => a - b)[values.length >> 1]! : 1;

/**
 * The figure recolored: skin to the skin swatch, each piece of clothing to its
 * own swatch with the painted folds kept (color times the pixel's luminance
 * over the piece's median). Everything else is returned unchanged.
 */
export function recolorFigure(
  source: Buffer,
  /** The figure's name in the set (`v2-01-m-medium`), to find its garment map. */
  name: string,
  colors: FigureColors = {},
): Buffer {
  const skin = skinSwatch(colors.skin ?? DEFAULT_SKIN);
  if (!skin) throw new Error("No such color.");
  const wanted = new Map<Garment, [number, number, number]>();
  for (const garment of GARMENTS) {
    const id = colors[garment];
    if (!id || id === DEFAULT_CLOTHES) continue;
    const swatch = clothesSwatch(id);
    if (!swatch) throw new Error("No such color.");
    wanted.set(garment, rgb(swatch.color));
  }
  if (skin.id === DEFAULT_SKIN && !wanted.size) return source;
  const png = PNG.sync.read(source);
  const map = garmentMap(name);
  // Without a map: the gray cloth below the head, split by height on the
  // body: the feet are the shoes, below the hip the pants, above it the shirt;
  // with a vest or blazer, a suit in the jacket's color down to the shoes.
  const head = (heads.heads as Record<string, number[]>)[name];
  const row = ROWS.get(name);
  const below = head ? head[0]! + head[2]! * 1.3 : 0;
  const foot = row?.footY ?? png.height;
  const hip = row?.seatY ?? foot * HIP;
  const feet = foot - png.height * FEET;
  const top: Garment =
    row && (row.outfit === "vest" || row.outfit === "blazer")
      ? "jacket"
      : "shirt";
  // How much of the new color each pixel takes: all of it on a map.
  const weights = new Float32Array(png.width * png.height).fill(1);
  const pieceOf = (i: number): Garment | null => {
    // No clothing color on the head, whatever a map marks there (eyes).
    const y = Math.floor(i / 4 / png.width);
    if (y < below) return null;
    if (map) return garmentAt(map, i);
    const share = clothShare(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!);
    if (
      share <= 0 ||
      regionOf(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!) === "skin"
    )
      return null;
    weights[i / 4] = share;
    // A jacket's hem has no line to cut at: jacket and pants are one suit.
    return y >= feet ? "shoes" : top === "jacket" || y < hip ? top : "pants";
  };
  // Each piece's own median luminance, and the skin's.
  const lums = new Map<Garment | "skin", number[]>();
  const pieces = new Array<Garment | "skin" | null>(png.width * png.height);
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3]! < 200) continue;
    const piece =
      pieceOf(i) ??
      (regionOf(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!) === "skin"
        ? "skin"
        : null);
    if (!piece) continue;
    pieces[i / 4] = piece;
    if (!lums.has(piece)) lums.set(piece, []);
    lums.get(piece)!.push(luminance(png.data, i));
  }
  const mid = new Map([...lums].map(([piece, list]) => [piece, median(list)]));
  const skinTo = skin.id === DEFAULT_SKIN ? null : rgb(skin.color);
  for (let i = 0; i < png.data.length; i += 4) {
    const piece = pieces[i / 4];
    if (!piece) continue;
    const to = piece === "skin" ? skinTo : wanted.get(piece);
    if (!to) continue;
    const shade = luminance(png.data, i) / mid.get(piece)!;
    const weight = piece === "skin" ? 1 : weights[i / 4]!;
    for (let c = 0; c < 3; c++) {
      const color = Math.max(0, Math.min(255, to[c]! * shade));
      png.data[i + c] = Math.round(
        color * weight + png.data[i + c]! * (1 - weight),
      );
    }
  }
  return PNG.sync.write(png);
}
