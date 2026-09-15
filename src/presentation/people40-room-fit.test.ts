import { describe, expect, it } from "vitest";
import {
  requireScene,
  requireSceneAnchor,
  SCENE_REGISTRY,
} from "./scene-registry";
import { placeSubjectAtAnchor, type PlacementSubject } from "./scene-placement";

const room = requireScene(
  SCENE_REGISTRY,
  "residence-apartment-living-canonical-03",
);
const anchor = requireSceneAnchor(room, "living-room-floor-standing");
const subject: PlacementSubject = {
  id: "frozen-person",
  bodyCanvas: { width: 600, height: 1200 },
  root: { x: 0.5, y: 590 / 1200 },
  crownY: 35 / 1200,
  contacts: {
    leftFoot: { x: 215 / 600, y: 1165 / 1200 },
    rightFoot: { x: 385 / 600, y: 1165 / 1200 },
  },
  bodyFamily: "frozen-body",
  poseFamily: "standing-neutral",
  facing: "front",
  referenceWidthPercent: 13.5,
};

describe("PEOPLE40 room fit", () => {
  it("ignores empty canvas padding while preserving the same visible crown and sole", () => {
    const original = placeSubjectAtAnchor(room, anchor, subject);
    // Same pixels, with 200px padding on all sides. No body reshaping.
    const padded = placeSubjectAtAnchor(room, anchor, {
      ...subject,
      bodyCanvas: { width: 1000, height: 1600 },
      crownY: 235 / 1600,
      contacts: {
        leftFoot: { x: 415 / 1000, y: 1365 / 1600 },
        rightFoot: { x: 585 / 1000, y: 1365 / 1600 },
      },
    });
    expect(
      original.box.topPercent + original.box.heightPercent * subject.crownY!,
    ).toBeCloseTo(
      padded.box.topPercent + (padded.box.heightPercent * 235) / 1600,
    );
    expect(original.box.widthPercent / 600).toBeCloseTo(
      padded.box.widthPercent / 1000,
    );
    expect(original.floorContactMarkers).toEqual(padded.floorContactMarkers);
  });
  it("preserves a broader body at the same height without turning mass into stature", () => {
    const normal = placeSubjectAtAnchor(room, anchor, subject);
    const broad = placeSubjectAtAnchor(room, anchor, {
      ...subject,
      bodyCanvas: { width: 750, height: 1200 },
    });
    expect(broad.box.heightPercent).toBeCloseTo(normal.box.heightPercent);
    expect(broad.box.widthPercent / normal.box.widthPercent).toBeCloseTo(1.25);
    expect(broad.floorContactMarkers[0].yPercent).toBeCloseTo(
      anchor.contactFloorYPercent,
    );
  });
  it("keeps the established placement for art without a crown and for other scenes", () => {
    const legacy = placeSubjectAtAnchor(room, anchor, {
      ...subject,
      crownY: undefined,
    });
    expect(legacy.box.widthPercent).toBe(13.5);
    const oldRoom = { ...room, standingHeightPercent: undefined };
    expect(placeSubjectAtAnchor(oldRoom, anchor, subject).box).toEqual(
      legacy.box,
    );
  });
});
