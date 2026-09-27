/**
 * Proof: every body in every skin shade, repainted by code from one painting.
 * Usage: node --import tsx scripts/appearance/skin-tone-proof.ts <bodiesDir> <outDir>
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  SKIN_RAMPS,
  recolorSkin,
} from "../../src/presentation/appearance-engine/skin";
import { measureBodyAnchors } from "../../src/presentation/appearance-engine/anchors";

const [bodiesDir, outDir] = process.argv.slice(2);
if (!bodiesDir || !outDir)
  throw new Error("usage: skin-tone-proof <bodiesDir> <outDir>");
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(bodiesDir)
  .filter((f) => f.endsWith(".png"))
  .sort()) {
  const png = PNG.sync.read(readFileSync(join(bodiesDir, file)));
  const raster = {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
  const anchors = measureBodyAnchors(raster);
  console.log(
    file,
    JSON.stringify({
      top: anchors.top,
      feet: anchors.feet,
      neck: anchors.neck,
      shoulderRow: anchors.shoulderRow,
    }),
  );
  for (const ramp of SKIN_RAMPS) {
    const out = recolorSkin(raster, ramp);
    const target = new PNG({ width: out.width, height: out.height });
    target.data = Buffer.from(out.data);
    writeFileSync(
      join(outDir, `${file.replace(/\.png$/, "")}__${ramp.id}.png`),
      PNG.sync.write(target),
    );
  }
}
