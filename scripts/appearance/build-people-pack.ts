/**
 * Builds the people engine's runtime pack: art/people-engine/v1.
 *
 * Reads the art team's source paintings (bare bodies, whole heads, hair
 * layers and on-body outfit paintings), extracts every outfit with the
 * engine, halves everything to the size the game draws people at, measures
 * each piece where the game will use it, and writes the PNGs and one
 * manifest. Rerun it whenever new art is accepted; the game reads only the
 * pack.
 *
 * Usage: node --import tsx scripts/appearance/build-people-pack.ts <bodiesDir> <peopleAppearanceDir> [outDir]
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { measureBodyAnchors } from "../../src/presentation/appearance-engine/anchors";
import { extractGarment } from "../../src/presentation/appearance-engine/extract";
import {
  PEOPLE_PACK_VERSION,
  type PeoplePackManifest,
  type PackPresentation,
} from "../../src/presentation/appearance-engine/pack";
import {
  downscaleHalf,
  type Raster,
} from "../../src/presentation/appearance-engine/raster";
import {
  registrationOffset,
  translateRaster,
} from "../../src/presentation/appearance-engine/register";
import { measureSkinLuminance } from "../../src/presentation/appearance-engine/skin";

const [bodiesDir, appearanceDir, outArg] = process.argv.slice(2);
if (!bodiesDir || !appearanceDir)
  throw new Error(
    "usage: build-people-pack <bodiesDir> <appearanceDir> [outDir]",
  );
const outDir = outArg ?? "art/people-engine/v1";
mkdirSync(outDir, { recursive: true });

const read = (path: string): Raster => {
  const png = PNG.sync.read(readFileSync(path));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
};
const write = (raster: Raster, file: string): string => {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  writeFileSync(join(outDir, file), PNG.sync.write(png, { colorType: 6 }));
  return file;
};
const round = (value: number) => Math.round(value * 10) / 10;
const skinOf = (raster: Raster) => {
  const measured = measureSkinLuminance(raster);
  return {
    shadow: round(measured.shadow),
    base: round(measured.base),
    highlight: round(measured.highlight),
  };
};

const BUILDS = ["lean", "average", "fuller"] as const;
const bodyFile = (sex: string, build: string) =>
  sex === "masculine" && build === "average"
    ? "masculine-average-standing-front-bare-v2"
    : `${sex}-${build}-standing-front-bare-v1`;
/**
 * Hair made in Firefly (Sept. 27): edits and hair sheets in the game's style,
 * cut with Adobe's hair mask and fitted to the canonical heads by
 * cto-notes/firefly/fit_sheet.py. Every hair-{sex}-{id}-front-v1.png there is
 * a style.
 */
const FIREFLY_HAIR =
  "/Users/lamontae/political-game-play/cto-notes/firefly/hair";
function fireflyHair(sex: string): { id: string; stem: string; dir: string }[] {
  const pattern = new RegExp(`^hair-${sex}-(.+)-front-v1[.]png$`);
  return readdirSync(FIREFLY_HAIR)
    .map((file) => pattern.exec(file)?.[1])
    .filter((id): id is string => Boolean(id))
    .sort()
    .map((id) => ({ id, stem: `hair-${sex}-${id}`, dir: FIREFLY_HAIR }));
}
const SOURCES: Record<
  "feminine" | "masculine",
  {
    faces: readonly { id: string; file: string }[];
    hair: readonly { id: string; stem: string; dir?: string }[];
  }
> = {
  feminine: {
    faces: [{ id: "20s30s-01", file: "face-feminine-20s30s-01-v1.png" }],
    hair: [
      { id: "wavy-bob", stem: "hair-feminine-wavy-bob-01" },
      ...fireflyHair("feminine"),
    ],
  },
  masculine: {
    faces: [{ id: "20s30s-01", file: "face-masculine-20s30s-01-v1.png" }],
    hair: [
      { id: "short-coils", stem: "hair-masculine-short-coils-01" },
      ...fireflyHair("masculine"),
    ],
  },
};

const presentations: Record<string, PackPresentation> = {};
for (const sex of ["feminine", "masculine"] as const) {
  const bodies: PackPresentation["bodies"] = {} as PackPresentation["bodies"];
  const outfits: PackPresentation["outfits"] = { formal: {}, casual: {} };
  for (const build of BUILDS) {
    const bareFull = read(join(bodiesDir, `${bodyFile(sex, build)}.png`));
    const anchorsFull = measureBodyAnchors(bareFull);
    const bare = downscaleHalf(bareFull);
    bodies[build] = {
      file: write(bare, `body-${sex}-${build}.png`),
      anchors: measureBodyAnchors(bare),
      skin: skinOf(bare),
    };
    for (const kind of ["formal", "casual"] as const) {
      const painting = read(
        join(
          appearanceDir,
          "wardrobe",
          `${sex}-${kind}-${build}-onbody-v1.png`,
        ),
      );
      const offset = registrationOffset(
        measureBodyAnchors(painting),
        anchorsFull,
        "head",
      );
      const garment = extractGarment(
        translateRaster(painting, offset.dx, offset.dy),
        bareFull,
        anchorsFull,
        "outfit",
      );
      const hides = {
        width: bareFull.width,
        height: bareFull.height,
        data: new Uint8ClampedArray(bareFull.width * bareFull.height * 4),
      };
      garment.hidesBody!.forEach((hidden, p) => {
        if (hidden) hides.data[p * 4 + 3] = 255;
      });
      const halfHides = downscaleHalf(hides);
      for (let i = 3; i < halfHides.data.length; i += 4)
        halfHides.data[i] = halfHides.data[i]! >= 128 ? 255 : 0;
      outfits[kind][build] = {
        file: write(
          downscaleHalf(garment.layer),
          `outfit-${sex}-${kind}-${build}.png`,
        ),
        hides: write(halfHides, `outfit-${sex}-${kind}-${build}-hides.png`),
      };
      console.log(
        sex,
        build,
        kind,
        JSON.stringify(offset),
        garment.clothPixels,
      );
    }
  }
  const faces = SOURCES[sex].faces.map((face) => {
    const head = downscaleHalf(read(join(appearanceDir, "faces", face.file)));
    return {
      id: face.id,
      file: write(head, `face-${sex}-${face.id}.png`),
      skin: skinOf(head),
    };
  });
  const hair = SOURCES[sex].hair.map((style) => ({
    id: style.id,
    back: write(
      downscaleHalf(
        read(
          join(
            style.dir ?? join(appearanceDir, "hair"),
            `${style.stem}-back-v1.png`,
          ),
        ),
      ),
      `hair-${sex}-${style.id}-back.png`,
    ),
    front: write(
      downscaleHalf(
        read(
          join(
            style.dir ?? join(appearanceDir, "hair"),
            `${style.stem}-front-v1.png`,
          ),
        ),
      ),
      `hair-${sex}-${style.id}-front.png`,
    ),
  }));
  presentations[sex] = {
    canonical: measureBodyAnchors(
      downscaleHalf(read(join(bodiesDir, `${bodyFile(sex, "average")}.png`))),
    ),
    bodies,
    faces,
    hair,
    outfits,
  };
}

const manifest: PeoplePackManifest = {
  version: PEOPLE_PACK_VERSION,
  canvas: { width: 512, height: 768 },
  presentations: presentations as PeoplePackManifest["presentations"],
};
writeFileSync(
  join(outDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`wrote ${outDir}`);
