import { OPAQUE_ALPHA, type BodyAnchors } from "./anchors";
import { createRaster, luminance, type Raster } from "./raster";
import { isSkinPixel } from "./skin";

/**
 * GARMENT EXTRACTION: from "a shirt painted on a body" to a cloth-only layer.
 *
 * The art team paints each garment ON the exact bare body. The image
 * generator does not leave the rest of the figure alone: on the Sept. 27
 * crewnecks it repainted 10–17 percent of the lean and average bodies' skin
 * and 70–80 percent of the fuller body's. So the engine never subtracts. A
 * pixel becomes cloth only when it lies in the band this slot may cover
 * (below the neckline, outside the head box, above the underwear bottoms for
 * a top) and is not skin. Everything else comes from the unchanged canonical
 * body at assembly.
 */

export type GarmentSlot =
  | "top"
  | "bottoms"
  | "shoes"
  | "dress"
  | "outerwear"
  /** A whole outfit painted at once: everything from the collar to the soles. */
  | "outfit"
  /** Trousers and shoes painted together: from the waist to the soles. */
  | "legwear";

/**
 * The standard neckline sits this share of the figure's height below the
 * measured neck row: about 45 px on the 1024×1536 canvas.
 */
export const NECKLINE_SHARE = 0.03;

/** Neutral gray underwear as painted on the bare bodies. */
function isUnderwearGray(r: number, g: number, b: number, a: number): boolean {
  if (a <= OPAQUE_ALPHA) return false;
  const lum = luminance(r, g, b);
  return Math.max(r, g, b) - Math.min(r, g, b) < 14 && lum > 70 && lum < 190;
}

export interface BodyBands {
  readonly necklineRow: number;
  /** First row of the underwear bottoms: where a top's allowance ends. */
  readonly bottomsTopRow: number;
  /** Last row of the underwear bottoms. */
  readonly bottomsBottomRow: number;
}

/** Where the bare body's underwear bottoms are, measured from its pixels. */
export function measureBodyBands(
  bare: Raster,
  anchors: BodyAnchors,
): BodyBands {
  const figure = anchors.feet - anchors.top;
  const from = anchors.top + Math.round(figure * 0.4);
  const to = anchors.top + Math.round(figure * 0.7);
  let bottomsTopRow = -1;
  let bottomsBottomRow = -1;
  for (let y = from; y <= to; y += 1) {
    let gray = 0;
    for (let x = 0; x < bare.width; x += 1) {
      const i = (y * bare.width + x) * 4;
      if (
        isUnderwearGray(
          bare.data[i]!,
          bare.data[i + 1]!,
          bare.data[i + 2]!,
          bare.data[i + 3]!,
        )
      )
        gray += 1;
    }
    if (gray >= Math.max(8, Math.round(bare.width * 0.015))) {
      if (bottomsTopRow < 0) bottomsTopRow = y;
      bottomsBottomRow = y;
    }
  }
  if (bottomsTopRow < 0)
    throw new Error("No underwear bottoms found on the bare body.");
  return {
    necklineRow:
      anchors.neck.row +
      Math.round((anchors.feet - anchors.top) * NECKLINE_SHARE),
    bottomsTopRow,
    bottomsBottomRow,
  };
}

export interface ExtractedGarment {
  readonly layer: Raster;
  readonly clothPixels: number;
  /** Non-skin paint the rules refused (outside what this slot may cover). */
  readonly refusedPixels: number;
  /**
   * Body pixels this garment hides entirely (1 = hidden), or null. Full-length
   * trousers hide the bare legs below the underwear: a painted leg that
   * stands a few pixels wider than the bare leg must not leave a sliver of
   * skin beside it. Where the painting itself shows skin there (the top of a
   * foot in a pump), the body stays.
   */
  readonly hidesBody: Uint8Array | null;
  /**
   * For trousers: the top edge of the painted waistband per column (-1 where
   * there is none). The layer starts there, so it can be drawn over a
   * tucked-in shirt.
   */
  readonly waistline: Int32Array | null;
  /**
   * For tops: the painting's cloth on the hips just below the waist, which
   * the top layer leaves out because it may be the painting's own underwear.
   * A tucked shirt uses it down to the trousers' waistband, so a band that
   * sits low leaves no gap.
   */
  readonly tuckTail: Raster | null;
}

