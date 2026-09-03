import { describe, expect, it } from "vitest";

import {
  CONTACT_TOLERANCE_PERCENT,
  occludersInFrontOf,
  placeSubjectAtAnchor,
  resolvePerspectiveScale,
  sortPlacementsByDepth,
  type PlacementSubject,
} from "./scene-placement";
import {
  OFFICE_FIXTURE_SCENE_ID,
  requireScene,
  requireSceneAnchor,
  SCENE_REGISTRY,
} from "./scene-registry";

const OFFICE = requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID);

/** A standing body with honest sole contacts, in the generation-2 shape. */
function standingSubject(
  id: string,
  overrides: Partial<PlacementSubject> = {},
): PlacementSubject {
  return {
    id,
    bodyCanvas: { width: 420, height: 840 },
    root: { x: 0.5, y: 0.55 },
    contacts: {
      leftFoot: { x: 0.38, y: 0.985 },
      rightFoot: { x: 0.62, y: 0.985 },
    },
    bodyFamily: "dev-g2-broad",
    poseFamily: "standing-neutral",
    facing: "front",
    referenceWidthPercent: OFFICE.standardBodyWidthPercent!,
    ...overrides,
  };
}

function seatedSubject(
  id: string,
  overrides: Partial<PlacementSubject> = {},
): PlacementSubject {
  return {
    id,
    bodyCanvas: { width: 420, height: 660 },
    root: { x: 0.5, y: 0.62 },
    contacts: {
      seatedPelvis: { x: 0.5, y: 0.62 },
      leftFoot: { x: 0.37, y: 0.975 },
      rightFoot: { x: 0.63, y: 0.975 },
    },
    bodyFamily: "dev-g2-broad",
    poseFamily: "seated-at-desk",
    facing: "front",
    referenceWidthPercent: OFFICE.standardBodyWidthPercent!,
    ...overrides,
  };
}

describe("perspective scale from floor calibration", () => {
  it("interpolates linearly between the two authored pairs", () => {
    // near { 100%, 1.05 }, far { 60%, 0.80 } -> 0.00625 of scale per percent.
    expect(resolvePerspectiveScale(OFFICE, 100)).toBeCloseTo(1.05, 10);
    expect(resolvePerspectiveScale(OFFICE, 60)).toBeCloseTo(0.8, 10);
    expect(resolvePerspectiveScale(OFFICE, 84)).toBeCloseTo(0.95, 10);
    expect(resolvePerspectiveScale(OFFICE, 82)).toBeCloseTo(0.9375, 10);
    expect(resolvePerspectiveScale(OFFICE, 68)).toBeCloseTo(0.85, 10);
  });

  it("clamps beyond the authored pairs rather than extrapolating", () => {
    expect(resolvePerspectiveScale(OFFICE, 0)).toBeCloseTo(0.8, 10);
    expect(resolvePerspectiveScale(OFFICE, 100_000)).toBeCloseTo(1.05, 10);
  });

  it("puts a person further back at a smaller scale than one further forward", () => {
    expect(resolvePerspectiveScale(OFFICE, 60)).toBeLessThan(
      resolvePerspectiveScale(OFFICE, 90),
    );
  });
});

describe("standing placement from foot contacts", () => {
  const anchor = requireSceneAnchor(OFFICE, "near-desk-standing");

  it("lands the sole line on the anchor's floor line", () => {
    const placement = placeSubjectAtAnchor(
      OFFICE,
      anchor,
      standingSubject("a"),
    );
    const soleY = Math.max(
      ...placement.floorContactMarkers.map((marker) => marker.yPercent),
    );
    expect(soleY).toBeCloseTo(anchor.floorContact!.floor_y_percent, 9);
    expect(placement.diagnostics).toEqual([]);
  });

  it("centres the stance on the anchor's x", () => {
    const placement = placeSubjectAtAnchor(
      OFFICE,
      anchor,
      standingSubject("a"),
    );
    const [left, right] = placement.floorContactMarkers;
    expect((left!.xPercent + right!.xPercent) / 2).toBeCloseTo(
      anchor.xPercent,
      9,
    );
  });

  it("derives its scale from the floor, not from the caller", () => {
    const placement = placeSubjectAtAnchor(
      OFFICE,
      anchor,
      standingSubject("a"),
    );
    expect(placement.scale).toBeCloseTo(0.9375, 10);
    expect(placement.box.widthPercent).toBeCloseTo(21.5 * 0.9375, 9);
  });

  /**
   * ACCEPTANCE: swapping one body for another at the same anchor must keep
   * contact with no per-character retuning. Two bodies with different canvases,
   * different stances and different reference widths still land their soles on
   * the same floor line.
   */
  it("keeps contact when a different body is swapped onto the same anchor", () => {
    const slim = standingSubject("slim", {
      bodyCanvas: { width: 360, height: 900 },
      root: { x: 0.5, y: 0.52 },
      contacts: {
        leftFoot: { x: 0.42, y: 0.99 },
        rightFoot: { x: 0.58, y: 0.99 },
      },
      referenceWidthPercent: 13,
    });
    const broad = standingSubject("broad");

    for (const subject of [slim, broad]) {
      const placement = placeSubjectAtAnchor(OFFICE, anchor, subject);
      const soleY = Math.max(
        ...placement.floorContactMarkers.map((marker) => marker.yPercent),
      );
      expect(soleY, subject.id).toBeCloseTo(
        anchor.floorContact!.floor_y_percent,
        9,
      );
      const [left, right] = placement.floorContactMarkers;
      expect((left!.xPercent + right!.xPercent) / 2, subject.id).toBeCloseTo(
        anchor.xPercent,
        9,
      );
      expect(placement.diagnostics, subject.id).toEqual([]);
    }
  });

  it("warns when a body is too wide for the anchor's footprint", () => {
    const placement = placeSubjectAtAnchor(
      OFFICE,
      anchor,
      standingSubject("wide", { referenceWidthPercent: 40 }),
    );
    const warning = placement.diagnostics.find(
      (entry) =>
        entry.code === "sprite-exceeds-footprint" &&
        entry.message.includes("footprint"),
    );
    expect(warning).toBeDefined();
    expect(warning!.warning).toBe("W3");
  });

  it("warns when the pose or the facing is not permitted at the anchor", () => {
    const placement = placeSubjectAtAnchor(
      OFFICE,
      anchor,
      standingSubject("wrong", {
        poseFamily: "seated-at-desk",
        facing: "three-quarter-left",
      }),
    );
    expect(placement.diagnostics.map((entry) => entry.warning).sort()).toEqual([
      "W4",
      "W6",
    ]);
  });
});

