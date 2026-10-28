// Faces and hair on the bald v2 figures. The art session painted them onto the
// figures' own heads (art/people-engine/v2/faces-on-figures and
// hair-on-figures: front, both three-quarter views and, for hair, the back;
// each piece in its figure's own pixel frame). A piece goes on any figure seen
// from the same angle: scaled by the two heads' widths and lined up on head
// top and middle (src/bench/data/figure-heads.json), mirrored only where the
// other three-quarter view is not painted yet. A face goes on first, so the
// skin recolor reaches it; its gray beard takes the hair color; the hair goes
// on last, colored by luminance so the painted strands stay. One path serves
// the creator's preview and every room.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import index from "../../art/people-engine/v2/hair-on-figures/index.json" with { type: "json" };
import faceIndex from "../../art/people-engine/v2/faces-on-figures/index.json" with { type: "json" };
import heads from "./data/figure-heads.json" with { type: "json" };
import figures from "../../art/people-engine/v2/index.json" with { type: "json" };
import poses from "../../art/people-rooms/poses/index.json" with { type: "json" };
import backs from "../../art/people-engine/v2/figures-back.json" with { type: "json" };
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

/** Painted views: front, three-quarter left and right, back, and for heads turned away, profile (prof) and three-quarter from behind (tqb). */
type View = "front" | "threeq" | "threeqr" | "back" | "prof" | "tqb";
interface Piece {
  view: View;
  sex: string;
  figure: string;
  file: string;
}
interface HairPiece extends Piece {
  style: number;
  styleName: string;
}
interface FacePiece extends Piece {
  face: number;
  faceName: string;
  expression: string;
}
const PIECES = index.pieces as unknown as readonly HairPiece[];
const FACES = faceIndex.pieces as unknown as readonly FacePiece[];
const STYLES = index.styles as unknown as Readonly<Record<string, string[]>>;
const HEADS = heads.heads as unknown as Readonly<
  Record<string, readonly [number, number, number]>
>;

/** Three-quarter views: painted turned left (threeq) or right (threeqr). */
const turned = (view: View) => view === "threeq" || view === "threeqr";

/** The styles painted for a sex: every style with a front and a three-quarter piece, by number. */
export function hairStyles(sex: string): { style: number; name: string }[] {
  const has = (style: number, test: (view: View) => boolean) =>
    PIECES.some((p) => p.sex === sex && test(p.view) && p.style === style);
  return (STYLES[sex] ?? [])
    .map((name, i) => ({ style: i + 1, name }))
    .filter(
      ({ style }) => has(style, (v) => v === "front") && has(style, turned),
    );
}

/** The faces painted for a sex, by number: each in front and three-quarter. */
export function faces(sex: string): { face: number; name: string }[] {
  const seen = new Map<number, string>();
  for (const p of FACES)
    if (p.sex === sex && !seen.has(p.face)) seen.set(p.face, p.faceName);
  const has = (face: number, test: (view: View) => boolean) =>
    FACES.some((p) => p.sex === sex && p.face === face && test(p.view));
  return [...seen]
    .filter(([face]) => has(face, (v) => v === "front") && has(face, turned))
    .sort(([a], [b]) => a - b)
    .map(([face, name]) => ({ face, name }));
}

/**
 * The piece for a figure at its angle: the view painted that way, else the
 * other three-quarter view mirrored; on the figure itself where there is
 * one, else on another of the same sex. None for a view not painted (a face
 * from behind).
 */
function pick<T extends Piece>(
  list: readonly T[],
  figure: string,
  angle: string,
  facing: string,
  /** A pose's own painted view of the head, and whether the piece is flipped with it. */
  painted?: { view: View; mirror: boolean },
): { piece: T; mirror: boolean } | undefined {
  if (painted) {
    const piece = list.find((p) => p.view === painted.view);
    return piece ? { piece, mirror: painted.mirror } : undefined;
  }
  const wanted: View =
    angle === "back"
      ? "back"
      : angle === "three-quarter"
        ? facing === "right"
          ? "threeqr"
          : "threeq"
        : "front";
  const at = (view: View) => list.filter((p) => p.view === view);
  const own = (rows: readonly T[]) =>
    rows.find((p) => p.figure === figure) ?? rows[0];
  const exact = own(at(wanted));
  if (exact) return { piece: exact, mirror: false };
  if (!turned(wanted)) return undefined;
  const other = own(at(wanted === "threeq" ? "threeqr" : "threeq"));
  return other ? { piece: other, mirror: true } : undefined;
}

