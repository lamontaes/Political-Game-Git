import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

import type { CharacterComponentDefinition } from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";

/**
 * DEV / NON-PRODUCTION modular character fixtures.
 *
 * These flat procedural silhouettes exist only to prove the runtime
 * compositor: shared body, interchangeable heads, hair, garments, and optional
 * layers. They are drawn by this script from fixed geometry, so their bytes
 * and hashes are reproducible and hash-verifiable. They are not art
 * direction, not the production character set, and not a canvas-size
 * standard: every size below is a fixture choice.
 */

export const DEV_CHARACTER_FIXTURE_DIRECTORY =
  "art/generated/approved/dev-modular";
export const DEV_CHARACTER_FIXTURE_VERSION = "dev-character-fixtures-v1";

export const DEV_BODY_FAMILY = "dev-adult";

type Context2D = ReturnType<ReturnType<typeof PImage.make>["getContext"]>;

interface DevFixtureSpec {
  readonly assetId: string;
  readonly definition: CharacterComponentDefinition;
  readonly draw: (context: Context2D) => void;
}

const KAPPA = 0.5522847498;

function ellipsePath(
  context: Context2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  context.beginPath();
  context.moveTo(cx - rx, cy);
  context.bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry);
  context.bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy);
  context.bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry);
  context.bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy);
  context.closePath();
}