/** How far from empty background an outline pixel may be and still be the body's contour. */
const EDGE_REACH = 6;

/** Slots whose trousers run to the soles, so the bare legs never show. */
const HIDES_LEGS: ReadonlySet<GarmentSlot> = new Set(["legwear", "outfit"]);

/**
 * Per row, the columns that belong to the hips and legs rather than the arms.
 *
 * On all six Sept. 27 bodies the arms hang apart from the hips and thighs,
 * with a gap of 25 to 50 pixels, down to the fingertips. At the top of the
 * underwear bottoms a row has three runs of body pixels: an arm, the hips
 * (across the neck's center line) and an arm. Each arm is then followed down
 * row by row, as the runs that overlap it in the row above, until the
 * fingertips end; everything else is hips and legs, whichever way the legs
 * part. The legs' columns reach halfway across each gap. Trousers painted on
 * a gloved fitting suit keep their loose fit and lose the gloves.
 */
export function measureLegColumns(
  bare: Raster,
  anchors: BodyAnchors,
  fromRow: number,
): readonly (readonly [number, number])[] {
  const all = [0, bare.width - 1] as const;
  const columns: (readonly [number, number])[] = Array.from(
    { length: bare.height },
    () => all,
  );
  const runsAt = (y: number): [number, number][] => {
    const runs: [number, number][] = [];
    let start = -1;
    for (let x = 0; x <= bare.width; x += 1) {
      const opaque =
        x < bare.width &&
        bare.data[(y * bare.width + x) * 4 + 3]! > OPAQUE_ALPHA;
      if (opaque && start < 0) start = x;
      if (!opaque && start >= 0) {
        const last = runs[runs.length - 1];
        // Fingers and anti-aliasing split a hand into close runs: rejoin them.
        if (last && start - last[1] <= 4) last[1] = x - 1;
        else runs.push([start, x - 1]);
        start = -1;
      }
    }
    return runs;
  };
  const center = anchors.neck.centerX;
  const first = runsAt(fromRow);
  const hips = first.find(([a, b]) => a <= center && center <= b);
  if (!hips) return columns;
  let left: [number, number] | null =
    [...first].reverse().find(([, b]) => b < hips[0]) ?? null;
  let right: [number, number] | null = first.find(([a]) => a > hips[1]) ?? null;
  let trunk: [number, number] = hips;
  for (let y = fromRow; y < bare.height && (left || right); y += 1) {
    const runs = runsAt(y);
    const follow = (arm: [number, number] | null): [number, number] | null => {
      if (!arm) return null;
      const touching = runs.filter(
        ([a, b]) => b >= arm[0] - 2 && a <= arm[1] + 2,
      );
      if (touching.length === 0) return null;
      const next: [number, number] = [
        Math.min(...touching.map(([a]) => a)),
        Math.max(...touching.map(([, b]) => b)),
      ];
      // An arm that has met the hips can't be told apart from them: stop.
      return next[1] >= trunk[0] && next[0] <= trunk[1] ? null : next;
    };
    left = follow(left);
    right = follow(right);
    const legs = runs.filter(
      ([a, b]) =>
        !(left && a >= left[0] && b <= left[1]) &&
        !(right && a >= right[0] && b <= right[1]),
    );
    if (legs.length === 0) break;
    trunk = [legs[0]![0], legs[legs.length - 1]![1]];
    columns[y] = [
      left ? Math.floor((left[1] + trunk[0]) / 2) + 1 : 0,
      right ? Math.ceil((trunk[1] + right[0]) / 2) - 1 : bare.width - 1,
    ] as const;
  }
  return columns;
}

