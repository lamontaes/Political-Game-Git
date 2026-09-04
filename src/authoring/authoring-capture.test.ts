import { describe, expect, it } from "vitest";

import {
  buildCaptureExport,
  createAuthoringCapture,
  groupCaptures,
  platePointFromPointer,
  serializeCaptureExport,
  unsettledCaptureCount,
  CAPTURE_CERTAINTY_NOTE,
  type AuthoringCapture,
  type CameraProjection,
} from "./authoring-capture";

const PROJECTION: CameraProjection = {
  left: 100,
  top: 50,
  width: 800,
  height: 450,
  plateWidth: 4_096,
  plateHeight: 2_304,
};

describe("pointer to plate coordinates", () => {
  it("maps the centre of the painted camera to the centre of the plate", () => {
    const point = platePointFromPointer(500, 275, PROJECTION);
    expect(point.xPercent).toBeCloseTo(50, 3);
    expect(point.yPercent).toBeCloseTo(50, 3);
    expect(point.x).toBeCloseTo(2_048, 0);
    expect(point.y).toBeCloseTo(1_152, 0);
    expect(point.withinPlate).toBe(true);
  });

  it("maps the corners exactly", () => {
    const topLeft = platePointFromPointer(100, 50, PROJECTION);
    expect(topLeft.x).toBe(0);
    expect(topLeft.y).toBe(0);
    const bottomRight = platePointFromPointer(900, 500, PROJECTION);
    expect(bottomRight.xPercent).toBeCloseTo(100, 3);
    expect(bottomRight.yPercent).toBeCloseTo(100, 3);
  });

  it("reports a point outside the plate rather than clamping it", () => {
    const point = platePointFromPointer(40, 275, PROJECTION);
    expect(point.withinPlate).toBe(false);
    expect(point.xPercent).toBeLessThan(0);
  });

  it("survives a zero-sized camera without producing a fake coordinate", () => {
    const point = platePointFromPointer(10, 10, {
      ...PROJECTION,
      width: 0,
      height: 0,
    });
    expect(point.withinPlate).toBe(false);
    expect(point.x).toBe(0);
  });
});

describe("captures carry the certainty an author chose", () => {
  function capture(
    certainty: AuthoringCapture["certainty"],
    sequence: number,
    subjectId?: string,
  ): AuthoringCapture {
    return createAuthoringCapture({
      sceneId: "room-a",
      kind: "floor-line",
      ...(subjectId !== undefined ? { subjectId } : {}),
      point: platePointFromPointer(500, 400, PROJECTION),
      certainty,
      sequence,
    });
  }

  it("records the certainty rather than defaulting it", () => {
    expect(capture("ESTIMATED", 1).certainty).toBe("ESTIMATED");
    expect(capture("VERIFIED", 2).certainty).toBe("VERIFIED");
    expect(capture("UNKNOWN", 3).certainty).toBe("UNKNOWN");
  });

  it("produces deterministic capture ids from the caller's sequence", () => {
    expect(capture("ESTIMATED", 4).captureId).toBe("room-a:floor-line:4");
    expect(capture("ESTIMATED", 4).captureId).toBe(
      capture("ESTIMATED", 4).captureId,
    );
  });

  it("counts the ones still unsettled", () => {
    expect(
      unsettledCaptureCount([
        capture("VERIFIED", 1),
        capture("ESTIMATED", 2),
        capture("UNKNOWN", 3),
        capture("UNVERIFIED", 4),
      ]),
    ).toBe(2);
  });

  it("groups captures by the thing they describe", () => {
    const grouped = groupCaptures([
      capture("ESTIMATED", 1, "witness-chair"),
      capture("ESTIMATED", 2, "witness-chair"),
      capture("ESTIMATED", 3),
    ]);
    expect(grouped.get("witness-chair")).toHaveLength(2);
    expect(grouped.get("(unassigned)")).toHaveLength(1);
  });
});

describe("the export block says what it is", () => {
  const captures: readonly AuthoringCapture[] = [
    createAuthoringCapture({
      sceneId: "room-a",
      kind: "floor-line",
      subjectId: "podium",
      point: platePointFromPointer(500, 400, PROJECTION),
      certainty: "ESTIMATED",
      sequence: 1,
    }),
    createAuthoringCapture({
      sceneId: "room-b",
      kind: "seat-plane",
      point: platePointFromPointer(300, 300, PROJECTION),
      certainty: "VERIFIED",
      sequence: 2,
    }),
  ];

  it("carries a warning against promoting a certainty on paste", () => {
    const block = buildCaptureExport("room-a", captures);
    expect(block.certaintyNote).toBe(CAPTURE_CERTAINTY_NOTE);
    expect(block.certaintyNote).toMatch(/not a measurement of a real room/);
  });

  it("exports only the scene being authored", () => {
    const block = buildCaptureExport("room-a", captures);
    expect(block.captures).toHaveLength(1);
    expect(block.captures[0]!.sceneId).toBe("room-a");
  });

  it("serializes deterministically and reads no clock", () => {
    const first = serializeCaptureExport(
      buildCaptureExport("room-a", captures),
    );
    const second = serializeCaptureExport(
      buildCaptureExport("room-a", captures),
    );
    expect(second).toBe(first);
    expect(first).toContain("ESTIMATED");
  });
});