describe("seated placement from the seat plane and the floor", () => {
  const anchor = requireSceneAnchor(OFFICE, "primary-desk-chair");

  it("lands the seated pelvis on the seat plane", () => {
    const placement = placeSubjectAtAnchor(OFFICE, anchor, seatedSubject("a"));
    expect(placement.seatedPelvisMarker!.yPercent).toBeCloseTo(
      anchor.seatContact!.seat_plane_y_percent,
      9,
    );
  });

  /**
   * ACCEPTANCE: a deliberately bad seated contact produces a specific warning.
   *
   * This body's pelvis is authored far too high in its own canvas, so sitting
   * it on the seat plane leaves its feet hanging well above the floor — the
   * floating-legs defect, made diagnosable as a named contract mismatch with
   * both numbers printed rather than as "the legs look wrong".
   */
  it("names the floating-legs defect instead of drawing it silently", () => {
    const floating = seatedSubject("floating", {
      contacts: {
        // The pelvis is authored correctly, so this body sits on the seat.
        seatedPelvis: { x: 0.5, y: 0.62 },
        // The soles are authored far too high in the canvas, so the legs stop
        // well short of the floor the chair stands on.
        leftFoot: { x: 0.37, y: 0.8 },
        rightFoot: { x: 0.63, y: 0.8 },
      },
    });
    const placement = placeSubjectAtAnchor(OFFICE, anchor, floating);
    const warning = placement.diagnostics.find(
      (entry) => entry.code === "feet-miss-floor-line",
    );
    expect(warning).toBeDefined();
    expect(warning!.warning).toBe("W2");
    expect(warning!.subject).toBe("floating");
    expect(warning!.anchorId).toBe("primary-desk-chair");
    expect(warning!.message).toContain("above the floor by");
    expect(warning!.message).toContain("84%");
  });

  it("accepts a seated body whose feet reach the floor within tolerance", () => {
    const anchorFloor = anchor.seatContact!.floor_y_percent;
    const placement = placeSubjectAtAnchor(OFFICE, anchor, seatedSubject("ok"));
    const soleY = Math.max(
      ...placement.floorContactMarkers.map((marker) => marker.yPercent),
    );
    expect(Math.abs(soleY - anchorFloor)).toBeLessThanOrEqual(
      CONTACT_TOLERANCE_PERCENT,
    );
    expect(
      placement.diagnostics.some(
        (entry) => entry.code === "feet-miss-floor-line",
      ),
    ).toBe(false);
  });

  /**
   * A generation-1 body declares no contacts at all. It still places — by its
   * pelvis root, exactly as the accepted fixture did — but the runtime says the
   * contact is unverified rather than implying it was checked.
   */
  it("falls back to the pelvis root for a body with no contacts, and says so", () => {
    const legacy = seatedSubject("legacy", { contacts: undefined });
    const placement = placeSubjectAtAnchor(OFFICE, anchor, legacy);
    expect(placement.rootMarker.yPercent).toBeCloseTo(
      anchor.seatContact!.seat_plane_y_percent,
      9,
    );
    const warning = placement.diagnostics.find(
      (entry) => entry.code === "body-declares-no-contacts",
    );
    expect(warning?.message).toContain("unverified");
  });
});

describe("depth ordering and occlusion", () => {
  it("sorts several people by their floor line, furthest back first", () => {
    const placements = [
      placeSubjectAtAnchor(
        OFFICE,
        requireSceneAnchor(OFFICE, "near-desk-standing"),
        standingSubject("near"),
      ),
      placeSubjectAtAnchor(
        OFFICE,
        requireSceneAnchor(OFFICE, "doorway-standing"),
        standingSubject("far"),
      ),
    ];
    expect(
      sortPlacementsByDepth(placements).map((entry) => entry.subjectId),
    ).toEqual(["far", "near"]);
    // ...and reversing the input does not reverse the paint order.
    expect(
      sortPlacementsByDepth([...placements].reverse()).map(
        (entry) => entry.subjectId,
      ),
    ).toEqual(["far", "near"]);
  });

  it("keeps perspective depth and paint order as separate fields", () => {
    const placement = placeSubjectAtAnchor(
      OFFICE,
      requireSceneAnchor(OFFICE, "doorway-standing"),
      standingSubject("a"),
    );
    expect(placement.contactFloorYPercent).toBe(68);
    expect(placement.zOrder).toBe(1);
    expect(placement.contactFloorYPercent).not.toBe(placement.zOrder);
  });

  it("reports only the occluders that paint in front of a given person", () => {
    const front = placeSubjectAtAnchor(
      OFFICE,
      requireSceneAnchor(OFFICE, "left-guest-chair"),
      seatedSubject("guest"),
    );
    const ids = occludersInFrontOf(OFFICE, front).map(
      (occluder) => occluder.id,
    );
    expect(ids).toEqual(["desk-front", "guest-chair-near-arm"]);
  });
});
