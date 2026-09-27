/**
 * Proof: extract a cloth-only layer from an on-body garment painting and lay
 * it on the unchanged bare body in two skin shades.
 * Usage: node --import tsx scripts/appearance/garment-extract-proof.ts <bareDir> <wardrobeDir> <outDir>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { measureBodyAnchors } from "../../src/presentation/appearance-engine/anchors";
import { assemblePerson } from "../../src/presentation/appearance-engine/assemble";
import { skinInGarment } from "../../src/presentation/appearance-engine/checks";
import {
  extractGarment,
  measureBodyBands,
} from "../../src/presentation/appearance-engine/extract";
import type { Raster } from "../../src/presentation/appearance-engine/raster";
import {
  SKIN_RAMPS,
  recolorSkin,
} from "../../src/presentation/appearance-engine/skin";

const [bareDir, wardrobeDir, outDir] = process.argv.slice(2);
if (!bareDir || !wardrobeDir || !outDir)
  throw new Error(
    "usage: garment-extract-proof <bareDir> <wardrobeDir> <outDir>",
  );
mkdirSync(outDir, { recursive: true });
const read = (path: string): Raster => {
  const png = PNG.sync.read(readFileSync(path));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
};
const write = (raster: Raster, path: string) => {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  writeFileSync(path, PNG.sync.write(png));
};
for (const build of ["lean", "average", "fuller"]) {
  const bare = read(
    join(bareDir, `feminine-${build}-standing-front-bare-v1.png`),
  );
  const onBody = read(
    join(wardrobeDir, `feminine-crewneck-${build}-onbody-v1.png`),
  );
  const anchors = measureBodyAnchors(bare);
  const bands = measureBodyBands(bare, anchors);
  const garment = extractGarment(onBody, bare, anchors, "top");
  const skin = skinInGarment(garment.layer, bare);
  console.log(
    build,
    JSON.stringify({
      bands,
      cloth: garment.clothPixels,
      refused: garment.refusedPixels,
      skinShare: Number(skin.share.toFixed(4)),
    }),
  );
  write(garment.layer, join(outDir, `${build}__cloth.png`));
  for (const shade of [SKIN_RAMPS[2]!, SKIN_RAMPS[5]!]) {
    const body = recolorSkin(bare, shade);
    const person = assemblePerson(anchors, [
      { slot: "body", raster: body },
      { slot: "top", raster: garment.layer },
    ]);
    write(person, join(outDir, `${build}__assembled-${shade.id}.png`));
  }
}
