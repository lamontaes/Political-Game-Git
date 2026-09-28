/**
 * First pass, by color alone: lists garment layers that may carry painted
 * skin. Warm fabrics (tan, mustard, cream, brown) are flagged too; confirm with
 * skinInGarment(garment, body) against the body the garment was drawn on. The
 * usual cause of the face
 * "jigsaw" (a shirt drawn with its own neck or chin, layered over the head).
 * Usage: node --import tsx scripts/appearance/garment-skin-scan.ts [pathPrefix]
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { PNG } from "pngjs";
import {
  GARMENT_SKIN_TOLERANCE,
  skinInGarment,
} from "../../src/presentation/appearance-engine/checks";

const prefix = process.argv[2] ?? "art";
const files = execSync(`git ls-files ${prefix}`, { encoding: "utf8" })
  .split("\n")
  .filter(
    (f) =>
      /\.png$/i.test(f) &&
      /top|shirt|sweater|blouse|polo|tee|jacket|cardigan|hoodie|torso|coat|dress/i.test(
        f,
      ) &&
      !/skin|body|mask|coverage|map/i.test(f),
  );
const rows: { share: number; line: string }[] = [];
for (const file of files) {
  const png = PNG.sync.read(readFileSync(file));
  const result = skinInGarment({
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  });
  rows.push({
    share: result.share,
    line: `${result.share > GARMENT_SKIN_TOLERANCE ? "SKIN " : "clean"}\t${(result.share * 100).toFixed(2)}%\t${result.skinPixels}\t${file}`,
  });
}
rows.sort((a, b) => b.share - a.share);
for (const row of rows) console.log(row.line);
console.log(
  `${rows.filter((r) => r.share > GARMENT_SKIN_TOLERANCE).length} of ${rows.length} garment layers carry painted skin.`,
);
