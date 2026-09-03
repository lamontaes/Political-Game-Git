import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

import type {
  CharacterComplexion,
  CharacterComponentDefinition,
} from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";

/**
 * DEV / NON-PRODUCTION modular character fixtures, catalog generation 2.
 *
 * Generation 1 is frozen and untouched: its ledger signature, its component
 * definitions and every identity pinned to it are exactly what they were. This
 * generation is append-only and exists to exercise the contracts generation 1
 * predates:
 *
 * - complexion as SOURCE ART on bodies and heads, with head and body agreeing;
 * - typed foot and seated-pelvis contacts, so placement is computed;
 * - footwear that exists for BOTH poses, closing the required-slot hole that
 *   left generation 1's seated figure with bare ankles;
 * - a garment that blocks a conflicting slot.
 *
 * These are flat procedural silhouettes drawn from fixed geometry, so their
 * bytes are reproducible. They are not art direction and not the production
 * character set. Their dimensions are fixture choices and are far below the
 * production master minimums, which is why every one of them is manifested as
 * `art_class: "development-fixture"`.
 *
 * Two body families differ only in silhouette width, and complexion varies
 * within each family exactly as the production contract requires. Complexion
 * here is art direction and nothing else: no geometry, name, or other property
 * of a person is derived from it, and none of it is derived from a person.
 */

export const DEV_G2_FIXTURE_DIRECTORY = "art/generated/approved/dev-modular-g2";
export const DEV_G2_FIXTURE_VERSION = "dev-character-fixtures-g2-v1";
export const DEV_G2_CATALOG_GENERATION = 2;

/** Broader frame. */
export const DEV_G2_BODY_BROAD = "dev-g2-broad";
/** Narrower frame. */
export const DEV_G2_BODY_SLIM = "dev-g2-slim";

type Context2D = ReturnType<ReturnType<typeof PImage.make>["getContext"]>;

interface Fixture {
  readonly assetId: string;
  readonly definition: CharacterComponentDefinition;
  readonly draw: (context: Context2D) => void;
}

const KAPPA = 0.5522847498;

function ellipsePath(
  c: Context2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  c.beginPath();
  c.moveTo(cx - rx, cy);
  c.bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry);
  c.bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy);
  c.bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry);
  c.bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy);
  c.closePath();
}

