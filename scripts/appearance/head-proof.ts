/**
 * Proof: the art team's whole heads and hair on all six bodies, with head and
 * body in the same skin shade and the head's neck faded into the body's.
 * Usage: node --import tsx scripts/appearance/head-proof.ts <bodiesDir> <peopleAppearanceDir> <outDir>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { measureBodyAnchors } from "../../src/presentation/appearance-engine/anchors";
import { assemblePerson } from "../../src/presentation/appearance-engine/assemble";
import type { Raster } from "../../src/presentation/appearance-engine/raster";
import {
  SKIN_RAMPS,
  recolorSkin,
} from "../../src/presentation/appearance-engine/skin";

const [bodiesDir, appearanceDir, outDir] = process.argv.slice(2);
if (!bodiesDir || !appearanceDir || !outDir)
  throw new Error("usage: head-proof <bodiesDir> <appearanceDir> <outDir>");
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
const bodies = {
  feminine: [
    "feminine-lean-standing-front-bare-v1",
    "feminine-average-standing-front-bare-v1",
    "feminine-fuller-standing-front-bare-v1",
  ],
  masculine: [
    "masculine-lean-standing-front-bare-v1",
    "masculine-average-standing-front-bare-v2",
    "masculine-fuller-standing-front-bare-v1",
  ],
} as const;
const hairName = { feminine: "wavy-bob", masculine: "short-coils" } as const;
for (const sex of ["feminine", "masculine"] as const) {
  const canonical = read(join(bodiesDir, `${bodies[sex][1]}.png`));
  const canonicalAnchors = measureBodyAnchors(canonical);
  const head = read(
    join(appearanceDir, "faces", `face-${sex}-20s30s-01-v1.png`),
  );
  const back = read(
    join(appearanceDir, "hair", `hair-${sex}-${hairName[sex]}-01-back-v1.png`),
  );
  const front = read(
    join(appearanceDir, "hair", `hair-${sex}-${hairName[sex]}-01-front-v1.png`),
  );
  for (const file of bodies[sex]) {
    const bare = read(join(bodiesDir, `${file}.png`));
    const anchors = measureBodyAnchors(bare);
    for (const shade of [SKIN_RAMPS[2]!, SKIN_RAMPS[5]!]) {
      const person = assemblePerson(anchors, [
        { slot: "back-hair", raster: back, authoredFor: canonicalAnchors },
        { slot: "body", raster: recolorSkin(bare, shade) },
        {
          slot: "head",
          raster: recolorSkin(head, shade),
          authoredFor: canonicalAnchors,
        },
        { slot: "front-hair", raster: front, authoredFor: canonicalAnchors },
      ]);
      write(person, join(outDir, `${file}__${shade.id}.png`));
    }
  }
}
