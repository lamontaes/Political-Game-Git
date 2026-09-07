import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

import type { CharacterComponentDefinition } from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";

/**
 * Morphology fit fixtures: three adult builds, one wardrobe.
 *
 * These exist because the bank cannot answer the question the fit contract
 * asks. Packet 76 measured `dev-g2-broad` against `dev-g2-slim` and found a
 * real 15–21% silhouette difference, but that is TWO builds, and a fit layer
 * has to be judged on whether one affine can span a range. So this set draws a
 * lean, an average and a heavy adult against one rig and hangs the same
 * wardrobe rasters on all three.
 *
 * **These numbers are declared, not observed.** No corpus of measured lean /
 * average / heavy production bodies exists in this repository yet — Pack 74
 * wave A is the request for one. The table below is a stated fixture geometry,
 * chosen so the thing that varies is the thing that varies on real people: the
 * waist moves far more between builds than the shoulder does. Everything the
 * fit report concludes is conditional on that table, and the report says so.
 * When real morphology masters land, re-point the measurement at them; the
 * derivation, the bounds and the tests do not change.
 *
 * Two deliberate simplifications, both stated so nobody reads more into the
 * pixels than is there:
 *
 * - **The bodies are armless.** Arms would put a limb's width into every row
 *   span and swamp the torso signal the fit is derived from. A sleeve fit is a
 *   real problem and it needs a body whose arms were measured; this fixture
 *   does not pretend to answer it.
 * - **Nothing here is art.** Flat fills from fixed geometry, well below any
 *   production master minimum. They are not in the asset manifest, they are in
 *   no catalog generation, and no person can resolve to them.
 *
 * Complexion is a single fixture paint value and carries no meaning. No body
 * geometry here encodes race or ethnicity, and none of these builds is derived
 * from any property of a person.
 */

export const GARMENT_FIT_FIXTURE_DIRECTORY = "art/fixtures/garment-fit";
export const GARMENT_FIT_FIXTURE_VERSION = "garment-fit-fixtures-v1";

export const FIT_BODY_LEAN = "fit-adult-lean";
export const FIT_BODY_AVERAGE = "fit-adult-average";
export const FIT_BODY_HEAVY = "fit-adult-heavy";

/** The one pose this set draws. A fit is never carried across viewpoints. */
export const FIT_POSE_FAMILY = "standing-neutral";
export const FIT_HEAD_ORIENTATION = "front";

export const FIT_BODY_CANVAS = { width: 420, height: 840 } as const;

/**
 * The rig, shared by all three builds and copied from the generation-2 dev
 * bodies on purpose.
 *
 * Identical anchors on differing silhouettes is exactly the situation 76A §5.2
 * found in the real bank, and it is the situation that makes the unfitted
 * compositor place one rectangle twice. Reproducing it here is the point.
 */
export const FIT_BODY_ANCHORS = [
  { id: "head", x: 0.5, y: 0.12 },
  { id: "torso", x: 0.5, y: 0.16 },
  { id: "hips", x: 0.5, y: 0.54 },
  { id: "feet", x: 0.5, y: 0.955 },
] as const;

export const FIT_BODY_ROOT = {
  convention: "pelvis-hip-center",
  x: 0.5,
  y: 0.55,
} as const;

export const FIT_BODY_CONTACTS = {
  leftFoot: { x: 0.38, y: 0.985 },
  rightFoot: { x: 0.62, y: 0.985 },
} as const;

/** The rows the torso profile is defined at, in body-canvas pixels. */
export const FIT_TORSO_ROWS = {
  shoulder: 130,
  chest: 215,
  waist: 330,
  hip: 460,
} as const;

/** Where the legs end and the foot block begins. */
const KNEE_Y = 630;
const ANKLE_Y = 790;
const SOLE_Y = 828;

export interface FitMorphology {
  readonly family: string;
  readonly label: "lean" | "average" | "heavy";
  /** Half-widths in canvas pixels at the four torso rows. */
  readonly shoulder: number;
  readonly chest: number;
  readonly waist: number;
  readonly hip: number;
  /** Half-width of one leg at the knee and at the ankle. */
  readonly knee: number;
  readonly ankle: number;
}