/** The most a waistband's top edge may move from one column to the next. */
const WAIST_STEP = 3;

/**
 * The top edge of a painted waistband, per column (-1 where there is none).
 *
 * A shirt is tucked in by drawing the trousers over it from their waistband
 * down, so the waistband must be found in the trouser painting. It is the
 * first ink line from above, in the rows around the top of the underwear
 * bottoms, that has a second ink line a band's width below it (the
 * waistband's lower edge). Vertical lines (a fly, a seam, belt loops) are
 * removed by a running median across the columns. Columns from the hips out
 * to the middle of the gap before each arm take the nearest hip value.
 */
export function measureWaistline(
  painting: Raster,
  bare: Raster,
  anchors: BodyAnchors,
  bands: BodyBands,
  legColumns: readonly (readonly [number, number])[],
): Int32Array {
  const { width } = painting;
  const figure = anchors.feet - anchors.top;
  const from = bands.bottomsTopRow - Math.round(figure * 0.055);
  const to = bands.bottomsTopRow + Math.round(figure * 0.02);
  const bandMin = Math.round(figure * 0.006);
  const bandMax = Math.round(figure * 0.028);
  const waist = new Int32Array(width).fill(-1);
  const row = bands.bottomsTopRow;
  let hipLeft = -1;
  let hipRight = -1;
  for (let x = Math.round(anchors.neck.centerX); x >= 0; x -= 1) {
    if (bare.data[(row * width + x) * 4 + 3]! <= OPAQUE_ALPHA) break;
    hipLeft = x;
  }
  for (let x = Math.round(anchors.neck.centerX); x < width; x += 1) {
    if (bare.data[(row * width + x) * 4 + 3]! <= OPAQUE_ALPHA) break;
    hipRight = x;
  }
  if (hipLeft < 0 || hipRight < 0) return waist;
  const margin = Math.max(4, Math.round(width * 0.012));
  const left = hipLeft + margin;
  const right = hipRight - margin;
  const values: number[] = [];
  for (let y = from; y <= to; y += 1)
    for (let x = left; x <= right; x += 1) {
      const i = (y * width + x) * 4;
      if (painting.data[i + 3]! > OPAQUE_ALPHA)
        values.push(
          luminance(
            painting.data[i]!,
            painting.data[i + 1]!,
            painting.data[i + 2]!,
          ),
        );
    }
  if (values.length === 0) return waist;
  values.sort((a, b) => a - b);
  const inkBelow = values[Math.floor(values.length / 2)]! * 0.55;
  const isInk = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return (
      painting.data[i + 3]! > OPAQUE_ALPHA &&
      luminance(
        painting.data[i]!,
        painting.data[i + 1]!,
        painting.data[i + 2]!,
      ) < inkBelow
    );
  };
  const raw = new Int32Array(width).fill(-1);
  for (let x = left; x <= right; x += 1) {
    const lines: [number, number][] = [];
    for (let y = from; y <= to; y += 1) {
      if (!isInk(x, y)) continue;
      const last = lines[lines.length - 1];
      if (last && y - last[1] <= 2) last[1] = y;
      else lines.push([y, y]);
    }
    const band = lines.find(([, end], k) =>
      lines
        .slice(k + 1)
        .some(([start]) => start - end >= bandMin && start - end <= bandMax),
    );
    raw[x] = (band ?? lines[0])?.[0] ?? -1;
  }
  const reach = Math.max(5, Math.round(width * 0.01));
  const smooth = new Int32Array(width).fill(-1);
  for (let x = left; x <= right; x += 1) {
    const near: number[] = [];
    for (
      let k = Math.max(left, x - reach);
      k <= Math.min(right, x + reach);
      k += 1
    )
      if (raw[k]! >= 0) near.push(raw[k]!);
    if (near.length === 0) continue;
    near.sort((a, b) => a - b);
    smooth[x] = near[Math.floor(near.length / 2)]!;
  }
  // A waistband is a smooth curve. Walk out from the middle; where the line
  // found jumps (a pocket top, a seam of the suit above), hold the last
  // height instead. Out to the middle of the gap before each arm, hold the
  // outermost height.
  const middle = Math.round((left + right) / 2);
  if (smooth[middle]! < 0) return waist;
  waist[middle] = smooth[middle]!;
  const [zoneLeft, zoneRight] = legColumns[row]!;
  for (const step of [-1, 1]) {
    let held = smooth[middle]!;
    const end =
      step < 0 ? Math.max(0, zoneLeft) : Math.min(width - 1, zoneRight);
    for (let x = middle + step; step < 0 ? x >= end : x <= end; x += step) {
      const found = x >= left && x <= right ? smooth[x]! : -1;
      if (found >= 0 && Math.abs(found - held) <= WAIST_STEP) held = found;
      waist[x] = held;
    }
  }
  return waist;
}

