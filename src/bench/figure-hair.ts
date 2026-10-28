// Hair on the bald v2 figures. The art session painted hair pieces onto the
// figures' own heads (art/people-engine/v2/hair-on-figures: front, three-quarter
// and back views, one piece per style on a few figures, each in its figure's
// own pixel frame, plain gray). A piece goes on any figure seen from the same
// angle: scaled by the two heads' widths and lined up on head top and middle
// (src/bench/data/figure-heads.json), mirrored where the figure is painted
// facing the other way, and colored from the person's record by luminance,
// keeping the painted strands. One path serves the creator's preview and
// every room, laid over the figure in its own frame.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import index from "../../art/people-engine/v2/hair-on-figures/index.json" with { type: "json" };
import heads from "./data/figure-heads.json" with { type: "json" };
import figures from "../../art/people-engine/v2/index.json" with { type: "json" };
import { recolorFigure, type FigureColors, type Swatch } from "./figure-colors";

/** Light to dark, then gray and white (presentation, TUNABLE by eye). */
export const HAIR_SWATCHES: readonly Swatch[] = [
  { id: "blonde", label: "Blonde", color: "#c9a35f" },
  { id: "strawberry", label: "Strawberry blonde", color: "#b9744a" },
  { id: "auburn", label: "Auburn", color: "#8a3f24" },
  { id: "light-brown", label: "Light brown", color: "#8a6440" },
  { id: "brown", label: "Brown", color: "#5c3f2a" },
  { id: "dark-brown", label: "Dark brown", color: "#3b2a20" },
  { id: "black", label: "Black", color: "#1f1b1a" },
  { id: "gray", label: "Gray", color: "#8f8e8b" },
  { id: "white", label: "White", color: "#dddcd6" },
];
export const hairSwatch = (id: string) =>
  HAIR_SWATCHES.find((row) => row.id === id);

interface Piece {
  view: "front" | "threeq" | "back";
  style: number;
  sex: string;
  styleName: string;
  figure: string;
  file: string;
  head: [number, number, number];
  facing: "left" | "right" | null;
}
const PIECES = index.pieces as unknown as readonly Piece[];
const STYLES = index.styles as unknown as Readonly<Record<string, string[]>>;
const HEADS = heads.heads as unknown as Readonly<
  Record<string, readonly [number, number, number]>
>;

/** The styles painted for a sex: every style with a front and a three-quarter piece, by number. */
export function hairStyles(sex: string): { style: number; name: string }[] {
  const has = (view: Piece["view"], style: number) =>
    PIECES.some((p) => p.sex === sex && p.view === view && p.style === style);
  return (STYLES[sex] ?? [])
    .map((name, i) => ({ style: i + 1, name }))
    .filter(({ style }) => has("front", style) && has("threeq", style));
}

const viewOf = (angle: string): Piece["view"] =>
  angle === "back" ? "back" : angle === "three-quarter" ? "threeq" : "front";

/**
 * The piece for this figure: the style painted at this angle, on this figure
 * where there is one, else on another of the same sex. A style the set has
 * not yet painted from behind takes the back piece of the nearest-numbered
 * painted style.
 * stopgapId: SG-PLAY-hair-back-view-nearest-style
 */
function pieceFor(
  figure: string,
  sex: string,
  angle: string,
  style: number,
): Piece | undefined {
  const view = viewOf(angle);
  const painted = PIECES.filter((p) => p.sex === sex && p.view === view);
  const styles = [...new Set(painted.map((p) => p.style))].sort(
    (a, b) => Math.abs(a - style) - Math.abs(b - style) || a - b,
  );
  const chosen = styles[0];
  if (chosen === undefined) return undefined;
  const same = painted.filter((p) => p.style === chosen);
  return same.find((p) => p.figure === figure) ?? same[0];
}

const pieces = new Map<string, PNG>();
function pieceImage(piece: Piece): PNG {
  let png = pieces.get(piece.file);
  if (!png) {
    png = PNG.sync.read(
      readFileSync(
        new URL(
          `../../art/people-engine/v2/hair-on-figures/${piece.file.slice("hair-on-figures/".length)}`,
          import.meta.url,
        ),
      ),
    );
    pieces.set(piece.file, png);
  }
  return png;
}

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Who the hair belongs to: the figure drawn, and the person's hair on record. */
export interface HairOn {
  /** The figure's name in the set (`v2-01-m-medium`). */
  figure: string;
  sex: string;
  angle: string;
  /** Which way the figure is painted facing (three-quarter figures). */
  facing: string;
  style: number;
  color: string;
}