function fillEllipse(
  c: Context2D,
  color: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  ellipsePath(c, cx, cy, rx, ry);
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

/**
 * Two complexion bands, drawn as skin and shade pairs. These are the fixture's
 * paint values, not a palette standard.
 */
const SKIN: Record<CharacterComplexion, { base: string; shade: string }> = {
  light: { base: "#e6c2a4", shade: "#c9a184" },
  "medium-warm": { base: "#c98f60", shade: "#a97046" },
  "medium-cool": { base: "#a97a5c", shade: "#8a5f44" },
  "deep-rich": { base: "#6f4630", shade: "#553321" },
};

// Body canvases. Both families share one rig vocabulary so garments fitted to
// one silhouette can declare the other explicitly rather than by accident.
const STANDING = { width: 420, height: 840 } as const;
const SEATED = { width: 420, height: 660 } as const;

const STANDING_ANCHORS = [
  { id: "head", x: 0.5, y: 0.12 },
  { id: "torso", x: 0.5, y: 0.16 },
  { id: "hips", x: 0.5, y: 0.54 },
  { id: "feet", x: 0.5, y: 0.955 },
] as const;

const SEATED_ANCHORS = [
  { id: "head", x: 0.5, y: 0.152 },
  { id: "torso", x: 0.5, y: 0.2 },
  { id: "hips", x: 0.5, y: 0.62 },
  { id: "feet", x: 0.5, y: 0.945 },
] as const;

/**
 * Standing contacts: both soles on one sole line, spread by the family's
 * stance width. The seated pelvis is absent because a standing body has none.
 */
const STANDING_CONTACTS = {
  leftFoot: { x: 0.38, y: 0.985 },
  rightFoot: { x: 0.62, y: 0.985 },
} as const;

/**
 * Seated contacts: the pelvis that must land on a seat plane, plus the soles
 * that must still reach the floor the seat stands on.
 */
const SEATED_CONTACTS = {
  seatedPelvis: { x: 0.5, y: 0.62 },
  leftFoot: { x: 0.37, y: 0.975 },
  rightFoot: { x: 0.63, y: 0.975 },
} as const;

interface BodySpec {
  readonly family: string;
  readonly complexion: CharacterComplexion;
  /** Half-width of the torso at the shoulder, in canvas pixels. */
  readonly shoulder: number;
  readonly hip: number;
}

function drawStandingBody(c: Context2D, spec: BodySpec): void {
  const skin = SKIN[spec.complexion];
  const cx = STANDING.width / 2;
  fillRect(c, skin.shade, cx - 17, 96, 34, 36); // neck
  fillPolygon(c, skin.base, [
    [cx - spec.shoulder, 130],
    [cx + spec.shoulder, 130],
    [cx + spec.hip, 460],
    [cx - spec.hip, 460],
  ]); // torso
  fillPolygon(c, skin.shade, [
    [cx - spec.shoulder, 130],
    [cx - spec.shoulder - 38, 470],
    [cx - spec.shoulder + 6, 480],
    [cx - spec.shoulder + 44, 162],
  ]); // left arm
  fillPolygon(c, skin.shade, [
    [cx + spec.shoulder, 130],
    [cx + spec.shoulder + 38, 470],
    [cx + spec.shoulder - 6, 480],
    [cx + spec.shoulder - 44, 162],
  ]); // right arm
  fillRect(c, skin.base, cx - spec.hip + 4, 460, spec.hip - 10, 340); // left leg
  fillRect(c, skin.base, cx + 6, 460, spec.hip - 10, 340); // right leg
  fillRect(c, skin.shade, cx - spec.hip - 2, 800, spec.hip, 28); // left foot
  fillRect(c, skin.shade, cx + 2, 800, spec.hip, 28); // right foot
}

function drawSeatedBody(c: Context2D, spec: BodySpec): void {
  const skin = SKIN[spec.complexion];
  const cx = SEATED.width / 2;
  fillRect(c, skin.shade, cx - 17, 96, 34, 36);
  fillPolygon(c, skin.base, [
    [cx - spec.shoulder, 130],
    [cx + spec.shoulder, 130],
    [cx + spec.hip, 404],
    [cx - spec.hip, 404],
  ]);
  fillPolygon(c, skin.shade, [
    [cx - spec.shoulder, 130],
    [cx - spec.shoulder - 26, 386],
    [cx - spec.shoulder + 18, 394],
    [cx - spec.shoulder + 44, 162],
  ]);
  fillPolygon(c, skin.shade, [
    [cx + spec.shoulder, 130],
    [cx + spec.shoulder + 26, 386],
    [cx + spec.shoulder - 18, 394],
    [cx + spec.shoulder - 44, 162],
  ]);
  fillRect(c, skin.base, cx - spec.hip - 8, 404, (spec.hip + 8) * 2, 82); // thighs
  fillRect(c, skin.base, cx - spec.hip, 486, spec.hip - 12, 140); // left shin
  fillRect(c, skin.base, cx + 12, 486, spec.hip - 12, 140); // right shin
  fillRect(c, skin.shade, cx - spec.hip - 4, 626, spec.hip, 24);
  fillRect(c, skin.shade, cx + 8, 626, spec.hip, 24);
}

/**
 * Both families carry every band the head set uses, exactly as the production
 * contract requires: one family id, one rig, one silhouette, differing only in
 * skin. A head may then pick any body family without stranding its complexion.
 */
const COMPLEXION_BANDS_IN_USE: readonly CharacterComplexion[] = [
  "light",
  "medium-warm",
  "deep-rich",
];

const BODY_FRAMES = [
  { family: DEV_G2_BODY_BROAD, shoulder: 126, hip: 98 },
  { family: DEV_G2_BODY_SLIM, shoulder: 104, hip: 82 },
] as const;

const BODY_SPECS: readonly BodySpec[] = BODY_FRAMES.flatMap((frame) =>
  COMPLEXION_BANDS_IN_USE.map((complexion) => ({
    family: frame.family,
    complexion,
    shoulder: frame.shoulder,
    hip: frame.hip,
  })),
);

const HEAD_CANVAS = { width: 220, height: 220 } as const;
const HEAD_ORIGIN = { x: 0.5, y: 0.95 } as const;

interface HeadSpec {
  readonly family: string;
  readonly complexion: CharacterComplexion;
  /** Horizontal radius, so head families differ in structure, not only colour. */
  readonly rx: number;
  readonly ry: number;
}

const HEAD_SPECS: readonly HeadSpec[] = [
  {
    family: "dev-g2-head-warm-round",
    complexion: "medium-warm",
    rx: 84,
    ry: 86,
  },
  {
    family: "dev-g2-head-warm-long",
    complexion: "medium-warm",
    rx: 70,
    ry: 92,
  },
  { family: "dev-g2-head-deep-oval", complexion: "deep-rich", rx: 76, ry: 90 },
  { family: "dev-g2-head-light-square", complexion: "light", rx: 80, ry: 84 },
];

function drawHead(c: Context2D, spec: HeadSpec): void {
  const skin = SKIN[spec.complexion];
  fillEllipse(c, skin.shade, 110 - spec.rx - 6, 118, 12, 17); // ears
  fillEllipse(c, skin.shade, 110 + spec.rx + 6, 118, 12, 17);
  fillEllipse(c, skin.base, 110, 116, spec.rx, spec.ry);
  fillEllipse(c, "#241a12", 110 - spec.rx * 0.34, 112, 6, 7); // eyes
  fillEllipse(c, "#241a12", 110 + spec.rx * 0.34, 112, 6, 7);
  fillRect(c, skin.shade, 92, 158, 36, 5); // mouth
}

interface HairSpec {
  readonly family: string;
  readonly label: string;
  readonly colour: string;
  readonly draw: (c: Context2D, colour: string) => void;
  readonly back?: { readonly canvasHeight: number };
}

const HAIR_SPECS: readonly HairSpec[] = [
  {
    family: "dev-g2-hair-crop",
    label: "crop",
    colour: "#2a1f16",
    draw: (c, colour) => {
      fillEllipse(c, colour, 110, 62, 88, 44);
      fillRect(c, colour, 22, 62, 176, 20);
    },
  },
  {
    family: "dev-g2-hair-coils",
    label: "coils",
    colour: "#1c1410",
    draw: (c, colour) => {
      fillEllipse(c, colour, 110, 56, 94, 50);
      for (let i = 0; i < 7; i += 1) {
        fillEllipse(c, colour, 30 + i * 27, 46, 17, 17);
      }
    },
  },
  {
    family: "dev-g2-hair-long",
    label: "long",
    colour: "#4a331d",
    draw: (c, colour) => {
      fillEllipse(c, colour, 110, 56, 92, 42);
      fillRect(c, colour, 16, 56, 34, 128);
      fillRect(c, colour, 170, 56, 34, 128);
    },
    back: { canvasHeight: 320 },
  },
];

const GARMENT_BODY_FAMILIES = [DEV_G2_BODY_BROAD, DEV_G2_BODY_SLIM];
const G2_HEAD_FAMILIES = HEAD_SPECS.map((spec) => spec.family);

function bodyAssetId(spec: BodySpec, pose: "standing" | "seated"): string {
  return `dev_g2_body_${spec.family.replace(/^dev-g2-/, "").replace(/-/g, "_")}_${spec.complexion.replace(/-/g, "_")}_${pose}_v1`;
}

function headAssetId(spec: HeadSpec): string {
  return `dev_g2_head_${spec.family.replace(/^dev-g2-head-/, "").replace(/-/g, "_")}_v1`;
}

export const DEV_G2_FIXTURES: readonly Fixture[] = [
  // Bodies ----------------------------------------------------------------
  ...BODY_SPECS.flatMap((spec): Fixture[] => [
    {
      assetId: bodyAssetId(spec, "standing"),
      definition: {
        kind: "body",
        family: spec.family,
        catalog_generation: DEV_G2_CATALOG_GENERATION,
        layer: 20,
        canvas: { ...STANDING },
        pose_family: "standing-neutral",
        head_orientation: "front",
        complexion: spec.complexion,
        root: { convention: "pelvis-hip-center", x: 0.5, y: 0.55 },
        attachment_anchors: [...STANDING_ANCHORS],
        contacts: { ...STANDING_CONTACTS },
      },
      draw: (c) => drawStandingBody(c, spec),
    },
    {
      assetId: bodyAssetId(spec, "seated"),
      definition: {
        kind: "body",
        family: spec.family,
        catalog_generation: DEV_G2_CATALOG_GENERATION,
        layer: 20,
        canvas: { ...SEATED },
        pose_family: "seated-at-desk",
        head_orientation: "front",
        complexion: spec.complexion,
        root: { convention: "pelvis-hip-center", x: 0.5, y: 0.62 },
        attachment_anchors: [...SEATED_ANCHORS],
        contacts: { ...SEATED_CONTACTS },
      },
      draw: (c) => drawSeatedBody(c, spec),
    },
  ]),

  // Heads -----------------------------------------------------------------
  ...HEAD_SPECS.map((spec): Fixture => ({
    assetId: headAssetId(spec),
    definition: {
      kind: "head",
      family: spec.family,
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 30,
      canvas: { ...HEAD_CANVAS },
      attaches_to: "head",
      origin: { ...HEAD_ORIGIN },
      complexion: spec.complexion,
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => drawHead(c, spec),
  })),

  // Hair ------------------------------------------------------------------
  ...HAIR_SPECS.flatMap((spec): Fixture[] => {
    const frontId = `dev_g2_hair_${spec.label}_front_v1`;
    const backId = `dev_g2_hair_${spec.label}_back_v1`;
    const front: Fixture = {
      assetId: frontId,
      definition: {
        kind: "hair-front",
        family: spec.family,
        catalog_generation: DEV_G2_CATALOG_GENERATION,
        layer: 40,
        canvas: { ...HEAD_CANVAS },
        attaches_to: "head",
        origin: { ...HEAD_ORIGIN },
        compatible_head_families: [...G2_HEAD_FAMILIES],
        compatible_head_orientations: ["front"],
        ...(spec.back ? { paired_with: backId } : {}),
      },
      draw: (c) => spec.draw(c, spec.colour),
    };
    if (!spec.back) return [front];
    const back: Fixture = {
      assetId: backId,
      definition: {
        kind: "hair-back",
        family: spec.family,
        catalog_generation: DEV_G2_CATALOG_GENERATION,
        layer: 10,
        canvas: { width: 260, height: spec.back.canvasHeight },
        attaches_to: "head",
        origin: { x: 0.5, y: 200 / spec.back.canvasHeight },
        compatible_head_families: [...G2_HEAD_FAMILIES],
        compatible_head_orientations: ["front"],
      },
      draw: (c) => {
        fillEllipse(c, "#3d2a17", 130, 84, 104, 62);
        fillRect(c, "#3d2a17", 26, 84, 208, spec.back!.canvasHeight - 110);
        fillEllipse(c, "#3d2a17", 130, spec.back!.canvasHeight - 26, 104, 26);
      },
    };
    return [front, back];
  }),

  // Garments --------------------------------------------------------------
  {
    assetId: "dev_g2_top_suit_charcoal_standing_v1",
    definition: {
      kind: "top",
      family: "dev-g2-suit-charcoal",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 25,
      canvas: { width: 420, height: 360 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["standing-neutral"],
      compatible_head_orientations: ["front"],
      // A structured jacket closes over the chest, so nothing may be pinned
      // through it. The conflicting layer is refused, not drawn over.
      blocked_slots: ["accessory"],
    },
    draw: (c) => drawJacket(c, 360),
  },
  {
    assetId: "dev_g2_top_suit_charcoal_seated_v1",
    definition: {
      kind: "top",
      family: "dev-g2-suit-charcoal",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 25,
      canvas: { width: 420, height: 300 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["seated-at-desk"],
      compatible_head_orientations: ["front"],
      blocked_slots: ["accessory"],
    },
    draw: (c) => drawJacket(c, 300),
  },
  {
    assetId: "dev_g2_top_knit_olive_standing_v1",
    definition: {
      kind: "top",
      family: "dev-g2-knit-olive",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 25,
      canvas: { width: 420, height: 340 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["standing-neutral"],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => drawKnit(c, 340),
  },
  {
    assetId: "dev_g2_top_knit_olive_seated_v1",
    definition: {
      kind: "top",
      family: "dev-g2-knit-olive",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 25,
      canvas: { width: 420, height: 290 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["seated-at-desk"],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => drawKnit(c, 290),
  },
  {
    assetId: "dev_g2_bottom_trousers_standing_v1",
    definition: {
      kind: "bottom",
      family: "dev-g2-trousers-slate",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 22,
      canvas: { width: 420, height: 360 },
      attaches_to: "hips",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["standing-neutral"],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillRect(c, "#2b2f36", 112, 0, 196, 30);
      fillRect(c, "#353a42", 114, 26, 88, 326);
      fillRect(c, "#353a42", 218, 26, 88, 326);
    },
  },
  {
    assetId: "dev_g2_bottom_trousers_seated_v1",
    definition: {
      kind: "bottom",
      family: "dev-g2-trousers-slate",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 22,
      canvas: { width: 420, height: 240 },
      attaches_to: "hips",
      origin: { x: 0.5, y: 0 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["seated-at-desk"],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillRect(c, "#2b2f36", 104, 0, 212, 26);
      fillRect(c, "#353a42", 96, 20, 228, 68);
      fillRect(c, "#353a42", 104, 84, 84, 152);
      fillRect(c, "#353a42", 232, 84, 84, 152);
    },
  },

  // Footwear, for BOTH poses. Generation 1 had standing shoes only, which is
  // why its seated figure resolved a required slot to nothing.
  {
    assetId: "dev_g2_footwear_derby_standing_v1",
    definition: {
      kind: "footwear",
      family: "dev-g2-derby-oxblood",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 21,
      canvas: { width: 420, height: 64 },
      attaches_to: "feet",
      origin: { x: 0.5, y: 0.25 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["standing-neutral"],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillEllipse(c, "#4a1d18", 158, 34, 56, 21);
      fillEllipse(c, "#4a1d18", 262, 34, 56, 21);
    },
  },
  {
    assetId: "dev_g2_footwear_derby_seated_v1",
    definition: {
      kind: "footwear",
      family: "dev-g2-derby-oxblood",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 21,
      canvas: { width: 420, height: 64 },
      attaches_to: "feet",
      origin: { x: 0.5, y: 0.25 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_pose_families: ["seated-at-desk"],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillEllipse(c, "#4a1d18", 152, 34, 54, 20);
      fillEllipse(c, "#4a1d18", 268, 34, 54, 20);
    },
  },

  {
    assetId: "dev_g2_eyewear_thin_frames_v1",
    definition: {
      kind: "eyewear",
      family: "dev-g2-thin-frames",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 45,
      canvas: { ...HEAD_CANVAS },
      attaches_to: "head",
      origin: { ...HEAD_ORIGIN },
      compatible_head_families: [...G2_HEAD_FAMILIES],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      c.strokeStyle = "#20242a";
      c.lineWidth = 4;
      ellipsePath(c, 84, 112, 22, 20);
      c.stroke();
      ellipsePath(c, 136, 112, 22, 20);
      c.stroke();
      fillRect(c, "#20242a", 106, 110, 8, 4);
    },
  },
  {
    assetId: "dev_g2_accessory_lanyard_v1",
    definition: {
      kind: "accessory",
      family: "dev-g2-lanyard",
      catalog_generation: DEV_G2_CATALOG_GENERATION,
      layer: 26,
      canvas: { width: 80, height: 120 },
      attaches_to: "torso",
      origin: { x: 0.5, y: 0.1 },
      compatible_body_families: [...GARMENT_BODY_FAMILIES],
      compatible_head_orientations: ["front"],
    },
    draw: (c) => {
      fillRect(c, "#38506b", 36, 0, 8, 74);
      fillRect(c, "#e8e4d8", 22, 74, 36, 40);
    },
  },
];

function drawJacket(c: Context2D, height: number): void {
  const hem = height - 8;
  fillPolygon(c, "#33363c", [
    [78, 0],
    [342, 0],
    [316, hem],
    [104, hem],
  ]);
  fillPolygon(c, "#2a2d33", [
    [78, 0],
    [40, hem],
    [88, hem],
    [122, 24],
  ]);
  fillPolygon(c, "#2a2d33", [
    [342, 0],
    [380, hem],
    [332, hem],
    [298, 24],
  ]);
  fillPolygon(c, "#ece7dc", [
    [168, 0],
    [252, 0],
    [210, 100],
  ]);
  // Lapels are handed and are never mirrored: a mirrored closure is a
  // different garment on the same person.
  fillPolygon(c, "#3f434a", [
    [168, 0],
    [210, 100],
    [186, 114],
    [144, 20],
  ]);
  fillPolygon(c, "#3f434a", [
    [252, 0],
    [210, 100],
    [232, 116],
    [274, 22],
  ]);
}

function drawKnit(c: Context2D, height: number): void {
  const hem = height - 8;
  fillPolygon(c, "#5d6b42", [
    [82, 0],
    [338, 0],
    [314, hem],
    [106, hem],
  ]);
  fillPolygon(c, "#4c5836", [
    [82, 0],
    [44, hem - 40],
    [96, hem - 28],
    [124, 26],
  ]);
  fillPolygon(c, "#4c5836", [
    [338, 0],
    [376, hem - 40],
    [324, hem - 28],
    [296, 26],
  ]);
  fillEllipse(c, "#3f4a2d", 210, 4, 46, 15);
}

export interface DevG2FixtureOutput {
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

export async function renderDevG2Fixtures(
  repositoryRoot: string,
  outputDirectory = DEV_G2_FIXTURE_DIRECTORY,
): Promise<readonly DevG2FixtureOutput[]> {
  const absolute = path.resolve(repositoryRoot, outputDirectory);
  fs.mkdirSync(absolute, { recursive: true });
  const outputs: DevG2FixtureOutput[] = [];
  for (const fixture of DEV_G2_FIXTURES) {
    const { width, height } = fixture.definition.canvas;
    const image = PImage.make(width, height);
    // pureimage bitmaps start opaque black; fixtures must be transparent
    // everywhere they are not drawn.
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