type Under = "skin" | "underwear" | "outline" | "background";

function underKind(r: number, g: number, b: number, a: number): Under {
  if (a <= OPAQUE_ALPHA) return "background";
  if (isSkinPixel(r, g, b, a)) return "skin";
  if (isUnderwearGray(r, g, b, a)) return "underwear";
  return "outline";
}

/**
 * The cloth-only layer for one slot.
 *
 * What the BARE body has at each pixel decides what the painting's non-skin
 * paint there may be:
 * - over bare skin: cloth (sleeves run down to the wrists at any height);
 * - over the bare underwear: cloth only where this slot covers it (a top
 *   covers the bra; the underwear bottoms stay, so a top ends where they begin);
 * - over an outline or empty background: cloth only inside the slot's band,
 *   which allows a loose fit without stray edges elsewhere.
 * The painting's own skin is never cloth; the unchanged body supplies it.
 */
export function extractGarment(
  onBody: Raster,
  bare: Raster,
  anchors: BodyAnchors,
  slot: GarmentSlot,
  hemAllowance = 40,
): ExtractedGarment {
  if (onBody.width !== bare.width || onBody.height !== bare.height)
    throw new Error("The painting and the bare body must share one canvas.");
  const bands = measureBodyBands(bare, anchors);
  const figure = anchors.feet - anchors.top;
  const shoeTop = anchors.feet - Math.round(figure * 0.08);
  const legTop = bands.bottomsTopRow - 10;
  const legColumns =
    slot === "outfit" || slot === "dress" || slot === "shoes"
      ? null
      : measureLegColumns(bare, anchors, legTop);
  const onLegs = (x: number, y: number): boolean => {
    const [left, right] = legColumns![y]!;
    return x >= left && x <= right;
  };
  const waistline =
    slot === "bottoms" || slot === "legwear"
      ? measureWaistline(onBody, bare, anchors, bands, legColumns!)
      : null;
  const legStart = (x: number): number =>
    waistline && waistline[x]! >= 0 ? waistline[x]! : legTop;
  /** Within a few pixels of empty background along the row: the body's contour. */
  const onEdge = (x: number, y: number): boolean => {
    for (let d = 1; d <= EDGE_REACH; d += 1) {
      for (const tx of [x - d, x + d]) {
        if (tx < 0 || tx >= bare.width) return true;
        if (bare.data[(y * bare.width + tx) * 4 + 3]! <= OPAQUE_ALPHA)
          return true;
      }
    }
    return false;
  };
  const covers = (under: Under, x: number, y: number): boolean => {
    switch (slot) {
      case "top":
      case "outerwear":
        if (y < bands.necklineRow) return false;
        if (y < bands.bottomsTopRow) return true;
        // Below the waist: sleeves and cuffs on the arms, down to the wrists.
        if (!onLegs(x, y))
          return under === "skin"
            ? y < shoeTop
            : y <= bands.bottomsTopRow + hemAllowance;
        // On the hips a hem may drape past the body's own edge, over empty
        // background. Paint on the body there, even on its outline, is the
        // painting's own underwear and its seams.
        return (
          under === "background" &&
          y <= bands.bottomsTopRow + hemAllowance &&
          onEdge(x, y)
        );
      case "dress":
        if (y < bands.necklineRow) return false;
        return under === "skin" || under === "underwear"
          ? y < shoeTop
          : y < shoeTop;
      case "bottoms":
        if (y < legStart(x) || !onLegs(x, y)) return false;
        return under === "background" || under === "outline"
          ? y < shoeTop
          : y < shoeTop + Math.round(figure * 0.03);
      case "shoes":
        return y >= shoeTop;
      case "legwear":
        return y >= legStart(x) && onLegs(x, y);
      case "outfit":
        // Collars and ties rise to the neck; everything below is the outfit.
        return y >= anchors.neck.row;
    }
  };
  const layer = createRaster(onBody.width, onBody.height);
  let clothPixels = 0;
  let refusedPixels = 0;
  const src = onBody.data;
  const under = bare.data;
  for (let y = 0; y < onBody.height; y += 1) {
    for (let x = 0; x < onBody.width; x += 1) {
      const i = (y * onBody.width + x) * 4;
      const a = src[i + 3]!;
      if (a <= OPAQUE_ALPHA) continue;
      if (isSkinPixel(src[i]!, src[i + 1]!, src[i + 2]!, a)) {
        // Skin the outfit leaves open where the bare body wears underwear (an
        // open collar over the bra line) must be skin, not underwear: keep it
        // so the assembly recolors it with the person's shade.
        const bareKind = underKind(
          under[i]!,
          under[i + 1]!,
          under[i + 2]!,
          under[i + 3]!,
        );
        if (
          slot !== "outfit" ||
          bareKind !== "underwear" ||
          y < anchors.neck.row
        )
          continue;
      }
      const inHead =
        y <= anchors.head.bottom &&
        x >= anchors.head.left &&
        x <= anchors.head.right;
      const kind = underKind(
        under[i]!,
        under[i + 1]!,
        under[i + 2]!,
        under[i + 3]!,
      );
      if (inHead || !covers(kind, x, y)) {
        refusedPixels += 1;
        continue;
      }
      layer.data[i] = src[i]!;
      layer.data[i + 1] = src[i + 1]!;
      layer.data[i + 2] = src[i + 2]!;
      layer.data[i + 3] = a;
      clothPixels += 1;
    }
  }
  let hidesBody: Uint8Array | null = null;
  if (HIDES_LEGS.has(slot)) {
    const columns = legColumns ?? measureLegColumns(bare, anchors, legTop);
    hidesBody = new Uint8Array(bare.width * bare.height);
    for (let y = bands.bottomsBottomRow + 1; y < bare.height; y += 1) {
      const [left, right] = columns[y]!;
      for (let x = left; x <= right; x += 1) {
        const i = (y * bare.width + x) * 4;
        if (!isSkinPixel(src[i]!, src[i + 1]!, src[i + 2]!, src[i + 3]!))
          hidesBody[y * bare.width + x] = 1;
      }
    }
  }
  let tuckTail: Raster | null = null;
  if (slot === "top") {
    tuckTail = createRaster(onBody.width, onBody.height);
    const to = Math.min(onBody.height - 1, bands.bottomsTopRow + hemAllowance);
    for (let y = bands.bottomsTopRow; y <= to; y += 1)
      for (let x = 0; x < onBody.width; x += 1) {
        const i = (y * onBody.width + x) * 4;
        if (
          layer.data[i + 3]! > 0 ||
          src[i + 3]! <= OPAQUE_ALPHA ||
          under[i + 3]! <= OPAQUE_ALPHA ||
          !onLegs(x, y) ||
          isSkinPixel(src[i]!, src[i + 1]!, src[i + 2]!, src[i + 3]!)
        )
          continue;
        tuckTail.data.set(src.subarray(i, i + 4), i);
      }
  }
  return {
    layer,
    clothPixels,
    refusedPixels,
    hidesBody,
    waistline,
    tuckTail,
  };
}