const pieces = new Map<string, PNG>();
function pieceImage(piece: Piece): PNG {
  let png = pieces.get(piece.file);
  if (!png) {
    png = PNG.sync.read(
      readFileSync(
        piece.file.startsWith("faces-on-figures/")
          ? new URL(
              `../../art/people-engine/v2/faces-on-figures/${piece.file.slice("faces-on-figures/".length)}`,
              import.meta.url,
            )
          : new URL(
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

/**
 * A painted piece laid on a figure in the figure's own frame: scaled by head
 * width, set on head top and middle, mirrored where asked. `color` turns a
 * piece pixel into the color drawn (or null to keep the painted pixel).
 */
function layOn(
  figure: PNG,
  name: string,
  piece: Piece,
  mirror: boolean,
  color: (r: number, g: number, b: number) => [number, number, number] | null,
): void {
  const head = HEADS[name];
  const own = HEADS[piece.figure];
  if (!head || !own) return;
  const src = pieceImage(piece);
  const [pieceTop, pieceMiddle0, pieceWidth] = own;
  const pieceMiddle = mirror ? src.width - 1 - pieceMiddle0 : pieceMiddle0;
  const [top, middle, width] = head;
  const scale = width / pieceWidth;
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
      const rgbAt: [number, number, number] = [
        sample(px, py, 0),
        sample(px, py, 1),
        sample(px, py, 2),
      ];
      const drawn = color(...rgbAt) ?? rgbAt;
      const o = (fy * figure.width + fx) * 4;
      for (let c = 0; c < 3; c++)
        figure.data[o + c] = Math.round(
          Math.max(0, Math.min(255, drawn[c]!)) * alpha +
            figure.data[o + c]! * (1 - alpha),
        );
      figure.data[o + 3] = Math.max(
        figure.data[o + 3]!,
        Math.round(alpha * 255),
      );
    }
}

const luminance = (r: number, g: number, b: number) =>
  0.299 * r + 0.587 * g + 0.114 * b;

/** A piece's own median luminance, so a swatch keeps its painted shading. */
const medians = new Map<string, number>();
function medianOf(
  piece: Piece,
  only?: (r: number, g: number, b: number) => boolean,
) {
  const key = `${piece.file}:${only ? "beard" : "all"}`;
  if (!medians.has(key)) {
    const src = pieceImage(piece);
    const lums: number[] = [];
    for (let i = 0; i < src.data.length; i += 4) {
      const [r, g, b] = [src.data[i]!, src.data[i + 1]!, src.data[i + 2]!];
      if (src.data[i + 3]! > 128 && (!only || only(r, g, b)))
        lums.push(luminance(r, g, b));
    }
    lums.sort((a, b) => a - b);
    medians.set(key, lums[lums.length >> 1] ?? 128);
  }
  return medians.get(key)!;
}

/** A face's beard and brows: its gray pixels, which take the hair color. */
const isBeard = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  return (
    max > 0 && (max - Math.min(r, g, b)) / max < 0.12 && luminance(r, g, b) > 50
  );
};

// Every figure the rooms draw: the set and the people seen from behind.
interface Row {
  sex: string;
  angle: string;
  facing: string;
  /** The picture, from this file. */
  path: URL;
  /** A pose's painted head view (`-m` flipped), which picks its face and hair. */
  painted?: { view: View; mirror: boolean };
}
const nameOf = (file: string) =>
  file
    .split("/")
    .pop()!
    .replace(/\.png$/, "");
// Every figure the rooms draw: the set, the people seen from behind, and the
// poses painted at furniture (art/people-rooms/poses).
const ROWS = new Map<string, Row>([
  ...(
    [...figures.figures, ...backs.figures] as unknown as {
      file: string;
      sex: string;
      angle: string;
      facing: string;
    }[]
  ).map(
    (row) =>
      [
        nameOf(row.file),
        {
          ...row,
          path: new URL(
            `../../art/people-engine/v2/${row.file}`,
            import.meta.url,
          ),
        },
      ] as const,
  ),
  ...(
    poses.figures as unknown as {
      id: string;
      file: string;
      sex: string;
      angle: string;
      hairView: string;
    }[]
  ).map(
    (pose) =>
      [
        pose.id,
        {
          sex: pose.sex === "f" ? "female" : "male",
          angle: pose.angle,
          facing: "",
          path: new URL(
            `../../art/people-rooms/poses/${pose.file}`,
            import.meta.url,
          ),
          painted: {
            view: pose.hairView.replace(/-m$/, "") as View,
            mirror: pose.hairView.endsWith("-m"),
          },
        },
      ] as const,
  ),
]);

/**
 * A figure as the game draws a person: their face, their skin and clothing
 * colors, and their hair. The one drawing path for rooms (the play server's
 * figure route), the creator's preview and the screenshot tools.
 */
export function drawnFigure(name: string, colors: FigureColors): Buffer {
  const row = ROWS.get(name);
  if (!row) throw new Error("No such figure.");
  const hairTo = colors.hairColor && hairSwatch(colors.hairColor);
  let figure: Buffer = readFileSync(row.path);
  const face = Number(colors.face);
  const facePick =
    face &&
    pick(
      FACES.filter((p) => p.sex === row.sex && p.face === face),
      name,
      row.angle,
      row.facing,
      row.painted,
    );
  if (facePick) {
    const png = PNG.sync.read(figure);
    const to = hairTo ? rgb(hairTo.color) : null;
    const mid = medianOf(facePick.piece, isBeard);
    layOn(png, name, facePick.piece, facePick.mirror, (r, g, b) =>
      to && isBeard(r, g, b)
        ? (to.map((c) => (c * luminance(r, g, b)) / mid) as [
            number,
            number,
            number,
          ])
        : null,
    );
    figure = PNG.sync.write(png);
  }
  const colored = recolorFigure(figure, name, colors);
  const style = Number(colors.hair);
  const hairPick =
    style &&
    hairTo &&
    pick(
      PIECES.filter((p) => p.sex === row.sex && p.style === style),
      name,
      row.angle,
      row.facing,
      row.painted,
    );
  if (!hairPick || !hairTo) return colored;
  const png = PNG.sync.read(colored);
  const to = rgb(hairTo.color);
  const mid = medianOf(hairPick.piece);
  layOn(
    png,
    name,
    hairPick.piece,
    hairPick.mirror,
    (r, g, b) =>
      to.map((c) => (c * luminance(r, g, b)) / mid) as [number, number, number],
  );
  return PNG.sync.write(png);
}
