/**
 * Proof: whole dressed people from separately painted pieces, recolored by
 * code. Each of the six bare bodies wears the crewneck (top) and the pants
 * and boots (legwear, registered from a fitting-suit painting), with a whole
 * head and two hair layers, in several skin shades and fabric colors.
 * Usage: node --import tsx scripts/appearance/outfit-proof.ts <bodiesDir> <peopleAppearanceDir> <outDir>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { measureBodyAnchors } from "../../src/presentation/appearance-engine/anchors";
import { assemblePerson } from "../../src/presentation/appearance-engine/assemble";
import { skinInGarment } from "../../src/presentation/appearance-engine/checks";
import { extractGarment } from "../../src/presentation/appearance-engine/extract";
import {
  fabricRamp,
  measureFabricLuminance,
  recolorFabric,
} from "../../src/presentation/appearance-engine/fabric";
import type { Raster } from "../../src/presentation/appearance-engine/raster";
import {
  registrationOffset,
  translateRaster,
} from "../../src/presentation/appearance-engine/register";
import {
  SKIN_RAMPS,
  recolorSkin,
} from "../../src/presentation/appearance-engine/skin";

const [bodiesDir, appearanceDir, outDir] = process.argv.slice(2);
if (!bodiesDir || !appearanceDir || !outDir)
  throw new Error("usage: outfit-proof <bodiesDir> <appearanceDir> <outDir>");
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
const bodyFile = (sex: string, build: string) =>
  sex === "masculine" && build === "average"
    ? "masculine-average-standing-front-bare-v2"
    : `${sex}-${build}-standing-front-bare-v1`;
/**
 * The Sept. 27 men's crewneck paintings shade the chest in curves that read
 * as breasts once colored (Lamontae); keep a little of their folds only.
 */
const MEN_TOP_SHADING = 0.45;
const LOOKS: Record<string, readonly [string, string, number][]> = {
  // [top color, legwear color, skin shade index]
  feminine: [
    ["burgundy", "charcoal", 1],
    ["white", "navy", 3],
    ["slate-blue", "black", 5],
  ],
  masculine: [
    ["light-blue", "charcoal", 2],
    ["forest", "navy", 4],
    ["white", "black", 6],
  ],
};
for (const sex of ["feminine", "masculine"]) {
  const canonical = measureBodyAnchors(
    read(join(bodiesDir, `${bodyFile(sex, "average")}.png`)),
  );
  const hair = sex === "feminine" ? "wavy-bob" : "short-coils";
  const head = read(
    join(appearanceDir, "faces", `face-${sex}-20s30s-01-v1.png`),
  );
  const back = read(
    join(appearanceDir, "hair", `hair-${sex}-${hair}-01-back-v1.png`),
  );
  const front = read(
    join(appearanceDir, "hair", `hair-${sex}-${hair}-01-front-v1.png`),
  );
  for (const build of ["lean", "average", "fuller"]) {
    const bare = read(join(bodiesDir, `${bodyFile(sex, build)}.png`));
    const anchors = measureBodyAnchors(bare);
    const top = extractGarment(
      read(
        join(
          appearanceDir,
          "wardrobe",
          `${sex}-crewneck-${build}-onbody-v1.png`,
        ),
      ),
      bare,
      anchors,
      "top",
    );
    const pantsPainting = read(
      join(
        appearanceDir,
        "wardrobe",
        `${sex}-${build}-pants-boots-clothed-reference-v1.png`,
      ),
    );
    const offset = registrationOffset(
      measureBodyAnchors(pantsPainting),
      anchors,
    );
    const legwear = extractGarment(
      translateRaster(pantsPainting, offset.dx, offset.dy),
      bare,
      anchors,
      "legwear",
    );
    console.log(
      sex,
      build,
      JSON.stringify({
        offset,
        top: {
          cloth: top.clothPixels,
          skin: skinInGarment(top.layer, bare).share.toFixed(4),
        },
        legwear: {
          cloth: legwear.clothPixels,
          skin: skinInGarment(legwear.layer, bare).share.toFixed(4),
        },
      }),
    );
    write(legwear.layer, join(outDir, `layer-${sex}-${build}-legwear.png`));
    for (const [topColor, legColor, shadeIndex] of LOOKS[sex]!) {
      const shade = SKIN_RAMPS[shadeIndex]!;
      const person = assemblePerson(anchors, [
        { slot: "back-hair", raster: back, authoredFor: canonical },
        { slot: "body", raster: recolorSkin(bare, shade) },
        {
          slot: "bottoms",
          raster: recolorFabric(legwear.layer, fabricRamp(legColor)),
          hidesBody: legwear.hidesBody,
          tucksTop: legwear.waistline
            ? { waistline: legwear.waistline }
            : undefined,
        },
        {
          slot: "top",
          tuckTail: top.tuckTail
            ? recolorFabric(
                top.tuckTail,
                fabricRamp(topColor),
                measureFabricLuminance(top.layer),
                sex === "masculine" ? MEN_TOP_SHADING : 1,
              )
            : null,
          raster: recolorFabric(
            top.layer,
            fabricRamp(topColor),
            undefined,
            sex === "masculine" ? MEN_TOP_SHADING : 1,
          ),
        },
        {
          slot: "head",
          raster: recolorSkin(head, shade),
          authoredFor: canonical,
        },
        { slot: "front-hair", raster: front, authoredFor: canonical },
      ]);
      write(
        person,
        join(
          outDir,
          `${sex}-${build}__${topColor}-${legColor}-${shade.id}.png`,
        ),
      );
    }
  }
}
