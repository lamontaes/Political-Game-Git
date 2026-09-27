/**
 * Proof: a whole person from parts. Bare body, a garment extracted from an
 * on-body painting, a whole head and two hair layers, in several skin shades.
 * Usage: node --import tsx scripts/appearance/dressed-proof.ts <bodiesDir> <peopleAppearanceDir> <outDir> [slot] [garmentPattern]
 * garmentPattern uses {build} for lean/average/fuller, e.g. "feminine-crewneck-{build}-onbody-v1.png".
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { measureBodyAnchors } from "../../src/presentation/appearance-engine/anchors";
import {
  assemblePerson,
  type LayerSlot,
} from "../../src/presentation/appearance-engine/assemble";
import { skinInGarment } from "../../src/presentation/appearance-engine/checks";
import {
  extractGarment,
  type GarmentSlot,
} from "../../src/presentation/appearance-engine/extract";
import type { Raster } from "../../src/presentation/appearance-engine/raster";
import {
  registrationOffset,
  translateRaster,
} from "../../src/presentation/appearance-engine/register";
import {
  SKIN_RAMPS,
  measureSkinLuminance,
  recolorSkin,
} from "../../src/presentation/appearance-engine/skin";

const [bodiesDir, appearanceDir, outDir, slotArg, patternArg] =
  process.argv.slice(2);
if (!bodiesDir || !appearanceDir || !outDir)
  throw new Error(
    "usage: dressed-proof <bodiesDir> <appearanceDir> <outDir> [slot] [pattern]",
  );
const slot = (slotArg ?? "top") as GarmentSlot & LayerSlot;
const pattern = patternArg ?? "feminine-crewneck-{build}-onbody-v1.png";
const sex = pattern.startsWith("masculine") ? "masculine" : "feminine";
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
const bodyFile = (build: string) =>
  sex === "feminine"
    ? `feminine-${build}-standing-front-bare-v1`
    : build === "average"
      ? "masculine-average-standing-front-bare-v2"
      : `masculine-${build}-standing-front-bare-v1`;
const hair = sex === "feminine" ? "wavy-bob" : "short-coils";
const canonicalAnchors = measureBodyAnchors(
  read(join(bodiesDir, `${bodyFile("average")}.png`)),
);
const head = read(join(appearanceDir, "faces", `face-${sex}-20s30s-01-v1.png`));
const back = read(
  join(appearanceDir, "hair", `hair-${sex}-${hair}-01-back-v1.png`),
);
const front = read(
  join(appearanceDir, "hair", `hair-${sex}-${hair}-01-front-v1.png`),
);
for (const build of ["lean", "average", "fuller"]) {
  const garmentPath = join(
    appearanceDir,
    "wardrobe",
    pattern.replace("{build}", build),
  );
  if (!existsSync(garmentPath)) {
    console.log(`missing ${garmentPath}`);
    continue;
  }
  const bare = read(join(bodiesDir, `${bodyFile(build)}.png`));
  const anchors = measureBodyAnchors(bare);
  // Paintings made over a fitting-suit figure stand a few rows off the bare
  // body: move each onto it first.
  const painting = read(garmentPath);
  const offset = registrationOffset(
    measureBodyAnchors(painting),
    anchors,
    slot === "bottoms" || slot === "shoes" || slot === "legwear"
      ? "feet"
      : "head",
  );
  const garment = extractGarment(
    translateRaster(painting, offset.dx, offset.dy),
    bare,
    anchors,
    slot,
  );
  const skin = skinInGarment(garment.layer, bare);
  console.log(
    build,
    JSON.stringify({
      offset,
      cloth: garment.clothPixels,
      refused: garment.refusedPixels,
      skinShare: Number(skin.share.toFixed(4)),
    }),
  );
  for (const shade of [SKIN_RAMPS[1]!, SKIN_RAMPS[3]!, SKIN_RAMPS[5]!]) {
    const person = assemblePerson(anchors, [
      { slot: "back-hair", raster: back, authoredFor: canonicalAnchors },
      { slot: "body", raster: recolorSkin(bare, shade) },
      {
        slot,
        raster:
          slot === "outfit"
            ? recolorSkin(garment.layer, shade, measureSkinLuminance(bare))
            : garment.layer,
        hidesBody: garment.hidesBody,
      },
      {
        slot: "head",
        raster: recolorSkin(head, shade),
        authoredFor: canonicalAnchors,
      },
      { slot: "front-hair", raster: front, authoredFor: canonicalAnchors },
    ]);
    write(person, join(outDir, `${sex}-${build}__${shade.id}.png`));
  }
}
