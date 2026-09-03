import type { CharacterContactPoint } from "./character-components";
import type { PoseFamilyDefinition, PoseLandmarkId } from "./pose-families";

/**
 * Deterministic pose control-plate authoring.
 *
 * The structure-control research conclusion this implements is that exact body
 * STRUCTURE and final visual RENDERING are separate control layers. Prose-only
 * anatomy prompting repeatedly normalized toward the model's default
 * proportions; a structural control image does not.
 *
 * So a control plate is generated here, from the pose family's own landmarks
 * and contacts, as a vector image an external tool can consume as a
 * pose/scribble/structure reference. It is:
 *
 * - deterministic — the same registry always yields the same bytes, which the
 *   art validator and a focused test both check by hash;
 * - free of text — no labels, numbers or legends, because text in a control
 *   image bleeds into generated art;
 * - never production art — a plate is an authoring input, and no anchor dot or
 *   bone line may ever appear in a finished character raster.
 *
 * One canonical plate exists per pose family and facing. It is not a sketchpad.
 */

export const POSE_CONTROL_PLATE_VERSION = "pose-control-plate-v1";
export const POSE_CONTROL_PLATE_DIRECTORY = "art/pose-control-plates";

/**
 * Head height as a fraction of stature. A plate that omitted the skull would
 * let a generator choose head size freely, which is one of the proportions the
 * plate exists to fix. The body canvas itself stays headless — a head is a
 * separate component — so the plate's viewBox extends above the canvas and the
 * canvas frame is drawn so an operator can see where the body raster stops.
 */
const HEAD_HEIGHT_STATURE_RATIO = 7.5;
const HEAD_WIDTH_RATIO = 0.72;

const BACKGROUND = "#000000";
const CANVAS_FRAME = "#3a3a3a";
const PLANE_GUIDE = "#4d4d4d";
const MASS = "#6b6b6b";
const BONE = "#ffffff";
const CONTACT = "#ff6a3d";

/** Bone chains, drawn as both mass bands and skeleton lines. */
const BONES: readonly (readonly [PoseLandmarkId, PoseLandmarkId])[] = [
  ["head", "neck"],
  ["neck", "chest"],
  ["chest", "pelvis"],
  ["neck", "shoulder-left"],
  ["neck", "shoulder-right"],
  ["shoulder-left", "elbow-left"],
  ["elbow-left", "wrist-left"],
  ["wrist-left", "hand-left"],
  ["shoulder-right", "elbow-right"],
  ["elbow-right", "wrist-right"],
  ["wrist-right", "hand-right"],
  ["pelvis", "hip-left"],
  ["pelvis", "hip-right"],
  ["hip-left", "knee-left"],
  ["knee-left", "ankle-left"],
  ["hip-right", "knee-right"],
  ["knee-right", "ankle-right"],
];

/**
 * The foot is drawn from the ankle landmark to the sole contact, so the plate
 * carries the leg all the way to the ground it must stand on rather than
 * stopping at the ankle and leaving the generator to invent a foot.
 */
const FOOT_SEGMENTS: readonly (readonly [
  PoseLandmarkId,
  "leftFoot" | "rightFoot",
])[] = [
  ["ankle-left", "leftFoot"],
  ["ankle-right", "rightFoot"],
];

/** Limb mass widths as a fraction of the figure's stature. */
const MASS_WIDTH: ReadonlyMap<string, number> = new Map([
  ["head|neck", 0.052],
  ["neck|chest", 0.085],
  ["chest|pelvis", 0.115],
  ["neck|shoulder-left", 0.06],
  ["neck|shoulder-right", 0.06],
  ["shoulder-left|elbow-left", 0.05],
  ["shoulder-right|elbow-right", 0.05],
  ["elbow-left|wrist-left", 0.04],
  ["elbow-right|wrist-right", 0.04],
  ["wrist-left|hand-left", 0.038],
  ["wrist-right|hand-right", 0.038],
  ["pelvis|hip-left", 0.075],
  ["pelvis|hip-right", 0.075],
  ["hip-left|knee-left", 0.068],
  ["hip-right|knee-right", 0.068],
  ["knee-left|ankle-left", 0.05],
  ["knee-right|ankle-right", 0.05],
  ["ankle-left|leftFoot", 0.045],
  ["ankle-right|rightFoot", 0.045],
]);

function fixed(value: number): string {
  // Normalize -0 so the same geometry never produces two different strings.
  const rounded = Number(value.toFixed(2));
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(2);
}

interface PlateGeometry {
  readonly width: number;
  readonly height: number;
  readonly viewMinY: number;
  readonly viewHeight: number;
  readonly stature: number;
  readonly headHeight: number;
  readonly headWidth: number;
  readonly headCentreY: number;
}

function pixel(
  point: CharacterContactPoint,
  width: number,
  height: number,
): { readonly x: number; readonly y: number } {
  return { x: point.x * width, y: point.y * height };
}

