// A person's headshot (owner, Oct 28: the bust "looks like my guy is missing
// an eye"): their own figure drawn as everywhere else, from the front, cropped
// to a square around the head the figure was measured with
// (data/figure-heads.json), so every figure's face sits whole in the middle.
import { PNG } from "pngjs";
import heads from "./data/figure-heads.json" with { type: "json" };
import index from "../../art/people-engine/v2/index.json" with { type: "json" };
import { drawnFigure } from "./figure-hair";
import type { FigureColors } from "./figure-colors";

interface Row {
  file: string;
  pose: string;
  angle: string;
  outfit: string;
  sex: string;
  build: string;
  prop: string;
  flag?: string;
}
const ROWS = (index.figures as unknown as Row[]).filter(
  (row) => row.prop === "none" && !row.flag,
);
const nameOf = (file: string) =>
  file
    .split("/")
    .pop()!
    .replace(/\.png$/, "");
const HEADS = heads.heads as Record<string, number[]>;

/** The square's side in head widths, and how far above the head's top it starts (presentation, TUNABLE by eye: 2.2 to 3). */
const SPAN = 2.4;
const ABOVE = 0.3;

/**
 * The figure a headshot is drawn from: the person's own look (outfit, sex,
 * build) standing and facing front, so a person seen turned or from behind
 * in a room still shows their face. The figure itself when none is painted.
 */
export function headshotFigure(name: string): string {
  const own = ROWS.find((row) => nameOf(row.file) === name);
  if (!own) return name;
  const front = ROWS.find(
    (row) =>
      row.pose === "stand" &&
      row.angle === "front" &&
      row.outfit === own.outfit &&
      row.sex === own.sex &&
      row.build === own.build &&
      HEADS[nameOf(row.file)],
  );
  return front ? nameOf(front.file) : name;
}

/** The headshot as a PNG: a square around the head, transparent where the figure's picture ends. */
export function headshotPng(name: string, colors: FigureColors): Buffer {
  const figure = headshotFigure(name);
  const head = HEADS[figure];
  const drawn = drawnFigure(figure, colors);
  if (!head) return drawn;
  const [top, middle, width] = head as [number, number, number];
  const source = PNG.sync.read(drawn);
  const side = Math.round(width * SPAN);
  const left = Math.round(middle - side / 2);
  const from = Math.round(top - width * ABOVE);
  const out = new PNG({ width: side, height: side });
  for (let y = 0; y < side; y++) {
    const sy = from + y;
    if (sy < 0 || sy >= source.height) continue;
    for (let x = 0; x < side; x++) {
      const sx = left + x;
      if (sx < 0 || sx >= source.width) continue;
      source.data.copy(
        out.data,
        (y * side + x) * 4,
        (sy * source.width + sx) * 4,
        (sy * source.width + sx) * 4 + 4,
      );
    }
  }
  return PNG.sync.write(out);
}
