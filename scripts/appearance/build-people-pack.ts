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
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  measureBodyAnchors,
  type BodyAnchors,
} from "../../src/presentation/appearance-engine/anchors";
import { extractGarment } from "../../src/presentation/appearance-engine/extract";
import {
  PEOPLE_PACK_VERSION,
  type BodyBuild,
  type OutfitBuilds,
  type OutfitTag,
  type PackBody,
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
/**
 * The art team's six faces per presentation (Sept. 27, people-appearance/
 * faces), registered to one head: 01 to 03 as first delivered, 04 to 06 in
 * their corrected second versions.
 */
function artFaces(sex: string): { id: string; file: string }[] {
  return [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `20s30s-0${n}`,
    file: `face-${sex}-20s30s-0${n}-${n >= 4 ? "v2" : "v1"}.png`,
  }));
}

const SOURCES: Record<
  "feminine" | "masculine",
  {
    faces: readonly { id: string; file: string }[];
    hair: readonly { id: string; stem: string; dir?: string }[];
  }
> = {
  feminine: {
    faces: artFaces("feminine"),
    hair: [
      { id: "wavy-bob", stem: "hair-feminine-wavy-bob-01" },
      ...fireflyHair("feminine"),
    ],
  },
  masculine: {
    faces: artFaces("masculine"),
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
  readonly tags: readonly OutfitTag[];
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
      tags: ["casual", "business"],
      art: "casual",
      parts: { top: ["red", "top"], bottom: ["gray", "bottom"] },
    },
    {
      id: "formal",
      label: "Pantsuit",
      tags: ["formal", "business"],
      art: "formal",
      parts: { suit: ["blue", "suit"], shirt: ["white", "shirt"] },
    },
    {
      id: "cardigan-jeans",
      label: "Cardigan and jeans",
      tags: ["casual"],
      parts: {
        sweater: ["green", "sweater"],
        shirt: ["white", "shirt"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "hoodie-jeans",
      label: "Hoodie and jeans",
      tags: ["casual"],
      parts: { top: ["gray", "top"], bottom: ["blue", "bottom"] },
    },
    {
      id: "sweater-slacks",
      label: "Sweater and slacks",
      tags: ["casual", "business"],
      parts: { sweater: ["yellow", "sweater"], bottom: ["gray", "bottom"] },
    },
    {
      id: "winter-coat",
      label: "Winter coat",
      tags: ["cold"],
      parts: {
        coat: ["yellow", "coat"],
        scarf: ["red", "scarf"],
        bottom: ["gray", "bottom"],
      },
    },
    {
      id: "blouse-skirt",
      label: "Blouse and skirt",
      tags: ["business", "formal"],
      // A cream blouse: white in the light, yellowish in its shading.
      parts: { top: [["white", "yellow"], "shirt"], bottom: ["blue", "suit"] },
    },
    {
      id: "dress-blazer",
      label: "Dress and blazer",
      tags: ["business", "formal"],
      parts: { dress: ["red", "dress"], jacket: ["gray", "suit"] },
    },
    {
      id: "skirt-suit",
      label: "Skirt suit",
      tags: ["formal", "business"],
      parts: { suit: ["blue", "suit"], shirt: ["white", "shirt"] },
    },
    {
      id: "scrubs",
      label: "Scrubs",
      tags: ["uniform"],
      parts: { scrubs: ["blue", "scrubs"] },
    },
    {
      id: "hi-vis",
      label: "Safety vest",
      tags: ["uniform"],
      // The vest's silver stripes are the shirt's gray, so only the jeans recolor.
      parts: { bottom: ["blue", "bottom"] },
    },
    { id: "police", label: "Police uniform", tags: ["uniform"], parts: {} },
    { id: "judge-robe", label: "Judge's robe", tags: ["uniform"], parts: {} },
  ],
  masculine: [
    {
      id: "casual",
      label: "Everyday",
      tags: ["casual", "business"],
      art: "casual",
      // A pale blue shirt: much of it reads as white in the light.
      parts: { top: [["blue", "white"], "top"], bottom: ["gray", "bottom"] },
    },
    {
      id: "formal",
      label: "Suit and tie",
      tags: ["formal", "business"],
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
      tags: ["casual", "business"],
      parts: { top: ["green", "top"], bottom: ["yellow", "bottom"] },
    },
    {
      id: "hoodie-jeans",
      label: "Hoodie and jeans",
      tags: ["casual"],
      parts: { top: ["red", "top"], bottom: ["blue", "bottom"] },
    },
    {
      id: "sweater-collar",
      label: "Sweater and collar",
      tags: ["casual", "business"],
      parts: {
        sweater: ["gray", "sweater"],
        shirt: ["white", "shirt"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "work-jacket",
      label: "Work jacket",
      tags: ["casual"],
      parts: {
        jacket: ["yellow", "coat"],
        shirt: ["gray", "top"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "overcoat",
      label: "Overcoat",
      tags: ["cold"],
      parts: {
        coat: ["gray", "coat"],
        scarf: ["red", "scarf"],
        bottom: ["blue", "bottom"],
      },
    },
    {
      id: "double-breasted",
      label: "Double-breasted suit",
      tags: ["formal"],
      parts: {
        suit: ["blue", "suit"],
        shirt: ["white", "shirt"],
        tie: ["red", "tie"],
      },
    },
    {
      id: "scrubs",
      label: "Scrubs",
      tags: ["uniform"],
      parts: { scrubs: ["blue", "scrubs"] },
    },
    {
      id: "hi-vis",
      label: "Safety vest",
      tags: ["uniform"],
      // The vest's silver stripes are the shirt's gray, so only the jeans recolor.
      parts: { bottom: ["blue", "bottom"] },
    },
    { id: "police", label: "Police uniform", tags: ["uniform"], parts: {} },
    { id: "judge-robe", label: "Judge's robe", tags: ["uniform"], parts: {} },
  ],
};

/**
 * One outfit on one body: registered by the head, extracted as a whole
 * outfit (with the painting's skin mask, when it has one), halved, and its
 * garment parts told apart. Writes the files and returns the pack entry.
 */
function dressedBody(
  sex: "feminine" | "masculine",
  spec: OutfitSpec,
  build: BodyBuild,
  bareFull: Raster,
  anchors: BodyAnchors,
  paintingFile: string,
  skinFile: string | null,
  stem: string,
  /** Applied to the painting and its skin mask as read (the seated scale). */
  transform: (raster: Raster) => Raster = (raster) => raster,
): NonNullable<OutfitBuilds[BodyBuild]> {
  const anchorsFull = measureBodyAnchors(bareFull);
  const painting = transform(read(paintingFile));
  // Firefly outfits were painted on exactly our bodies (cut_outfits.py), so
  // they are not moved: measuring their heads can be a pixel off, and a pixel
  // splits every half-size pixel of the skin mask. The art team's paintings
  // are registered by the head.
  const offset = skinFile
    ? { dx: 0, dy: 0 }
    : registrationOffset(measureBodyAnchors(painting), anchorsFull, "head");
  const skinFull = skinFile
    ? translateRaster(transform(read(skinFile)), offset.dx, offset.dy)
    : null;
  const skinMask = skinFull
    ? Uint8Array.from({ length: skinFull.width * skinFull.height }, (_, p) =>
        skinFull.data[p * 4 + 3]! > 128 ? 1 : 0,
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
  console.log(stem, JSON.stringify(offset), garment.clothPixels);
  return {
    file: write(halfLayer, `${stem}.png`),
    hides: write(halve(hides), `${stem}-hides.png`),
    regions,
    ...(halfSkin ? { skin: write(halfSkin, `${stem}-skin.png`) } : {}),
  };
}

/**
 * The art team's seated bodies (Sept. 2026, output/modular-seated-front-v1):
 * men with open knees and hands on the thighs, women with knees together and
 * hands in the lap, each registered so the seat (the bottom of the underwear
 * at the centerline) is row 951 and the soles row 1503 on every build
 * (seat-registration-v1.json, close-knees-seat-registration-v1.json).
 */
const SEATED_BODIES =
  "/Users/lamontae/Documents/PG-LAND/output/modular-seated-front-v1/prepared";
const SEATED_FILE: Record<
  "feminine" | "masculine",
  Record<BodyBuild, string>
> = {
  masculine: {
    lean: "seat-registered/masculine-lean-seated-front-bare-v1.png",
    average: "seat-registered/masculine-average-seated-front-bare-v1.png",
    fuller: "seat-registered/masculine-fuller-seated-front-bare-v1.png",
  },
  feminine: {
    lean: "close-knees-seat-registered/feminine-lean-seated-front-close-knees-bare-v1.png",
    average:
      "close-knees-seat-registered/feminine-average-seated-front-close-knees-bare-v1.png",
    fuller:
      "close-knees-seat-registered/feminine-fuller-seated-front-close-knees-bare-v1.png",
  },
};
const SEAT_ROW = 951;

/**
 * A raster scaled by k about a point (bilinear, alpha-premultiplied), on the
 * same canvas.
 */
function scaleAbout(raster: Raster, k: number, cx: number, cy: number): Raster {
  const { width, height, data } = raster;
  const out = createRaster(width, height);
  const taps = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const sx = cx + (x - cx) / k;
      const sy = cy + (y - cy) / k;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      let alpha = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (const [dx, dy] of taps) {
        const tx = x0 + dx;
        const ty = y0 + dy;
        if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
        const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
        const i = (ty * width + tx) * 4;
        const pa = (data[i + 3]! / 255) * w;
        alpha += pa;
        r += data[i]! * pa;
        g += data[i + 1]! * pa;
        b += data[i + 2]! * pa;
      }
      if (alpha <= 0) continue;
      const o = (y * width + x) * 4;
      out.data[o] = r / alpha;
      out.data[o + 1] = g / alpha;
      out.data[o + 2] = b / alpha;
      out.data[o + 3] = alpha * 255;
    }
  return out;
}
/** Firefly outfits painted on the seated bodies, cut like the standing ones. */
const FIREFLY_OUTFITS_SEATED =
  "/Users/lamontae/political-game-play/cto-notes/firefly/outfits/cut-seated";

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
  const seatedBodies = {} as Record<
    BodyBuild,
    PackBody & { readonly seatRow: number }
  >;
  // One head size for everybody. The seated bodies were painted larger than
  // the standing ones, so each is scaled, about the middle of its soles, by
  // the ratio of the standing average body's head to the seated average
  // body's head (width and height averaged). Its outfits scale with it.
  const headOf = (anchors: BodyAnchors) => ({
    w: anchors.head.right - anchors.head.left,
    h: anchors.neck.row - anchors.top,
  });
  const standingHead = headOf(
    measureBodyAnchors(
      read(join(bodiesDir, `${bodyFile(sex, "average")}.png`)),
    ),
  );
  const seatedHead = headOf(
    measureBodyAnchors(read(join(SEATED_BODIES, SEATED_FILE[sex].average))),
  );
  const seatedScale =
    (standingHead.w / seatedHead.w + standingHead.h / seatedHead.h) / 2;
  console.log(sex, "seated scale", seatedScale.toFixed(3));
  const seatedBareFull = {} as Record<BodyBuild, Raster>;
  const seatedTransform = {} as Record<BodyBuild, (raster: Raster) => Raster>;
  for (const build of BUILDS) {
    const source = read(join(SEATED_BODIES, SEATED_FILE[sex][build]));
    const at = measureBodyAnchors(source);
    seatedTransform[build] = (raster) =>
      scaleAbout(raster, seatedScale, at.neck.centerX, at.feet);
    seatedBareFull[build] = seatedTransform[build](source);
    const bare = downscaleHalf(seatedBareFull[build]);
    seatedBodies[build] = {
      file: write(bare, `body-${sex}-${build}-seated.png`),
      anchors: measureBodyAnchors(bare),
      skin: skinOf(bare),
      seatRow: Math.round(
        (at.feet - (at.feet - (SEAT_ROW + HEADROOM)) * seatedScale) / 2,
      ),
    };
  }
  const outfits: PackOutfit[] = [];
  for (const spec of OUTFITS[sex]) {
    const builds: OutfitBuilds = {};
    const seated: OutfitBuilds = {};
    for (const build of BUILDS) {
      (builds as Record<string, unknown>)[build] = dressedBody(
        sex,
        spec,
        build,
        read(join(bodiesDir, `${bodyFile(sex, build)}.png`)),
        bodies[build].anchors,
        spec.art
          ? join(
              appearanceDir,
              "wardrobe",
              `${sex}-${spec.art}-${build}-onbody-v1.png`,
            )
          : join(FIREFLY_OUTFITS, `${sex}-${spec.id}-${build}-onbody-v1.png`),
        spec.art
          ? null
          : join(FIREFLY_OUTFITS, `${sex}-${spec.id}-${build}-skin-v1.png`),
        `outfit-${sex}-${spec.id}-${build}`,
      );
      const seatedPainting = join(
        FIREFLY_OUTFITS_SEATED,
        `${sex}-${spec.id}-${build}-onbody-v1.png`,
      );
      if (existsSync(seatedPainting))
        (seated as Record<string, unknown>)[build] = dressedBody(
          sex,
          spec,
          build,
          seatedBareFull[build],
          seatedBodies[build].anchors,
          seatedPainting,
          join(
            FIREFLY_OUTFITS_SEATED,
            `${sex}-${spec.id}-${build}-skin-v1.png`,
          ),
          `outfit-${sex}-${spec.id}-${build}-seated`,
          seatedTransform[build],
        );
    }
    outfits.push({
      id: spec.id,
      label: spec.label,
      tags: spec.tags,
      parts: Object.fromEntries(
        Object.entries(spec.parts).map(([part, [, palette]]) => [
          part,
          palette,
        ]),
      ),
      builds,
      // Seated only when every body has it.
      ...(BUILDS.every((build) => seated[build]) ? { seated } : {}),
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
    seated: { bodies: seatedBodies },
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