/**
 * The declared morphology table.
 *
 * Read the ratios, not the absolute numbers. From average to heavy the waist
 * grows 31% while the shoulder grows 10%; from average to lean the waist
 * shrinks 18% while the shoulder shrinks 10%. That non-uniformity is the whole
 * experiment: a single horizontal scale can absorb a uniform difference and
 * cannot absorb this one, and the fit report measures exactly how much it does
 * absorb before the bounded warp is reached for.
 */
export const FIT_MORPHOLOGIES: readonly FitMorphology[] = [
  {
    family: FIT_BODY_LEAN,
    label: "lean",
    shoulder: 104,
    chest: 96,
    waist: 74,
    hip: 84,
    knee: 30,
    ankle: 21,
  },
  {
    family: FIT_BODY_AVERAGE,
    label: "average",
    shoulder: 115,
    chest: 110,
    waist: 90,
    hip: 96,
    knee: 35,
    ankle: 25,
  },
  {
    family: FIT_BODY_HEAVY,
    label: "heavy",
    shoulder: 126,
    chest: 128,
    waist: 118,
    hip: 116,
    knee: 44,
    ankle: 30,
  },
];

export const FIT_AUTHORING_MORPHOLOGY = FIT_MORPHOLOGIES[1]!;

type Context2D = ReturnType<ReturnType<typeof PImage.make>["getContext"]>;

const CX = FIT_BODY_CANVAS.width / 2;

const SKIN = { base: "#d8b193", shade: "#b8907097" } as const;
const KNIT = { base: "#6d7a4e", shade: "#5b6741" } as const;
const TROUSER = { base: "#4a5160", shade: "#3c4250" } as const;
const LEATHER = "#5d3324";
const BADGE = { base: "#c8ccd4", shade: "#8d939e" } as const;