function polygon(
  context: Context2D,
  points: readonly (readonly [number, number])[],
): void {
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function fillPolygon(
  context: Context2D,
  color: string,
  points: readonly (readonly [number, number])[],
): void {
  polygon(context, points);
  context.fillStyle = color;
  context.fill();
}

function fillEllipse(
  context: Context2D,
  color: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  ellipsePath(context, cx, cy, rx, ry);
  context.fillStyle = color;
  context.fill();
}

function fillRect(
  context: Context2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

const BODY = "#a8a49c";
const BODY_SHADE = "#8f8b83";

// Body rig conventions shared by the dev-adult family. Anchors are metadata
// in the body canvas: head = neck top, torso = shoulder line, hips = waist,
// feet = sole line.
const STANDING_ANCHORS = [
  { id: "head", x: 0.5, y: 0.125 },
  { id: "torso", x: 0.5, y: 0.1625 },
  { id: "hips", x: 0.5, y: 0.55 },
  { id: "feet", x: 0.5, y: 0.965 },
] as const;
const SEATED_ANCHORS = [
  { id: "head", x: 0.5, y: 0.15625 },
  { id: "torso", x: 0.5, y: 0.203125 },
  { id: "hips", x: 0.5, y: 0.625 },
  { id: "feet", x: 0.5, y: 0.955 },
] as const;

const HEAD_ANCHOR_ORIGIN = { x: 0.5, y: 0.95 } as const;
const HEAD_FAMILIES = ["dev-oval", "dev-round"] as const;

export const DEV_CHARACTER_FIXTURES: readonly DevFixtureSpec[] = [
  {
    assetId: "dev_body_adult_standing_v1",
    definition: {
      kind: "body",
      family: DEV_BODY_FAMILY,
      catalog_generation: 1,
      layer: 20,
      canvas: { width: 400, height: 800 },
      pose_family: "standing-neutral",
      head_orientation: "front",
      root: { convention: "pelvis-hip-center", x: 0.5, y: 0.56 },
      attachment_anchors: [...STANDING_ANCHORS],
    },
    draw: (c) => {
      fillRect(c, BODY_SHADE, 184, 100, 32, 34); // neck
      fillPolygon(c, BODY, [
        [80, 130],
        [320, 130],
        [290, 440],
        [110, 440],
      ]); // torso
      fillPolygon(c, BODY_SHADE, [
        [80, 130],
        [40, 460],
        [84, 470],
        [124, 160],
      ]); // left arm
      fillPolygon(c, BODY_SHADE, [
        [320, 130],
        [360, 460],
        [316, 470],
        [276, 160],
      ]); // right arm
      fillRect(c, BODY, 116, 440, 76, 322); // left leg
      fillRect(c, BODY, 208, 440, 76, 322); // right leg
      fillRect(c, BODY_SHADE, 108, 762, 92, 28); // left foot
      fillRect(c, BODY_SHADE, 200, 762, 92, 28); // right foot
    },
  },
  {
    assetId: "dev_body_adult_seated_v1",
    definition: {
      kind: "body",
      family: DEV_BODY_FAMILY,
      catalog_generation: 1,
      layer: 20,
      canvas: { width: 400, height: 640 },
      pose_family: "seated-at-desk",
      head_orientation: "front",
      root: { convention: "pelvis-hip-center", x: 0.5, y: 0.65 },
      attachment_anchors: [...SEATED_ANCHORS],
    },
    draw: (c) => {
      fillRect(c, BODY_SHADE, 184, 100, 32, 34); // neck
      fillPolygon(c, BODY, [
        [80, 130],
        [320, 130],
        [296, 400],
        [104, 400],
      ]); // torso
      fillPolygon(c, BODY_SHADE, [
        [80, 130],
        [52, 380],
        [96, 386],
        [124, 160],
      ]);
      fillPolygon(c, BODY_SHADE, [
        [320, 130],
        [348, 380],
        [304, 386],
        [276, 160],
      ]);
      fillRect(c, BODY, 96, 400, 208, 76); // thighs toward camera
      fillRect(c, BODY, 104, 476, 72, 130); // left shin
      fillRect(c, BODY, 224, 476, 72, 130); // right shin
      fillRect(c, BODY_SHADE, 96, 606, 88, 24);
      fillRect(c, BODY_SHADE, 216, 606, 88, 24);
    },
  },
  {
    assetId: "dev_head_round_v1",
    definition: {
      kind: "head",
      family: "dev-round",
      catalog_generation: 1,
      layer: 30,
      canvas: { width: 200, height: 200 },
      attaches_to: "head",
      origin: HEAD_ANCHOR_ORIGIN,
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillEllipse(c, "#c48e64", 22, 110, 12, 16); // ears
      fillEllipse(c, "#c48e64", 178, 110, 12, 16);
      fillEllipse(c, "#d9a679", 100, 108, 78, 80);
      fillEllipse(c, "#3b2a1e", 74, 104, 6, 7); // eyes
      fillEllipse(c, "#3b2a1e", 126, 104, 6, 7);
      fillRect(c, "#b07a52", 84, 146, 32, 5); // mouth
    },
  },
  {
    assetId: "dev_head_oval_v1",
    definition: {
      kind: "head",
      family: "dev-oval",
      catalog_generation: 1,
      layer: 30,
      canvas: { width: 200, height: 200 },
      attaches_to: "head",
      origin: HEAD_ANCHOR_ORIGIN,
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillEllipse(c, "#75492f", 32, 112, 11, 15);
      fillEllipse(c, "#75492f", 168, 112, 11, 15);
      fillEllipse(c, "#8d5a3c", 100, 106, 66, 84);
      fillEllipse(c, "#1f140c", 76, 104, 6, 7);
      fillEllipse(c, "#1f140c", 124, 104, 6, 7);
      fillRect(c, "#5e3a26", 84, 150, 32, 5);
    },
  },
  {
    assetId: "dev_hair_crop_front_v1",
    definition: {
      kind: "hair-front",
      family: "dev-crop",
      catalog_generation: 1,
      layer: 40,
      canvas: { width: 200, height: 200 },
      attaches_to: "head",
      origin: HEAD_ANCHOR_ORIGIN,
      compatible_head_families: [...HEAD_FAMILIES],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillEllipse(c, "#2b2018", 100, 62, 84, 42);
      fillRect(c, "#2b2018", 20, 62, 160, 22);
    },
  },
  {
    assetId: "dev_hair_long_front_v1",
    definition: {
      kind: "hair-front",
      family: "dev-long",
      catalog_generation: 1,
      layer: 40,
      canvas: { width: 200, height: 200 },
      attaches_to: "head",
      origin: HEAD_ANCHOR_ORIGIN,
      compatible_head_families: [...HEAD_FAMILIES],
      compatible_head_orientations: ["front"],
      paired_with: "dev_hair_long_back_v1",
    },
    draw: (c) => {
      fillEllipse(c, "#5a3a1e", 100, 58, 88, 40);
      fillRect(c, "#5a3a1e", 14, 58, 36, 120); // left fall
      fillRect(c, "#5a3a1e", 150, 58, 36, 120); // right fall
    },
  },
  {
    assetId: "dev_hair_long_back_v1",
    definition: {
      kind: "hair-back",
      family: "dev-long",
      catalog_generation: 1,
      layer: 10,
      canvas: { width: 240, height: 300 },
      attaches_to: "head",
      origin: { x: 0.5, y: 190 / 300 },
      compatible_head_families: [...HEAD_FAMILIES],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillEllipse(c, "#4a2e16", 120, 80, 96, 60);
      fillRect(c, "#4a2e16", 24, 80, 192, 190);
      fillEllipse(c, "#4a2e16", 120, 270, 96, 26);
    },
  },
  {
    assetId: "dev_eyewear_round_glasses_v1",
    definition: {
      kind: "eyewear",
      family: "dev-round-glasses",
      catalog_generation: 1,
      layer: 45,
      canvas: { width: 200, height: 200 },
      attaches_to: "head",
      origin: HEAD_ANCHOR_ORIGIN,
      compatible_head_families: [...HEAD_FAMILIES],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      c.strokeStyle = "#1d1d1d";
      c.lineWidth = 4;
      ellipsePath(c, 74, 104, 22, 20);
      c.stroke();
      ellipsePath(c, 126, 104, 22, 20);
      c.stroke();
      fillRect(c, "#1d1d1d", 96, 102, 8, 4);
    },
  },
  {
    assetId: "dev_top_blazer_navy_standing_v1",
    definition: {
      kind: "top",
      family: "dev-blazer-navy",
      catalog_generation: 1,
      layer: 25,
      canvas: { width: 400, height: 340 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_pose_families: ["standing-neutral"],
    },
    draw: (c) => drawBlazer(c, 340),
  },
  {
    assetId: "dev_top_blazer_navy_seated_v1",
    definition: {
      kind: "top",
      family: "dev-blazer-navy",
      catalog_generation: 1,
      layer: 25,
      canvas: { width: 400, height: 290 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_pose_families: ["seated-at-desk"],
    },
    draw: (c) => drawBlazer(c, 290),
  },
  {
    assetId: "dev_top_tee_teal_standing_v1",
    definition: {
      kind: "top",
      family: "dev-tee-teal",
      catalog_generation: 1,
      layer: 25,
      canvas: { width: 400, height: 320 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_pose_families: ["standing-neutral"],
    },
    draw: (c) => drawTee(c, 320),
  },
  {
    assetId: "dev_top_tee_teal_seated_v1",
    definition: {
      kind: "top",
      family: "dev-tee-teal",
      catalog_generation: 1,
      layer: 25,
      canvas: { width: 400, height: 280 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_pose_families: ["seated-at-desk"],
    },
    draw: (c) => drawTee(c, 280),
  },
  {
    assetId: "dev_bottom_slacks_charcoal_standing_v1",
    definition: {
      kind: "bottom",
      family: "dev-slacks-charcoal",
      catalog_generation: 1,
      layer: 22,
      canvas: { width: 400, height: 340 },
      attaches_to: "hips",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_pose_families: ["standing-neutral"],
    },
    draw: (c) => {
      fillRect(c, "#2f2f35", 106, 0, 188, 30); // waistband
      fillRect(c, "#3a3a40", 108, 26, 84, 306);
      fillRect(c, "#3a3a40", 208, 26, 84, 306);
    },
  },
  {
    assetId: "dev_bottom_slacks_charcoal_seated_v1",
    definition: {
      kind: "bottom",
      family: "dev-slacks-charcoal",
      catalog_generation: 1,
      layer: 22,
      canvas: { width: 400, height: 220 },
      attaches_to: "hips",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_pose_families: ["seated-at-desk"],
    },
    draw: (c) => {
      fillRect(c, "#2f2f35", 100, 0, 200, 26);
      fillRect(c, "#3a3a40", 92, 20, 216, 64); // thighs
      fillRect(c, "#3a3a40", 100, 80, 80, 140); // shins
      fillRect(c, "#3a3a40", 220, 80, 80, 140);
    },
  },
  {
    assetId: "dev_footwear_oxford_black_v1",
    definition: {
      kind: "footwear",
      family: "dev-oxford-black",
      catalog_generation: 1,
      layer: 21,
      canvas: { width: 400, height: 60 },
      attaches_to: "feet",
      origin: { x: 0.5, y: 0.25 },
      compatible_body_families: [DEV_BODY_FAMILY],
      compatible_pose_families: ["standing-neutral"],
    },
    draw: (c) => {
      fillEllipse(c, "#141414", 152, 32, 54, 20);
      fillEllipse(c, "#141414", 248, 32, 54, 20);
    },
  },
  {
    assetId: "dev_accessory_lapel_pin_v1",
    definition: {
      kind: "accessory",
      family: "dev-lapel-pin",
      catalog_generation: 1,
      layer: 26,
      canvas: { width: 40, height: 40 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0.5 },
      compatible_body_families: [DEV_BODY_FAMILY],
    },
    draw: (c) => {
      fillEllipse(c, "#c9a24b", 20, 20, 14, 14);
      fillEllipse(c, "#8a6520", 20, 20, 6, 6);
    },
  },
];

function drawBlazer(c: Context2D, height: number): void {
  const hem = height - 8;
  fillPolygon(c, "#1f2d4d", [
    [72, 0],
    [328, 0],
    [304, hem],
    [96, hem],
  ]);
  fillPolygon(c, "#182440", [
    [72, 0],
    [36, hem],
    [82, hem],
    [116, 24],
  ]); // left sleeve
  fillPolygon(c, "#182440", [
    [328, 0],
    [364, hem],
    [318, hem],
    [284, 24],
  ]); // right sleeve
  fillPolygon(c, "#e8e2d6", [
    [160, 0],
    [240, 0],
    [200, 96],
  ]); // shirt V
  fillPolygon(c, "#2a3a5e", [
    [160, 0],
    [200, 96],
    [178, 110],
    [138, 20],
  ]); // lapels
  fillPolygon(c, "#2a3a5e", [
    [240, 0],
    [200, 96],
    [222, 110],
    [262, 20],
  ]);
}

function drawTee(c: Context2D, height: number): void {
  const hem = height - 8;
  fillPolygon(c, "#2f8f8a", [
    [76, 0],
    [324, 0],
    [302, hem],
    [98, hem],
  ]);
  fillPolygon(c, "#277b77", [
    [76, 0],
    [40, 120],
    [92, 132],
    [118, 26],
  ]); // short sleeves
  fillPolygon(c, "#277b77", [
    [324, 0],
    [360, 120],
    [308, 132],
    [282, 26],
  ]);
  fillEllipse(c, "#1f5f5c", 200, 4, 44, 14); // collar
}

export interface DevCharacterFixtureOutput {
  readonly assetId: string;
  readonly filePath: string;
  readonly repositoryPath: string;
  readonly hash: string;
  readonly definition: CharacterComponentDefinition;
}

async function writePng(
  filePath: string,
  image: ReturnType<typeof PImage.make>,
) {
  const stream = fs.createWriteStream(filePath);
  const finished = new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  await PImage.encodePNGToStream(image, stream);
  await finished;
}

/**
 * Draws every fixture into `outputDirectory` and returns the resulting hashes
 * and definitions. Deterministic: the same script version yields identical
 * bytes, which the art validator and tests verify.
 */
export async function renderDevCharacterFixtures(
  repositoryRoot: string,
  outputDirectory = DEV_CHARACTER_FIXTURE_DIRECTORY,
): Promise<readonly DevCharacterFixtureOutput[]> {
  const absoluteDirectory = path.resolve(repositoryRoot, outputDirectory);
  fs.mkdirSync(absoluteDirectory, { recursive: true });
  const outputs: DevCharacterFixtureOutput[] = [];
  for (const fixture of DEV_CHARACTER_FIXTURES) {
    const { width, height } = fixture.definition.canvas;
    const image = PImage.make(width, height);
    // pureimage bitmaps start opaque black; the fixtures must be transparent
    // everywhere they are not drawn.
    image.data.fill(0);
    const context = image.getContext("2d");
    fixture.draw(context);
    const fileName = `${fixture.assetId}.png`;
    const filePath = path.join(absoluteDirectory, fileName);
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