function lowestContactY(family: PoseFamilyDefinition): number {
  const candidates = [
    family.contacts.leftFoot?.y,
    family.contacts.rightFoot?.y,
    family.landmarks["ankle-left"]?.y,
    family.landmarks["ankle-right"]?.y,
  ].filter((value): value is number => typeof value === "number");
  return candidates.length > 0 ? Math.max(...candidates) : 1;
}

function geometryFor(family: PoseFamilyDefinition): PlateGeometry {
  const { width, height } = family.nominal_canvas;
  const soleY = lowestContactY(family) * height;
  const headAttachY = (family.landmarks.head?.y ?? 0) * height;
  // stature = soleY - headTopY, with headTopY = headAttachY - headHeight and
  // headHeight = stature / 7.5. Solving both gives the closed form below, so a
  // seated and a standing plate of the same person get the same head size.
  const headHeight = (soleY - headAttachY) / (HEAD_HEIGHT_STATURE_RATIO - 1);
  const headWidth = headHeight * HEAD_WIDTH_RATIO;
  const headCentreY = headAttachY - headHeight / 2;
  const viewMinY = headAttachY - headHeight - height * 0.02;
  return {
    width,
    height,
    viewMinY,
    viewHeight: height - viewMinY + height * 0.01,
    stature: soleY - (headAttachY - headHeight),
    headHeight,
    headWidth,
    headCentreY,
  };
}

/**
 * Renders one pose family's control plate as an SVG document.
 *
 * Pure and deterministic: it reads only the family record and returns a string.
 * Callers write it to `art/pose-control-plates/` and record its hash on the
 * family, so a landmark edit that is not re-derived fails validation.
 */
export function renderPoseControlPlate(family: PoseFamilyDefinition): string {
  const geometry = geometryFor(family);
  const { width, height, stature } = geometry;
  const at = (id: PoseLandmarkId) => {
    const point = family.landmarks[id];
    if (!point) {
      throw new Error(
        `Pose family '${family.pose_family_id}' cannot render a control plate without landmark '${id}'.`,
      );
    }
    return pixel(point, width, height);
  };

  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<!-- ${POSE_CONTROL_PLATE_VERSION} | pose ${family.pose_family_id} | posture ${family.posture_class} | facing ${family.facing} | body canvas ${width}x${height} | GENERATED, do not hand-edit; run npm run derive:pose-plates -->`,
  );
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fixed(width)}" height="${fixed(geometry.viewHeight)}" viewBox="0 ${fixed(geometry.viewMinY)} ${fixed(width)} ${fixed(geometry.viewHeight)}">`,
  );
  lines.push(
    `<rect x="0" y="${fixed(geometry.viewMinY)}" width="${fixed(width)}" height="${fixed(geometry.viewHeight)}" fill="${BACKGROUND}"/>`,
  );

  // The body raster's own canvas, so an operator can see where it stops.
  lines.push(
    `<rect x="0.5" y="0.5" width="${fixed(width - 1)}" height="${fixed(height - 1)}" fill="none" stroke="${CANVAS_FRAME}" stroke-width="1"/>`,
  );

  // Contact planes this posture must land on.
  const planeYs: number[] = [];
  if (family.contacts.leftFoot && family.contacts.rightFoot) {
    planeYs.push(
      Math.max(family.contacts.leftFoot.y, family.contacts.rightFoot.y) *
        height,
    );
  }
  if (family.contacts.seatedPelvis) {
    planeYs.push(family.contacts.seatedPelvis.y * height);
  }
  for (const y of planeYs.sort((a, b) => a - b)) {
    lines.push(
      `<line x1="0" y1="${fixed(y)}" x2="${fixed(width)}" y2="${fixed(y)}" stroke="${PLANE_GUIDE}" stroke-width="2" stroke-dasharray="18 14"/>`,
    );
  }

  // Limb mass, so the plate carries volume as well as a stick figure.
  for (const [from, to] of BONES) {
    const a = at(from);
    const b = at(to);
    const widthRatio = MASS_WIDTH.get(`${from}|${to}`) ?? 0.04;
    lines.push(
      `<line x1="${fixed(a.x)}" y1="${fixed(a.y)}" x2="${fixed(b.x)}" y2="${fixed(b.y)}" stroke="${MASS}" stroke-width="${fixed(stature * widthRatio)}" stroke-linecap="round"/>`,
    );
  }

  for (const [ankle, contactKey] of FOOT_SEGMENTS) {
    const contact = family.contacts[contactKey];
    if (!contact) continue;
    const a = at(ankle);
    const b = pixel(contact, width, height);
    lines.push(
      `<line x1="${fixed(a.x)}" y1="${fixed(a.y)}" x2="${fixed(b.x)}" y2="${fixed(b.y)}" stroke="${MASS}" stroke-width="${fixed(stature * (MASS_WIDTH.get(`${ankle}|${contactKey}`) ?? 0.045))}" stroke-linecap="round"/>`,
    );
  }

  // Torso as a closed quad, which a chain of round-capped lines cannot express.
  const shoulderLeft = at("shoulder-left");
  const shoulderRight = at("shoulder-right");
  const hipLeft = at("hip-left");
  const hipRight = at("hip-right");
  lines.push(
    `<polygon points="${fixed(shoulderLeft.x)},${fixed(shoulderLeft.y)} ${fixed(shoulderRight.x)},${fixed(shoulderRight.y)} ${fixed(hipRight.x)},${fixed(hipRight.y)} ${fixed(hipLeft.x)},${fixed(hipLeft.y)}" fill="${MASS}"/>`,
  );

  // Skull, drawn above the headless body canvas.
  const headAttach = at("head");
  lines.push(
    `<ellipse cx="${fixed(headAttach.x)}" cy="${fixed(geometry.headCentreY)}" rx="${fixed(geometry.headWidth / 2)}" ry="${fixed(geometry.headHeight / 2)}" fill="${MASS}" stroke="${BONE}" stroke-width="${fixed(stature * 0.004)}"/>`,
  );

  // Skeleton on top of the mass.
  const boneWidth = stature * 0.004;
  for (const [from, to] of BONES) {
    const a = at(from);
    const b = at(to);
    lines.push(
      `<line x1="${fixed(a.x)}" y1="${fixed(a.y)}" x2="${fixed(b.x)}" y2="${fixed(b.y)}" stroke="${BONE}" stroke-width="${fixed(boneWidth)}" stroke-linecap="round"/>`,
    );
  }
  for (const [ankle, contactKey] of FOOT_SEGMENTS) {
    const contact = family.contacts[contactKey];
    if (!contact) continue;
    const a = at(ankle);
    const b = pixel(contact, width, height);
    lines.push(
      `<line x1="${fixed(a.x)}" y1="${fixed(a.y)}" x2="${fixed(b.x)}" y2="${fixed(b.y)}" stroke="${BONE}" stroke-width="${fixed(boneWidth)}" stroke-linecap="round"/>`,
    );
  }

  const jointRadius = stature * 0.006;
  for (const id of Object.keys(family.landmarks).sort()) {
    const point = family.landmarks[id];
    if (!point) continue;
    const at2 = pixel(point, width, height);
    lines.push(
      `<circle cx="${fixed(at2.x)}" cy="${fixed(at2.y)}" r="${fixed(jointRadius)}" fill="${BONE}"/>`,
    );
  }

  // Contacts last, so they are never hidden by a bone.
  const contactRadius = stature * 0.009;
  for (const key of ["seatedPelvis", "leftFoot", "rightFoot"] as const) {
    const point = family.contacts[key];
    if (!point) continue;
    const marker = pixel(point, width, height);
    lines.push(
      `<circle cx="${fixed(marker.x)}" cy="${fixed(marker.y)}" r="${fixed(contactRadius)}" fill="none" stroke="${CONTACT}" stroke-width="${fixed(boneWidth)}"/>`,
    );
  }

  lines.push(`</svg>`);
  return `${lines.join("\n")}\n`;
}