/** The figure with the person's hair laid on, in the figure's own frame. */
export function withHair(figurePng: Buffer, hair: HairOn): Buffer {
  const piece = pieceFor(hair.figure, hair.sex, hair.angle, hair.style);
  const head = HEADS[hair.figure];
  const swatch = hairSwatch(hair.color);
  if (!piece || !head || !swatch) return figurePng;
  const figure = PNG.sync.read(figurePng);
  const src = pieceImage(piece);
  // Three-quarter pieces are painted facing left: a figure facing right
  // takes the piece mirrored.
  const mirror =
    piece.view === "threeq" &&
    hair.facing !== (piece.facing ?? "left") &&
    (hair.facing === "left" || hair.facing === "right");
  const [pieceTop, pieceMiddle0, pieceWidth] = piece.head;
  const pieceMiddle = mirror ? src.width - 1 - pieceMiddle0 : pieceMiddle0;
  const [top, middle, width] = head;
  const scale = width / pieceWidth;
  // The hair's own median luminance, so the swatch keeps the painted strands.
  const lums: number[] = [];
  for (let i = 0; i < src.data.length; i += 4)
    if (src.data[i + 3]! > 128)
      lums.push(
        0.299 * src.data[i]! +
          0.587 * src.data[i + 1]! +
          0.114 * src.data[i + 2]!,
      );
  lums.sort((a, b) => a - b);
  const mid = lums[lums.length >> 1] ?? 128;
  const to = rgb(swatch.color);
  const sample = (x: number, y: number, c: number) => {
    // Bilinear, in the piece's own pixels.
    const x0 = Math.floor(x),
      y0 = Math.floor(y);
    let sum = 0,
      weight = 0;
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const sx = x0 + dx,
        sy = y0 + dy;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const w = (1 - Math.abs(x - sx)) * (1 - Math.abs(y - sy));
      const px = mirror ? src.width - 1 - sx : sx;
      sum += src.data[(sy * src.width + px) * 4 + c]! * w;
      weight += w;
    }
    return weight ? sum / weight : 0;
  };
  for (let fy = 0; fy < figure.height; fy++)
    for (let fx = 0; fx < figure.width; fx++) {
      const px = pieceMiddle + (fx - middle) / scale;
      const py = pieceTop + (fy - top) / scale;
      if (px < 0 || py < 0 || px > src.width - 1 || py > src.height - 1)
        continue;
      const alpha = sample(px, py, 3) / 255;
      if (alpha < 0.02) continue;
      const lum =
        0.299 * sample(px, py, 0) +
        0.587 * sample(px, py, 1) +
        0.114 * sample(px, py, 2);
      const shade = lum / mid;
      const o = (fy * figure.width + fx) * 4;
      for (let c = 0; c < 3; c++) {
        const hairValue = Math.max(0, Math.min(255, to[c]! * shade));
        figure.data[o + c] = Math.round(
          hairValue * alpha + figure.data[o + c]! * (1 - alpha),
        );
      }
      figure.data[o + 3] = Math.max(
        figure.data[o + 3]!,
        Math.round(alpha * 255),
      );
    }
  return PNG.sync.write(figure);
}

const ROWS = new Map(
  (
    figures.figures as {
      file: string;
      sex: string;
      angle: string;
      facing: string;
    }[]
  ).map((row) => [
    row.file
      .split("/")
      .pop()!
      .replace(/\.png$/, ""),
    row,
  ]),
);

/**
 * A figure as the game draws a person: their skin and clothing colors, and
 * their hair. The one drawing path for rooms (the play server's figure
 * route), the creator's preview and the screenshot tools.
 */
export function drawnFigure(name: string, colors: FigureColors): Buffer {
  const row = ROWS.get(name);
  if (!row) throw new Error("No such figure.");
  const colored = recolorFigure(
    readFileSync(
      new URL(
        `../../art/people-engine/v2/figures/${name}.png`,
        import.meta.url,
      ),
    ),
    name,
    colors,
  );
  const style = Number(colors.hair);
  return style && colors.hairColor
    ? withHair(colored, {
        figure: name,
        sex: row.sex,
        angle: row.angle,
        facing: row.facing,
        style,
        color: colors.hairColor,
      })
    : colored;
}
