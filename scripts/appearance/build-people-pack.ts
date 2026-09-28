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
  type BodyBuild,
  type OutfitOccasion,
  type PackOutfit,
  type PeoplePackManifest,
  type PackPresentation,
} from "../../src/presentation/appearance-engine/pack";
import {
  createRaster,
  downscaleHalf,
  type Raster,
} from "../../src/presentation/appearance-engine/raster";
import {
  registrationOffset,
  translateRaster,
} from "../../src/presentation/appearance-engine/register";
import {
  isSkinPixel,
  measureSkinLuminance,
} from "../../src/presentation/appearance-engine/skin";

const [bodiesDir, appearanceDir, outArg] = process.argv.slice(2);
if (!bodiesDir || !appearanceDir)
  throw new Error(
    "usage: build-people-pack <bodiesDir> <appearanceDir> [outDir]",
  );
const outDir = outArg ?? "art/people-engine/v1";
mkdirSync(outDir, { recursive: true });

/**
 * Empty rows added above every source painting (40 at the pack's half size).
 * A head is moved to each body's own neck, and a tall body's neck sits higher
 * than the one the hair was drawn for: without this room, buns, top knots and
 * afros are cut off at the top of the picture.
 */
const HEADROOM = 80;
const read = (path: string): Raster => {
  const png = PNG.sync.read(readFileSync(path));
  const data = new Uint8ClampedArray(png.width * (png.height + HEADROOM) * 4);
  data.set(png.data, png.width * HEADROOM * 4);
  return { width: png.width, height: png.height + HEADROOM, data };
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

type Hue = "red" | "yellow" | "green" | "blue" | "gray" | "white";

/**
 * The garment parts of a painted outfit, told apart by the painting's own
 * colors: each part is painted in a hue no other part of that outfit has
 * (the prompts and Art's paintings chose them so). Skin (hands, legs, an open
 * collar), ink lines and the shoes belong to no part; shoes keep their
 * painted color. Each part then spreads one pixel into unclaimed cloth so its
 * anti-aliased edge recolors with it.
 */
function outfitRegions(
  layer: Raster,
  parts: Readonly<Record<string, readonly Hue[]>>,
  skin: Uint8Array | null,
  shoeTop: number,
): Record<string, Raster> {
  const { width, height, data } = layer;
  const hueAt = (p: number): Hue | null => {
    const i = p * 4;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (data[i + 3]! <= 128 || Math.floor(p / width) >= shoeTop) return null;
    if (skin ? skin[p] : isSkinPixel(r, g, b, data[i + 3]!)) return null;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const max = Math.max(r, g, b);
    const sat = max - Math.min(r, g, b);
    // A color's own deep shadows belong to it; only near-black is ink.
    if (sat >= 12 && sat / max >= 0.18 && lum > 12) {
      const hue =
        max === r
          ? (60 * ((g - b) / sat) + 360) % 360
          : max === g
            ? 60 * ((b - r) / sat) + 120
            : 60 * ((r - g) / sat) + 240;
      if (hue < 18 || hue >= 260) return "red";
      if (hue < 75) return "yellow";
      if (hue < 170) return "green";
      return "blue";
    }
    if (lum <= 40) return null;
    if (lum >= 175) return "white";
    return "gray";
  };
  const out: Record<string, Raster> = {};
  const claimed = new Set(Object.values(parts).flat());
  for (const [part, hues] of Object.entries(parts)) {
    const mask = createRaster(width, height);
    for (let p = 0; p < width * height; p += 1) {
      const kind = hueAt(p);
      if (kind !== null && hues.includes(kind)) mask.data[p * 4 + 3] = 255;
    }
    const grown = new Uint8ClampedArray(mask.data);
    for (let y = 1; y < height - 1; y += 1)
      for (let x = 1; x < width - 1; x += 1) {
        const p = y * width + x;
        const kind = hueAt(p);
        if (mask.data[p * 4 + 3] || kind === null || claimed.has(kind))
          continue;
        if (
          mask.data[(p - 1) * 4 + 3] ||
          mask.data[(p + 1) * 4 + 3] ||
          mask.data[(p - width) * 4 + 3] ||
          mask.data[(p + width) * 4 + 3]
        )
          grown[p * 4 + 3] = 255;
      }
    out[part] = { width, height, data: grown };
  }
  return out;
}

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

/**
 * Every outfit style. Art's two paintings (Sept. 27) come first; the rest were
 * made in Firefly (Sept. 27, evening) by editing a sheet of our own three bare
 * bodies, so each outfit is painted on exactly our bodies, and cut by
 * cto-notes/firefly/outfits/cut_outfits.py (with a mask of the skin each one
 * leaves showing). Each part names the hue it is painted in and the palette
 * (PART_PALETTES) it may be recolored from.
 */
const FIREFLY_OUTFITS =
  "/Users/lamontae/political-game-play/cto-notes/firefly/outfits/cut";
interface OutfitSpec {
  readonly id: string;
  readonly label: string;
  readonly occasion: OutfitOccasion;
  /** Per part: the hue (or hues) it is painted in, and its palette. */
  readonly parts: Readonly<
    Record<string, readonly [Hue | readonly Hue[], string]>
  >;
  readonly art?: "formal" | "casual";
}
const OUTFITS: Record<"feminine" | "masculine", readonly OutfitSpec[]> = {
  feminine: [
    {
      id: "casual",
      label: "Everyday",
      occasion: "casual",
      art: "casual",
      parts: { top: ["red", "top"], bottom: ["gray", "bottom"] },
    },
    {
      id: "formal",
      label: "Pantsuit",
      occasion: "formal",
      art: "formal",
      parts: { suit: ["blue", "suit"], shirt: ["white", "shirt"] },
    },
    {
      id: "cardigan-jeans",
      label: "Cardigan and jeans",
      occasion: "casual",
      parts: {
        sweater: ["green", "sweater"],
        shirt: ["white", "shirt"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "hoodie-jeans",
      label: "Hoodie and jeans",
      occasion: "casual",
      parts: { top: ["gray", "top"], bottom: ["blue", "bottom"] },
    },
    {
      id: "sweater-slacks",
      label: "Sweater and slacks",
      occasion: "casual",
      parts: { sweater: ["yellow", "sweater"], bottom: ["gray", "bottom"] },
    },
    {
      id: "winter-coat",
      label: "Winter coat",
      occasion: "casual",
      parts: {
        coat: ["yellow", "coat"],
        scarf: ["red", "scarf"],
        bottom: ["gray", "bottom"],
      },
    },
    {
      id: "blouse-skirt",
      label: "Blouse and skirt",
      occasion: "formal",
      // A cream blouse: white in the light, yellowish in its shading.
      parts: { top: [["white", "yellow"], "shirt"], bottom: ["blue", "suit"] },
    },
    {
      id: "dress-blazer",
      label: "Dress and blazer",
      occasion: "formal",
      parts: { dress: ["red", "dress"], jacket: ["gray", "suit"] },
    },
    {
      id: "skirt-suit",
      label: "Skirt suit",
      occasion: "formal",
      parts: { suit: ["blue", "suit"], shirt: ["white", "shirt"] },
    },
    {
      id: "scrubs",
      label: "Scrubs",
      occasion: "work",
      parts: { scrubs: ["blue", "scrubs"] },
    },
    {
      id: "hi-vis",
      label: "Safety vest",
      occasion: "work",
      parts: { shirt: ["gray", "top"], bottom: ["blue", "bottom"] },
    },
    { id: "police", label: "Police uniform", occasion: "work", parts: {} },
    { id: "judge-robe", label: "Judge's robe", occasion: "work", parts: {} },
  ],
  masculine: [
    {
      id: "casual",
      label: "Everyday",
      occasion: "casual",
      art: "casual",
      parts: { top: ["blue", "top"], bottom: ["gray", "bottom"] },
    },
    {
      id: "formal",
      label: "Suit and tie",
      occasion: "formal",
      art: "formal",
      parts: {
        suit: ["gray", "suit"],
        shirt: ["white", "shirt"],
        tie: ["blue", "tie"],
      },
    },
    {
      id: "polo-khakis",
      label: "Polo and khakis",
      occasion: "casual",
      parts: { top: ["green", "top"], bottom: ["yellow", "bottom"] },
    },
    {
      id: "hoodie-jeans",
      label: "Hoodie and jeans",
      occasion: "casual",
      parts: { top: ["red", "top"], bottom: ["blue", "bottom"] },
    },
    {
      id: "sweater-collar",
      label: "Sweater and collar",
      occasion: "casual",
      parts: {
        sweater: ["gray", "sweater"],
        shirt: ["white", "shirt"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "work-jacket",
      label: "Work jacket",
      occasion: "casual",
      parts: {
        jacket: ["yellow", "coat"],
        shirt: ["gray", "top"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "overcoat",
      label: "Overcoat",
      occasion: "casual",
      parts: {
        coat: ["gray", "coat"],
        scarf: ["red", "scarf"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "double-breasted",
      label: "Double-breasted suit",
      occasion: "formal",
      parts: {
        suit: ["blue", "suit"],
        shirt: ["white", "shirt"],
        tie: ["red", "tie"],
      },
    },
    {
      id: "scrubs",
      label: "Scrubs",
      occasion: "work",
      parts: { scrubs: ["blue", "scrubs"] },
    },
    {
      id: "hi-vis",
      label: "Safety vest",
      occasion: "work",
      parts: { shirt: ["gray", "top"], bottom: ["blue", "bottom"] },
    },
    { id: "police", label: "Police uniform", occasion: "work", parts: {} },
    { id: "judge-robe", label: "Judge's robe", occasion: "work", parts: {} },
  ],
};

const presentations: Record<string, PackPresentation> = {};
for (const sex of ["feminine", "masculine"] as const) {
  const bodies: PackPresentation["bodies"] = {} as PackPresentation["bodies"];
  for (const build of BUILDS) {
    const bare = downscaleHalf(
      read(join(bodiesDir, `${bodyFile(sex, build)}.png`)),
    );
    bodies[build] = {
      file: write(bare, `body-${sex}-${build}.png`),
      anchors: measureBodyAnchors(bare),
      skin: skinOf(bare),
    };
  }
  const outfits: PackOutfit[] = [];
  for (const spec of OUTFITS[sex]) {
    const builds: Record<string, PackOutfit["builds"][BodyBuild]> = {};
    for (const build of BUILDS) {
      const bareFull = read(join(bodiesDir, `${bodyFile(sex, build)}.png`));
      const anchorsFull = measureBodyAnchors(bareFull);
      const painting = spec.art
        ? read(
            join(
              appearanceDir,
              "wardrobe",
              `${sex}-${spec.art}-${build}-onbody-v1.png`,
            ),
          )
        : read(
            join(FIREFLY_OUTFITS, `${sex}-${spec.id}-${build}-onbody-v1.png`),
          );
      const offset = registrationOffset(
        measureBodyAnchors(painting),
        anchorsFull,
        "head",
      );
      const skinFull = spec.art
        ? null
        : translateRaster(
            read(
              join(FIREFLY_OUTFITS, `${sex}-${spec.id}-${build}-skin-v1.png`),
            ),
            offset.dx,
            offset.dy,
          );
      const skinMask = skinFull
        ? Uint8Array.from(
            { length: skinFull.width * skinFull.height },
            (_, p) => (skinFull.data[p * 4 + 3]! > 128 ? 1 : 0),
          )
        : undefined;
      const garment = extractGarment(
        translateRaster(painting, offset.dx, offset.dy),
        bareFull,
        anchorsFull,
        "outfit",
        40,
        skinMask,
      );
      const hides = createRaster(bareFull.width, bareFull.height);
      garment.hidesBody!.forEach((hidden, p) => {
        if (hidden) hides.data[p * 4 + 3] = 255;
      });
      const halve = (mask: Raster) => {
        const half = downscaleHalf(mask);
        for (let i = 3; i < half.data.length; i += 4)
          half.data[i] = half.data[i]! >= 128 ? 255 : 0;
        return half;
      };
      const halfLayer = downscaleHalf(garment.layer);
      // The skin the extraction settled on: the mask, plus a neck that is
      // skin-colored above the neckline (see extract.ts).
      const usedSkin = garment.skin
        ? createRaster(bareFull.width, bareFull.height)
        : null;
      garment.skin?.forEach((skin, p) => {
        if (skin) usedSkin!.data[p * 4 + 3] = 255;
      });
      const halfSkin = usedSkin ? halve(usedSkin) : null;
      const anchors = bodies[build].anchors;
      const stem = `outfit-${sex}-${spec.id}-${build}`;
      const regions = Object.fromEntries(
        Object.entries(
          outfitRegions(
            halfLayer,
            Object.fromEntries(
              Object.entries(spec.parts).map(([part, [hue]]) => [
                part,
                typeof hue === "string" ? [hue] : hue,
              ]),
            ),
            halfSkin
              ? Uint8Array.from(
                  { length: halfSkin.width * halfSkin.height },
                  (_, p) => (halfSkin.data[p * 4 + 3]! ? 1 : 0),
                )
              : null,
            anchors.feet - Math.round((anchors.feet - anchors.top) * 0.08),
          ),
        ).map(([part, mask]) => [part, write(mask, `${stem}-${part}.png`)]),
      );
      builds[build] = {
        file: write(halfLayer, `${stem}.png`),
        hides: write(halve(hides), `${stem}-hides.png`),
        regions,
        ...(halfSkin ? { skin: write(halfSkin, `${stem}-skin.png`) } : {}),
      };
      console.log(
        sex,
        spec.id,
        build,
        JSON.stringify(offset),
        garment.clothPixels,
      );
    }
    outfits.push({
      id: spec.id,
      label: spec.label,
      occasion: spec.occasion,
      parts: Object.fromEntries(
        Object.entries(spec.parts).map(([part, [, palette]]) => [
          part,
          palette,
        ]),
      ),
      builds,
    });
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
  canvas: { width: 512, height: 768 + HEADROOM / 2 },
  presentations: presentations as PeoplePackManifest["presentations"],
};
writeFileSync(
  join(outDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`wrote ${outDir}`);
