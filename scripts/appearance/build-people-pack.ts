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
import { format, resolveConfig } from "prettier";
import {
  measureBodyAnchors,
  type BodyAnchors,
} from "../../src/presentation/appearance-engine/anchors";
import { extractGarment } from "../../src/presentation/appearance-engine/extract";
import {
  PEOPLE_PACK_VERSION,
  type BodyBuild,
  FACE_EXPRESSIONS,
  FACIAL_HAIR_STYLES,
  isSeatedPose,
  type BodyPose,
  type NamedBodyPose,
  type OutfitBuilds,
  type OutfitTag,
  type PackBody,
  type PackOutfit,
  type PeoplePackManifest,
  type PackPresentation,
  type PackFace,
  type PackView,
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

/**
 * The same six faces aged to their fifties and seventies (Sept. 27): Firefly
 * edits of the art team's faces, cut back onto the face canvas inside each
 * original face's own silhouette (cto-notes/firefly/faces/cut_faces.py), so
 * every hairstyle still fits. A person keeps their face number for life.
 */
const FIREFLY_FACES =
  "/Users/lamontae/political-game-play/cto-notes/firefly/faces/cut";
function agedFaces(sex: string): { id: string; file: string; dir: string }[] {
  return ["50s", "70s"].flatMap((band) =>
    [1, 2, 3, 4, 5, 6]
      .map((n) => ({
        id: `${band}-0${n}`,
        file: `face-${sex}-${band}-0${n}-v1.png`,
        dir: FIREFLY_FACES,
      }))
      .filter((face) => existsSync(join(face.dir, face.file))),
  );
}

const SOURCES: Record<
  "feminine" | "masculine",
  {
    faces: readonly { id: string; file: string; dir?: string }[];
    hair: readonly { id: string; stem: string; dir?: string }[];
  }
> = {
  feminine: {
    faces: [...artFaces("feminine"), ...agedFaces("feminine")],
    hair: [
      { id: "wavy-bob", stem: "hair-feminine-wavy-bob-01" },
      ...fireflyHair("feminine"),
    ],
  },
  masculine: {
    faces: [...artFaces("masculine"), ...agedFaces("masculine")],
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

/**
 * Claude CTO's posed paintings (Sept. 28, 2026), one folder per pose, each
 * with the bare body in the pose (<sex>-<build>-bare-v1.png) and every outfit
 * painted on it (<sex>-<outfit>-<build>-onbody-v1.png and -skin-v1.png), cut
 * like the standing ones. A standing pose is painted on the standing canvas
 * with the head where the standing body has it; a seated pose is registered
 * like the seated bodies (the seat on SEAT_ROW). A pose goes in the pack for
 * a presentation only when every build's body is painted, and an outfit in a
 * pose only when every build of it is; the game falls back for the rest.
 */
const FIREFLY_POSES =
  "/Users/lamontae/political-game-play/cto-notes/firefly/poses";
const STANDING_POSES = [
  "arms-folded",
  "explaining",
  "hand-on-hip",
  "hands-in-pockets",
  "podium",
] as const satisfies readonly NamedBodyPose[];
const SEATED_POSES = [
  "seated-leaning",
  "seated-legs-crossed",
  "seated-ankle-on-knee",
] as const satisfies readonly NamedBodyPose[];
/** Rows (at half size) a standing pose's head may sit from the standing one. */
const HEAD_TOLERANCE = 2;

/**
 * The whole person turned three quarters, toward the viewer's right (Claude
 * CTO, Sept. 28, 2026), laid out like the front: the bare bodies
 * (<sex>-<build>-bare-v1.png), each outfit (<sex>-<outfit>-<build>-onbody-v1
 * and -skin-v1), a folder per other pose, and the heads as separate layers
 * by the front ids: faces/face-<sex>-<id>.png and
 * hair/hair-<sex>-<id>-back.png and -front.png, all at full size on the same
 * canvas. A face or hairstyle not painted turned is left out, and the game
 * draws that person facing front.
 */
const FIREFLY_THREE_QUARTER =
  "/Users/lamontae/political-game-play/cto-notes/firefly/three-quarter";

/**
 * Claude CTO's expressions (Sept. 28, 2026): each face painted again in each
 * expression, as a separate head layer at full size on the same canvas,
 * face-<sex>-<id>-<expression>.png. The three-quarter faces' expressions sit
 * beside them in FIREFLY_THREE_QUARTER/faces. An expression not painted is
 * left out, and the game draws the neutral face for it.
 */
const FIREFLY_EXPRESSIONS =
  "/Users/lamontae/political-game-play/cto-notes/firefly/expressions";

function paintedExpressions(
  dir: string,
  sex: string,
  faceId: string,
  suffix: string,
): { readonly expressions?: PackFace["expressions"] } {
  const expressions = Object.fromEntries(
    FACE_EXPRESSIONS.filter((expression) => expression !== "neutral")
      .filter((expression) =>
        existsSync(join(dir, `face-${sex}-${faceId}-${expression}.png`)),
      )
      .map((expression) => {
        const head = downscaleHalf(
          read(join(dir, `face-${sex}-${faceId}-${expression}.png`)),
        );
        return [
          expression,
          {
            file: write(
              head,
              `face-${sex}-${faceId}-${expression}${suffix}.png`,
            ),
            skin: skinOf(head),
          },
        ];
      }),
  );
  return Object.keys(expressions).length > 0 ? { expressions } : {};
}

/**
 * Claude CTO's facial hair and glasses (Sept. 28, 2026): each a separate head
 * layer painted at full size on the canonical average head, on the same
 * canvas. Facial hair is facial-hair/facial-hair-<sex>-<style>.png, painted
 * dark brown so it takes the hair's color; glasses are glasses/glasses-<frame>
 * .png, the same frames for both presentations. The three-quarter heads keep
 * theirs in FIREFLY_THREE_QUARTER's facial-hair/ and glasses/. What is not
 * painted is left out, and the game draws no layer for it.
 */
const FIREFLY_FACIAL_HAIR =
  "/Users/lamontae/political-game-play/cto-notes/firefly/facial-hair";
const FIREFLY_GLASSES =
  "/Users/lamontae/political-game-play/cto-notes/firefly/glasses";

function headLayers(
  sex: string,
  facialHairDir: string,
  glassesDir: string,
  suffix: string,
): Pick<PackPresentation, "facialHair" | "glasses"> {
  const facialHair = FACIAL_HAIR_STYLES.filter((style) =>
    existsSync(join(facialHairDir, `facial-hair-${sex}-${style}.png`)),
  ).map((style) => ({
    id: style,
    file: write(
      downscaleHalf(
        read(join(facialHairDir, `facial-hair-${sex}-${style}.png`)),
      ),
      `facial-hair-${sex}-${style}${suffix}.png`,
    ),
  }));
  const frames = existsSync(glassesDir)
    ? readdirSync(glassesDir)
        .filter((file) => /^glasses-[a-z0-9-]+\.png$/.test(file))
        .map((file) => file.slice("glasses-".length, -".png".length))
        .sort()
    : [];
  const glasses = frames.map((frame) => ({
    id: frame,
    file: write(
      downscaleHalf(read(join(glassesDir, `glasses-${frame}.png`))),
      `glasses-${sex}-${frame}${suffix}.png`,
    ),
  }));
  return {
    ...(facialHair.length > 0 ? { facialHair } : {}),
    ...(glasses.length > 0 ? { glasses } : {}),
  };
}

function packPoses(
  painted: Map<BodyPose, Record<BodyBuild, { readonly body: PackBody }>>,
  poses: readonly NamedBodyPose[],
): NonNullable<PackPresentation["poses"]> {
  return Object.fromEntries(
    poses.map((pose) => [
      pose,
      {
        bodies: Object.fromEntries(
          BUILDS.map((build) => [build, painted.get(pose)![build].body]),
        ),
      },
    ]),
  );
}

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
  // Bodies painted in a pose: the bare painting at full size (for cutting
  // outfits from), the transform applied to it and its outfits as read, and
  // the pack entry. `dir` holds the view's standing bodies and a folder per
  // other pose; `suffix` ends every file name written for the view.
  type Painted = Record<
    BodyBuild,
    {
      readonly bareFull: Raster;
      readonly transform: (raster: Raster) => Raster;
      readonly body: PackBody & { readonly seatRow?: number };
    }
  >;
  const paintPostures = (
    dir: string,
    suffix: string,
    poses: readonly BodyPose[],
    /** The standing bodies a standing pose's head must match, if any. */
    headOfStanding: PackPresentation["bodies"] | null,
  ) => {
    const painted = new Map<BodyPose, Painted>();
    for (const pose of poses) {
      const bareOf = (build: BodyBuild) =>
        pose === "standing"
          ? join(dir, `${sex}-${build}-bare-v1.png`)
          : join(dir, pose, `${sex}-${build}-bare-v1.png`);
      if (!BUILDS.every((build) => existsSync(bareOf(build)))) continue;
      const seatedPose = isSeatedPose(pose);
      const bodiesInPose = {} as Painted;
      for (const build of BUILDS) {
        const source = read(bareOf(build));
        const at = measureBodyAnchors(source);
        const transform = seatedPose
          ? (raster: Raster) =>
              scaleAbout(raster, seatedScale, at.neck.centerX, at.feet)
          : (raster: Raster) => raster;
        const bareFull = transform(source);
        const bare = downscaleHalf(bareFull);
        const anchors = measureBodyAnchors(bare);
        if (!seatedPose && headOfStanding) {
          const standing = headOfStanding[build].anchors;
          const drift = Math.max(
            Math.abs(anchors.top - standing.top),
            Math.abs(anchors.neck.row - standing.neck.row),
            Math.abs(anchors.neck.centerX - standing.neck.centerX),
          );
          if (drift > HEAD_TOLERANCE)
            throw new Error(
              `${pose} ${sex} ${build}: the head is ${drift} pixels from the standing body's; paint it where the standing head is.`,
            );
        }
        const name = pose === "standing" ? "" : `-${pose}`;
        bodiesInPose[build] = {
          bareFull,
          transform,
          body: {
            file: write(bare, `body-${sex}-${build}${name}${suffix}.png`),
            anchors,
            skin: skinOf(bare),
            ...(seatedPose
              ? {
                  seatRow: Math.round(
                    (at.feet -
                      (at.feet - (SEAT_ROW + HEADROOM)) * seatedScale) /
                      2,
                  ),
                }
              : {}),
          },
        };
      }
      painted.set(pose, bodiesInPose);
    }
    return painted;
  };
  // Every outfit painted on those bodies, pose by pose; an outfit goes in a
  // pose only when every build of it is painted.
  const wearPostures = (
    spec: OutfitSpec,
    dir: string,
    suffix: string,
    painted: Map<BodyPose, Painted>,
  ) => {
    const worn = new Map<BodyPose, OutfitBuilds>();
    for (const [pose, inPose] of painted) {
      const painting = (build: BodyBuild, kind: "onbody" | "skin") =>
        join(
          pose === "standing" ? dir : join(dir, pose),
          `${sex}-${spec.id}-${build}-${kind}-v1.png`,
        );
      if (!BUILDS.every((build) => existsSync(painting(build, "onbody"))))
        continue;
      const builds: OutfitBuilds = {};
      const name = pose === "standing" ? "" : `-${pose}`;
      for (const build of BUILDS)
        (builds as Record<string, unknown>)[build] = dressedBody(
          sex,
          spec,
          build,
          inPose[build].bareFull,
          inPose[build].body.anchors,
          painting(build, "onbody"),
          painting(build, "skin"),
          `outfit-${sex}-${spec.id}-${build}${name}${suffix}`,
          inPose[build].transform,
        );
      worn.set(pose, builds);
    }
    return worn;
  };
  const namedPoses = (map: Map<BodyPose, unknown>) =>
    [...map.keys()].filter(
      (pose): pose is NamedBodyPose => pose !== "standing" && pose !== "seated",
    );
  const posed = paintPostures(
    FIREFLY_POSES,
    "",
    [...STANDING_POSES, ...SEATED_POSES],
    bodies,
  );
  // The whole person turned three quarters (see FIREFLY_THREE_QUARTER).
  const turned = paintPostures(
    FIREFLY_THREE_QUARTER,
    "-three-quarter",
    ["standing", "seated", ...STANDING_POSES, ...SEATED_POSES],
    null,
  );
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
    const outfitPoses = wearPostures(spec, FIREFLY_POSES, "", posed);
    const turnedWorn = turned.has("standing")
      ? wearPostures(spec, FIREFLY_THREE_QUARTER, "-three-quarter", turned)
      : new Map<BodyPose, OutfitBuilds>();
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
      ...(namedPoses(outfitPoses).length > 0
        ? {
            poses: Object.fromEntries(
              namedPoses(outfitPoses).map((pose) => [
                pose,
                outfitPoses.get(pose)!,
              ]),
            ),
          }
        : {}),
      // Turned only when it is painted standing on every body.
      ...(turnedWorn.has("standing")
        ? {
            views: {
              "three-quarter": {
                builds: turnedWorn.get("standing")!,
                ...(turnedWorn.has("seated")
                  ? { seated: turnedWorn.get("seated")! }
                  : {}),
                ...(namedPoses(turnedWorn).length > 0
                  ? {
                      poses: Object.fromEntries(
                        namedPoses(turnedWorn).map((pose) => [
                          pose,
                          turnedWorn.get(pose)!,
                        ]),
                      ),
                    }
                  : {}),
              },
            },
          }
        : {}),
    });
  }
  const faces = SOURCES[sex].faces.map((face) => {
    const head = downscaleHalf(
      read(join(face.dir ?? join(appearanceDir, "faces"), face.file)),
    );
    return {
      id: face.id,
      file: write(head, `face-${sex}-${face.id}.png`),
      skin: skinOf(head),
      ...paintedExpressions(FIREFLY_EXPRESSIONS, sex, face.id, ""),
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
  // The turned view, when its standing bodies are painted: its heads by the
  // front ids, each only where it is painted turned.
  const turnedView = (
    painted: Map<BodyPose, Painted>,
    frontFaces: readonly { readonly id: string }[],
    frontHair: readonly { readonly id: string }[],
  ): PackView | null => {
    const standing = painted.get("standing");
    if (!standing) return null;
    const dir = FIREFLY_THREE_QUARTER;
    const turnedFaces = frontFaces
      .filter((face) =>
        existsSync(join(dir, "faces", `face-${sex}-${face.id}.png`)),
      )
      .map((face) => {
        const head = downscaleHalf(
          read(join(dir, "faces", `face-${sex}-${face.id}.png`)),
        );
        return {
          id: face.id,
          file: write(head, `face-${sex}-${face.id}-three-quarter.png`),
          skin: skinOf(head),
          ...paintedExpressions(
            join(dir, "faces"),
            sex,
            face.id,
            "-three-quarter",
          ),
        };
      });
    const turnedHair = frontHair
      .filter((style) =>
        (["back", "front"] as const).every((side) =>
          existsSync(join(dir, "hair", `hair-${sex}-${style.id}-${side}.png`)),
        ),
      )
      .map((style) => {
        const layer = (side: "back" | "front") =>
          write(
            downscaleHalf(
              read(join(dir, "hair", `hair-${sex}-${style.id}-${side}.png`)),
            ),
            `hair-${sex}-${style.id}-${side}-three-quarter.png`,
          );
        return { id: style.id, back: layer("back"), front: layer("front") };
      });
    const seatedTurned = painted.get("seated");
    return {
      canonical: standing.average.body.anchors,
      bodies: Object.fromEntries(
        BUILDS.map((build) => [build, standing[build].body]),
      ) as PackView["bodies"],
      ...(seatedTurned
        ? {
            seated: {
              bodies: Object.fromEntries(
                BUILDS.map((build) => [build, seatedTurned[build].body]),
              ) as NonNullable<PackView["seated"]>["bodies"],
            },
          }
        : {}),
      ...(namedPoses(painted).length > 0
        ? { poses: packPoses(painted, namedPoses(painted)) }
        : {}),
      faces: turnedFaces,
      hair: turnedHair,
      ...headLayers(
        sex,
        join(dir, "facial-hair"),
        join(dir, "glasses"),
        "-three-quarter",
      ),
      toward: "right",
    };
  };
  presentations[sex] = {
    canonical: measureBodyAnchors(
      downscaleHalf(read(join(bodiesDir, `${bodyFile(sex, "average")}.png`))),
    ),
    bodies,
    faces,
    hair,
    ...headLayers(sex, FIREFLY_FACIAL_HAIR, FIREFLY_GLASSES, ""),
    seated: { bodies: seatedBodies },
    ...(namedPoses(posed).length > 0
      ? { poses: packPoses(posed, namedPoses(posed)) }
      : {}),
    outfits,
    ...(turnedView(turned, faces, hair)
      ? { views: { "three-quarter": turnedView(turned, faces, hair)! } }
      : {}),
  };
}

const manifest: PeoplePackManifest = {
  version: PEOPLE_PACK_VERSION,
  canvas: { width: 512, height: 768 + HEADROOM / 2 },
  presentations: presentations as PeoplePackManifest["presentations"],
};
// Written as the repository's formatter writes JSON, so `prettier --check`
// passes on a freshly built pack.
const manifestFile = join(outDir, "manifest.json");
writeFileSync(
  manifestFile,
  await format(JSON.stringify(manifest, null, 2), {
    ...(await resolveConfig(manifestFile)),
    filepath: manifestFile,
  }),
);
console.log(`wrote ${outDir}`);
