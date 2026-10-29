// Measures where a desk figure's hands rest, from the figure's own pixels,
// and writes it as `hands` (a row in the figure's pixels) on its manifest
// row, so a desk mannequin fits head top to hands (the plate README). It is a
// measurement of art already in the pack, rerun after the pack changes:
//   node --import tsx scripts/people/measure-hands.ts [--check]
// The hands are the lowest row of the person's own skin color below the
// chin and above the feet, leaving out FEET head widths over the feet so
// ankles and light shoes are never taken: a pixel is
// skin when it is within SKIN_DISTANCE (CIE Lab) of the person's manifest
// skin, and a row counts when it holds at least ROW_SHARE of a head width of
// such pixels (measurement choices, TUNABLE by eye on the proof sheet).
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import {
  MANIFEST_URL,
  figurePng,
  packFigures,
  packPerson,
  toLab,
  type PackFigure,
} from "../../src/bench/people-pack";

const SKIN_DISTANCE = 14;
const ROW_SHARE = 0.08;
/** Below the face: the chin is about this many head widths under the head top. */
const CHIN = 1.25;
/** The band over the feet left out: shoes and ankles. */
const FEET = 1.5;

export function handsRow(figure: PackFigure): number | null {
  const person = packPerson(figure.person);
  if (!person) return null;
  const png = PNG.sync.read(figurePng(figure));
  const skin = toLab(person.skin);
  const from = Math.round(figure.head.top + figure.head.width * CHIN);
  const need = Math.max(2, Math.round(figure.head.width * ROW_SHARE));
  const to = Math.round(figure.feet.y - figure.head.width * FEET);
  let lowest: number | null = null;
  for (let y = from; y < to; y++) {
    let count = 0;
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3]! < 200) continue;
      const [L, a, b] = toLab([
        png.data[i]!,
        png.data[i + 1]!,
        png.data[i + 2]!,
      ]);
      if (Math.hypot(L - skin[0], a - skin[1], b - skin[2]) < SKIN_DISTANCE)
        count++;
    }
    if (count >= need) lowest = y;
  }
  return lowest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  // The manifest's own text is kept as the pack wrote it: only each desk
  // figure's `hands` line is added or changed, after its handsRestOnDesk.
  let text = readFileSync(MANIFEST_URL, "utf8");
  let changed = 0;
  for (const figure of packFigures()) {
    // A figure drawn behind a table carries the art's own hands row.
    if (!figure.handsRestOnDesk || figure.drawnBehindTable) continue;
    const hands = handsRow(figure);
    console.log(`${figure.id}: hands ${hands ?? "not found"}`);
    if (hands === null || figure.hands === hands) continue;
    const at = text.indexOf(`"id": ${JSON.stringify(figure.id)}`);
    const flag = text.indexOf('"handsRestOnDesk": true', at);
    const end = text.indexOf("\n", flag);
    const next = text.slice(end + 1, text.indexOf("\n", end + 1));
    const indent = /^\s*/.exec(next)![0];
    const line = `${indent}"hands": ${hands},`;
    text = /^\s*"hands": \d+,$/.test(next)
      ? text.slice(0, end + 1) + line + text.slice(end + 1 + next.length)
      : `${text.slice(0, end + 1)}${line}\n${text.slice(end + 1)}`;
    changed++;
  }
  if (check && changed) {
    console.error(`${changed} hands rows differ from the manifest.`);
    process.exit(1);
  }
  if (!check && changed) writeFileSync(MANIFEST_URL, text);
  console.log(`${changed} hands rows written.`);
}