/**
 * The plate's own viewport, so a developer overlay can place DOM markers over
 * a rendered plate from the family record instead of guessing, and without any
 * marker being baked into the image itself.
 */
export interface PoseControlPlateViewport {
  readonly width: number;
  readonly viewMinY: number;
  readonly viewHeight: number;
}

export function poseControlPlateViewport(
  family: PoseFamilyDefinition,
): PoseControlPlateViewport {
  const geometry = geometryFor(family);
  return {
    width: geometry.width,
    viewMinY: geometry.viewMinY,
    viewHeight: geometry.viewHeight,
  };
}

/**
 * Projects a point normalized in the body canvas into percentages of the
 * rendered plate box. The plate extends above the body canvas to carry the
 * skull, so the vertical mapping is not the identity.
 */
export function projectOntoPoseControlPlate(
  family: PoseFamilyDefinition,
  point: CharacterContactPoint,
): { readonly xPercent: number; readonly yPercent: number } {
  const viewport = poseControlPlateViewport(family);
  const y = point.y * family.nominal_canvas.height;
  return {
    xPercent: point.x * 100,
    yPercent: ((y - viewport.viewMinY) / viewport.viewHeight) * 100,
  };
}

/** The file name a family's plate must carry: one plate per pose and facing. */
export function poseControlPlateFileName(family: PoseFamilyDefinition): string {
  return `${family.pose_family_id}__${family.facing}.svg`;
}

/**
 * Where a family's plate lives.
 *
 * The directory comes from the family's own declared path so a second registry
 * — the contract fixture, for instance — keeps its plates beside itself
 * instead of overwriting the production ones. The FILE NAME is always derived,
 * so a plate cannot be pointed at some other pose's picture.
 */
export function poseControlPlatePath(family: PoseFamilyDefinition): string {
  const declared = family.control_plate?.path;
  const directory =
    declared && declared.includes("/")
      ? declared.slice(0, declared.lastIndexOf("/"))
      : POSE_CONTROL_PLATE_DIRECTORY;
  return `${directory}/${poseControlPlateFileName(family)}`;
}
