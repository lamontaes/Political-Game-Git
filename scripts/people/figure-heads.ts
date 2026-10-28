/* global console */
// Where each v2 figure's head is in its own picture: [top row, middle column,
// width], in the figure's pixels. A room spot measured from a mannequin plate
// gives the head the person must have there (art/people-rooms), so the
// figure is scaled by head width and set by head top and middle. Heads the
// art session measured with its hair pieces are taken as given
// (art/people-engine/v2/hair-on-figures/index.json, when present); the rest are
// measured from the figure's outline: the rows above the neck (the narrowest
// row below the head), their middle, and a width at the 75th percentile of
// those rows, which leaves out the ears and matches the art's own heads within
// about 5 percent.
// Usage: node --import tsx scripts/people/figure-heads.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import index from "../../art/people-engine/v2/index.json" with { type: "json" };
import backs from "../../art/people-engine/v2/figures-back.json" with { type: "json" };
import poses from "../../art/people-rooms/poses/index.json" with { type: "json" };

const HAIR = "art/people-engine/v2/hair-on-figures/index.json";
const OUT = "src/bench/data/figure-heads.json";

export function measureHead(png: PNG): [number, number, number] {
  const { width, height, data } = png;
  const opaque = (x: number, y: number) => data[(y * width + x) * 4 + 3]! > 128;
  let top = 0;
  let bottom = height - 1;
  while (top < height && ![...Array(width).keys()].some((x) => opaque(x, top)))
    top++;
  while (
    bottom > top &&
    ![...Array(width).keys()].some((x) => opaque(x, bottom))
  )
    bottom--;
  const tall = bottom - top;
  const widths: number[] = [];
  const middles: number[] = [];
  for (let y = top; y < top + Math.floor(tall * 0.3); y++) {
    let left = -1,
      right = -1;
    for (let x = 0; x < width; x++)
      if (opaque(x, y)) {
        if (left < 0) left = x;
        right = x;
      }
    widths.push(left < 0 ? 0 : right - left + 1);
    middles.push(left < 0 ? 0 : (left + right) / 2);
  }
  const from = Math.floor(tall * 0.05),
    to = Math.floor(tall * 0.22);
  let neck = from;
  for (let i = from; i < to; i++) if (widths[i]! < widths[neck]!) neck = i;
  const head = widths.slice(0, neck).sort((a, b) => a - b);
  const mids = middles.slice(0, neck).sort((a, b) => a - b);
  return [
    top,
    Math.round(mids[Math.floor(mids.length / 2)]! * 10) / 10,
    head[Math.floor((head.length - 1) * 0.75)]!,
  ];
}

const given = new Map<string, [number, number, number]>();
if (existsSync(HAIR))
  for (const piece of JSON.parse(readFileSync(HAIR, "utf8")).pieces as {
    figure: string;
    head: [number, number, number];
  }[])
    given.set(piece.figure, piece.head);

const heads: Record<string, [number, number, number]> = {};
for (const row of [...index.figures, ...backs.figures] as { file: string }[]) {
  const name = row.file
    .split("/")
    .pop()!
    .replace(/\.png$/, "");
  heads[name] =
    given.get(name) ??
    measureHead(
      PNG.sync.read(readFileSync(`art/people-engine/v2/${row.file}`)),
    );
}
// The figures the hair pieces for heads turned away were painted on (v2-prof-*,
// v2-tqb-*): only their pieces use them, so their heads are the art's.
for (const [name, head] of given) heads[name] ??= head;
// Poses painted at furniture (art/people-rooms/poses): the art measured each head.
for (const pose of poses.figures as {
  id: string;
  head: { top: number; x: number; width: number };
}[])
  heads[pose.id] = [pose.head.top, pose.head.x, pose.head.width];
writeFileSync(
  OUT,
  JSON.stringify(
    {
      about:
        "Each v2 figure's head in its own picture: [top row, middle column, width] in pixels. Made by scripts/people/figure-heads.ts: the art session's own measurements where it gave them (hair-on-figures/index.json, art/people-rooms/poses/index.json), else measured from the outline. Read by src/bench/whole-figures.ts to size and set a figure on a spot measured from a mannequin plate.",
      heads,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${Object.keys(heads).length} heads, ${given.size} as given`);
