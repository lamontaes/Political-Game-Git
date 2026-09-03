/**
 * SYSTEM 8 — the arithmetic behind the authoring overlay.
 *
 * Turning a click into a plate coordinate, and a list of clicks into a metadata
 * block an author can paste into a scene spec.
 *
 * It lives here, pure and DOM-free, for the same reason the tier planner does:
 * the interesting part is the conversion and the certainty bookkeeping, and
 * those are worth testing without a browser. The React surface supplies a
 * bounding rectangle and a pointer position and does nothing else.
 *
 * Every captured value carries a certainty the author picked. There is no path
 * that records a number without one, because a coordinate read off a picture is
 * an ESTIMATE, and a pipeline that silently promoted estimates to measurements
 * would undo the honesty the rest of this module set is built on.
 */

import { toCanonicalJson } from "./canonical-json";
import type { AuthoringCertainty } from "./scene-scaffold";

export interface PlatePoint {
  /** Plate-space pixels, in the scene's own virtual coordinate system. */
  readonly x: number;
  readonly y: number;
  /** The same point as a percentage of the plate, which is what specs store. */
  readonly xPercent: number;
  readonly yPercent: number;
  /** False when the pointer was over letterboxing or outside the plate. */
  readonly withinPlate: boolean;
}

export interface CameraProjection {
  /** Bounding rectangle of the painted camera element, in CSS pixels. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** The plate's virtual size. */
  readonly plateWidth: number;
  readonly plateHeight: number;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Converts a pointer position into plate coordinates.
 *
 * The camera rectangle is the PAINTED one, already scaled and offset by the
 * cover-fit transform, so this is a plain proportional mapping. Points outside
 * it are still reported — with `withinPlate: false` — rather than clamped: an
 * author who clicks past the edge of a cropped plate should see that they did,
 * not receive a coordinate on the boundary that looks deliberate.
 */
export function platePointFromPointer(
  clientX: number,
  clientY: number,
  projection: CameraProjection,
): PlatePoint {
  const { left, top, width, height, plateWidth, plateHeight } = projection;
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0, xPercent: 0, yPercent: 0, withinPlate: false };
  }
  const fractionX = (clientX - left) / width;
  const fractionY = (clientY - top) / height;
  return {
    x: round(fractionX * plateWidth, 1),
    y: round(fractionY * plateHeight, 1),
    xPercent: round(fractionX * 100, 3),
    yPercent: round(fractionY * 100, 3),
    withinPlate:
      fractionX >= 0 && fractionX <= 1 && fractionY >= 0 && fractionY <= 1,
  };
}

/** What an author says a captured point IS. */
export type CaptureKind =
  | "floor-line"
  | "seat-plane"
  | "anchor-position"
  | "footprint-edge"
  | "occluder-corner"
  | "surface-slot-corner"
  | "safe-area-corner"
  | "hero-region-corner"
  | "calibration-near"
  | "calibration-far"
  | "reference-point";

export const CAPTURE_KINDS: readonly CaptureKind[] = [
  "floor-line",
  "seat-plane",
  "anchor-position",
  "footprint-edge",
  "occluder-corner",
  "surface-slot-corner",
  "safe-area-corner",
  "hero-region-corner",
  "calibration-near",
  "calibration-far",
  "reference-point",
];

export interface AuthoringCapture {
  readonly captureId: string;
  readonly sceneId: string;
  readonly kind: CaptureKind;
  /** The anchor, slot or occluder this point belongs to, when it has one. */
  readonly subjectId: string | null;
  readonly point: PlatePoint;
  readonly certainty: AuthoringCertainty;
  readonly note?: string;
}

export interface CaptureRequest {
  readonly sceneId: string;
  readonly kind: CaptureKind;
  readonly subjectId?: string;
  readonly point: PlatePoint;
  readonly certainty: AuthoringCertainty;
  readonly note?: string;
  /** Supplied by the caller so ids stay deterministic and testable. */
  readonly sequence: number;
}

export function createAuthoringCapture(
  request: CaptureRequest,
): AuthoringCapture {
  return {
    captureId: `${request.sceneId}:${request.kind}:${request.sequence}`,
    sceneId: request.sceneId,
    kind: request.kind,
    subjectId: request.subjectId ?? null,
    point: request.point,
    certainty: request.certainty,
    ...(request.note !== undefined ? { note: request.note } : {}),
  };
}

/**
 * Captures grouped by subject, then by kind, in capture order.
 *
 * Grouping is what makes the export readable: the four corners of one slot
 * belong together, and a flat chronological list of clicks does not say so.
 */
export function groupCaptures(
  captures: readonly AuthoringCapture[],
): ReadonlyMap<string, readonly AuthoringCapture[]> {
  const grouped = new Map<string, AuthoringCapture[]>();
  for (const capture of captures) {
    const key = capture.subjectId ?? "(unassigned)";
    const bucket = grouped.get(key);
    if (bucket) bucket.push(capture);
    else grouped.set(key, [capture]);
  }
  return grouped;
}

export interface CaptureExport {
  readonly sceneId: string;
  readonly capturedAt: string | null;
  /**
   * Stated on the artefact itself, because this block is going to be pasted
   * into a spec and read months later by someone who was not here.
   */
  readonly certaintyNote: string;
  readonly captures: readonly AuthoringCapture[];
}

export const CAPTURE_CERTAINTY_NOTE =
  "Coordinates read off a picture in the authoring overlay. Anything marked ESTIMATED is an author's judgement about this plate, not a measurement of a real room; anything marked UNKNOWN or UNVERIFIED is recorded but not settled. Do not promote a certainty when pasting this into a scene spec.";

/**
 * The pasteable block.
 *
 * `capturedAt` is passed in rather than read from the clock, so the same
 * captures always export the same bytes and a reviewer diffing two exports sees
 * only the coordinates that moved.
 */
export function buildCaptureExport(
  sceneId: string,
  captures: readonly AuthoringCapture[],
  capturedAt: string | null = null,
): CaptureExport {
  return {
    sceneId,
    capturedAt,
    certaintyNote: CAPTURE_CERTAINTY_NOTE,
    captures: captures.filter((capture) => capture.sceneId === sceneId),
  };
}

export function serializeCaptureExport(value: CaptureExport): string {
  return toCanonicalJson(value);
}

/** How many captures are still not settled, for the overlay's summary line. */
export function unsettledCaptureCount(
  captures: readonly AuthoringCapture[],
): number {
  return captures.filter(
    (capture) =>
      capture.certainty === "UNKNOWN" || capture.certainty === "UNVERIFIED",
  ).length;
}