function fillPolygon(
  c: Context2D,
  color: string,
  points: readonly (readonly [number, number])[],
): void {
  c.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

function fillRect(
  c: Context2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

/**
 * The torso half-width of one build at any row, linear between the four
 * declared rows and held flat outside them.
 *
 * Exported because the measurement harness checks the raster it reads against
 * the geometry it was drawn from; a fixture whose pixels and whose table
 * disagree would quietly invalidate every number derived from it.
 */
export function torsoHalfWidth(morphology: FitMorphology, y: number): number {
  const rows = [
    [FIT_TORSO_ROWS.shoulder, morphology.shoulder],
    [FIT_TORSO_ROWS.chest, morphology.chest],
    [FIT_TORSO_ROWS.waist, morphology.waist],
    [FIT_TORSO_ROWS.hip, morphology.hip],
  ] as const;
  if (y <= rows[0][0]) return rows[0][1];
  if (y >= rows[3][0]) return rows[3][1];
  for (let index = 1; index < rows.length; index += 1) {
    const [upperY, upperW] = rows[index]!;
    if (y > upperY) continue;
    const [lowerY, lowerW] = rows[index - 1]!;
    const t = (y - lowerY) / (upperY - lowerY);
    return lowerW + t * (upperW - lowerW);
  }
  return rows[3][1];
}

/** One leg's half-width at any row below the hip. */
export function legHalfWidth(morphology: FitMorphology, y: number): number {
  const hipLeg = morphology.hip / 2 - 4;
  if (y <= FIT_TORSO_ROWS.hip) return hipLeg;
  if (y >= ANKLE_Y) return morphology.ankle;
  if (y <= KNEE_Y) {
    const t = (y - FIT_TORSO_ROWS.hip) / (KNEE_Y - FIT_TORSO_ROWS.hip);
    return hipLeg + t * (morphology.knee - hipLeg);
  }
  const t = (y - KNEE_Y) / (ANKLE_Y - KNEE_Y);
  return morphology.knee + t * (morphology.ankle - morphology.knee);
}

/** Horizontal centre of the left and right leg at a row. */
export function legCentres(
  morphology: FitMorphology,
  y: number,
): readonly [number, number] {
  const spread =
    y <= FIT_TORSO_ROWS.hip
      ? morphology.hip / 2
      : morphology.hip / 2 -
        ((y - FIT_TORSO_ROWS.hip) / (SOLE_Y - FIT_TORSO_ROWS.hip)) *
          (morphology.hip / 2 - morphology.ankle - 6);
  return [CX - spread, CX + spread];
}

/** Draws one row-by-row shape from a half-width function. */
function fillProfile(
  c: Context2D,
  color: string,
  fromY: number,
  toY: number,
  halfWidth: (y: number) => number,
  centre: (y: number) => number = () => CX,
): void {
  c.fillStyle = color;
  for (let y = Math.round(fromY); y < Math.round(toY); y += 1) {
    const half = halfWidth(y);
    if (half <= 0) continue;
    const cx = centre(y);
    c.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);
  }
}

function drawBody(c: Context2D, morphology: FitMorphology): void {
  // Neck, so the head anchor has something under it.
  fillRect(c, SKIN.shade, CX - 17, 96, 34, 36);
  fillProfile(c, SKIN.base, FIT_TORSO_ROWS.shoulder, FIT_TORSO_ROWS.hip, (y) =>
    torsoHalfWidth(morphology, y),
  );
  for (const side of [0, 1] as const) {
    fillProfile(
      c,
      SKIN.base,
      FIT_TORSO_ROWS.hip,
      ANKLE_Y,
      (y) => legHalfWidth(morphology, y),
      (y) => legCentres(morphology, y)[side]!,
    );
    fillProfile(
      c,
      SKIN.shade,
      ANKLE_Y,
      SOLE_Y,
      (y) => legHalfWidth(morphology, y),
      (y) => legCentres(morphology, y)[side]!,
    );
  }
  // Arms drawn INSIDE the torso outline as shading, so a row's painted span is
  // the torso span and nothing else.
  fillPolygon(c, SKIN.shade, [
    [CX - morphology.shoulder + 8, FIT_TORSO_ROWS.shoulder + 6],
    [CX - morphology.waist + 4, FIT_TORSO_ROWS.waist],
    [CX - morphology.waist + 26, FIT_TORSO_ROWS.waist],
    [CX - morphology.shoulder + 40, FIT_TORSO_ROWS.shoulder + 6],
  ]);
  fillPolygon(c, SKIN.shade, [
    [CX + morphology.shoulder - 8, FIT_TORSO_ROWS.shoulder + 6],
    [CX + morphology.waist - 4, FIT_TORSO_ROWS.waist],
    [CX + morphology.waist - 26, FIT_TORSO_ROWS.waist],
    [CX + morphology.shoulder - 40, FIT_TORSO_ROWS.shoulder + 6],
  ]);
}

/* -------------------------------------------------------------------------- */
/* The wardrobe, authored against the average build                            */
/* -------------------------------------------------------------------------- */

const TOP_CANVAS = { width: 420, height: 340 } as const;
const BOTTOM_CANVAS = { width: 420, height: 380 } as const;
const FOOTWEAR_CANVAS = { width: 420, height: 64 } as const;
const ACCESSORY_CANVAS = { width: 80, height: 120 } as const;

/** Slack a garment carries over the body it was drawn against, per side. */
export const GARMENT_EASE = 6;

const TOP_ANCHOR_Y = 0.16 * FIT_BODY_CANVAS.height;
const HIPS_ANCHOR_Y = 0.54 * FIT_BODY_CANVAS.height;
const FEET_ANCHOR_Y = 0.955 * FIT_BODY_CANVAS.height;

function drawTop(c: Context2D): void {
  const build = FIT_AUTHORING_MORPHOLOGY;
  fillProfile(
    c,
    KNIT.base,
    0,
    TOP_CANVAS.height,
    (row) => torsoHalfWidth(build, TOP_ANCHOR_Y + row) + GARMENT_EASE,
  );
  // A collar, so the garment is not a featureless block under review.
  fillProfile(c, KNIT.shade, 0, 14, () => 30);
}

function drawBottom(c: Context2D): void {
  const build = FIT_AUTHORING_MORPHOLOGY;
  const waistbandRows = 26;
  fillProfile(
    c,
    TROUSER.shade,
    0,
    waistbandRows,
    () => build.hip + GARMENT_EASE,
  );
  for (const side of [0, 1] as const) {
    fillProfile(
      c,
      TROUSER.base,
      waistbandRows,
      BOTTOM_CANVAS.height,
      (row) => legHalfWidth(build, HIPS_ANCHOR_Y + row) + GARMENT_EASE,
      (row) => legCentres(build, HIPS_ANCHOR_Y + row)[side]!,
    );
  }
}

function drawFootwear(c: Context2D): void {
  const build = FIT_AUTHORING_MORPHOLOGY;
  for (const side of [0, 1] as const) {
    const centre = legCentres(build, SOLE_Y)[side]!;
    fillRect(c, LEATHER, centre - 34, 10, 68, 46);
  }
}

function drawAccessory(c: Context2D): void {
  fillRect(c, BADGE.shade, 34, 0, 12, 58);
  fillRect(c, BADGE.base, 8, 58, 64, 54);
}

/* -------------------------------------------------------------------------- */
/* Fixture records                                                             */
/* -------------------------------------------------------------------------- */

export interface FitFixture {
  readonly assetId: string;
  readonly definition: CharacterComponentDefinition;
  readonly draw: (context: Context2D) => void;
}

/** Every build the wardrobe declares compatibility with. */
const ALL_BODY_FAMILIES = FIT_MORPHOLOGIES.map(
  (morphology) => morphology.family,
);

export const FIT_TOP_FAMILY = "fit-knit-olive";
export const FIT_BOTTOM_FAMILY = "fit-trousers-slate";
export const FIT_FOOTWEAR_FAMILY = "fit-derby-oxblood";
export const FIT_ACCESSORY_FAMILY = "fit-badge";

export const GARMENT_FIT_FIXTURES: readonly FitFixture[] = [
  ...FIT_MORPHOLOGIES.map((morphology) => ({
    assetId: `fit_body_adult_${morphology.label}_standing_v1`,
    definition: {
      kind: "body",
      family: morphology.family,
      catalog_generation: 1,
      layer: 20,
      canvas: FIT_BODY_CANVAS,
      pose_family: FIT_POSE_FAMILY,
      head_orientation: FIT_HEAD_ORIENTATION,
      complexion: "light",
      root: FIT_BODY_ROOT,
      attachment_anchors: FIT_BODY_ANCHORS.map((anchor) => ({ ...anchor })),
      contacts: {
        leftFoot: { ...FIT_BODY_CONTACTS.leftFoot },
        rightFoot: { ...FIT_BODY_CONTACTS.rightFoot },
      },
    } satisfies CharacterComponentDefinition,
    draw: (context: Context2D) => drawBody(context, morphology),
  })),
  {
    assetId: "fit_top_knit_average_standing_v1",
    definition: {
      kind: "top",
      family: FIT_TOP_FAMILY,
      catalog_generation: 1,
      layer: 25,
      canvas: TOP_CANVAS,
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: ALL_BODY_FAMILIES,
      compatible_pose_families: [FIT_POSE_FAMILY],
      compatible_head_orientations: [FIT_HEAD_ORIENTATION],
    },
    draw: drawTop,
  },
  {
    assetId: "fit_bottom_trousers_average_standing_v1",
    definition: {
      kind: "bottom",
      family: FIT_BOTTOM_FAMILY,
      catalog_generation: 1,
      layer: 22,
      canvas: BOTTOM_CANVAS,
      attaches_to: "hips",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: ALL_BODY_FAMILIES,
      compatible_pose_families: [FIT_POSE_FAMILY],
      compatible_head_orientations: [FIT_HEAD_ORIENTATION],
    },
    draw: drawBottom,
  },
  {
    assetId: "fit_footwear_derby_standing_v1",
    definition: {
      kind: "footwear",
      family: FIT_FOOTWEAR_FAMILY,
      catalog_generation: 1,
      layer: 21,
      canvas: FOOTWEAR_CANVAS,
      attaches_to: "feet",
      origin: { x: 0.5, y: 0.25 },
      compatible_body_families: ALL_BODY_FAMILIES,
      compatible_pose_families: [FIT_POSE_FAMILY],
      compatible_head_orientations: [FIT_HEAD_ORIENTATION],
    },
    draw: drawFootwear,
  },
  {
    assetId: "fit_accessory_badge_v1",
    definition: {
      kind: "accessory",
      family: FIT_ACCESSORY_FAMILY,
      catalog_generation: 1,
      layer: 26,
      canvas: ACCESSORY_CANVAS,
      attaches_to: "torso",
      origin: { x: 0.5, y: 0.05 },
      compatible_body_families: ALL_BODY_FAMILIES,
      compatible_pose_families: [FIT_POSE_FAMILY],
      compatible_head_orientations: [FIT_HEAD_ORIENTATION],
    },
    draw: drawAccessory,
  },
];

/** Where each garment's own canvas sits in body-canvas normalized units. */
export const FIT_GARMENT_EXTENTS: Readonly<
  Record<string, { readonly topY: number; readonly bottomY: number }>
> = {
  [FIT_TOP_FAMILY]: {
    topY: TOP_ANCHOR_Y / FIT_BODY_CANVAS.height,
    bottomY: (TOP_ANCHOR_Y + TOP_CANVAS.height) / FIT_BODY_CANVAS.height,
  },
  [FIT_BOTTOM_FAMILY]: {
    topY: HIPS_ANCHOR_Y / FIT_BODY_CANVAS.height,
    bottomY: (HIPS_ANCHOR_Y + BOTTOM_CANVAS.height) / FIT_BODY_CANVAS.height,
  },
  [FIT_FOOTWEAR_FAMILY]: {
    topY:
      (FEET_ANCHOR_Y - 0.25 * FOOTWEAR_CANVAS.height) / FIT_BODY_CANVAS.height,
    bottomY:
      (FEET_ANCHOR_Y + 0.75 * FOOTWEAR_CANVAS.height) / FIT_BODY_CANVAS.height,
  },
  [FIT_ACCESSORY_FAMILY]: {
    topY:
      (TOP_ANCHOR_Y - 0.05 * ACCESSORY_CANVAS.height) / FIT_BODY_CANVAS.height,
    bottomY:
      (TOP_ANCHOR_Y + 0.95 * ACCESSORY_CANVAS.height) / FIT_BODY_CANVAS.height,
  },
};

export interface FitFixtureOutput {
  readonly assetId: string;
  readonly filePath: string;
  readonly repositoryPath: string;
  readonly hash: string;
  readonly definition: CharacterComponentDefinition;
}

async function writePng(
  filePath: string,
  image: ReturnType<typeof PImage.make>,
): Promise<void> {
  const stream = fs.createWriteStream(filePath);
  const finished = new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  await PImage.encodePNGToStream(image, stream);
  await finished;
}

export async function renderGarmentFitFixtures(
  repositoryRoot: string,
  outputDirectory = GARMENT_FIT_FIXTURE_DIRECTORY,
): Promise<readonly FitFixtureOutput[]> {
  const absolute = path.resolve(repositoryRoot, outputDirectory);
  fs.mkdirSync(absolute, { recursive: true });
  const outputs: FitFixtureOutput[] = [];
  for (const fixture of GARMENT_FIT_FIXTURES) {
    const { width, height } = fixture.definition.canvas;
    const image = PImage.make(width, height);
    // pureimage bitmaps start opaque black; a fixture must be transparent
    // everywhere it is not drawn or every alpha reading below is meaningless.
    image.data.fill(0);
    fixture.draw(image.getContext("2d"));
    const fileName = `${fixture.assetId}.png`;
    const filePath = path.join(absolute, fileName);
    await writePng(filePath, image);
    outputs.push({
      assetId: fixture.assetId,
      filePath,
      repositoryPath: `${outputDirectory}/${fileName}`,
      hash: hashArtFile(filePath),
      definition: fixture.definition,
    });
  }
  return outputs;
}
