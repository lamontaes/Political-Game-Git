import { describe, expect, it } from "vitest";

import { validateEnvironmentSceneSpec } from "../environment/environment-scene-spec";
import { registerScene } from "../presentation/scene-registry";
import { toCanonicalJson } from "./canonical-json";
import {
  createSceneAuthoringScaffold,
  evaluateScaffoldReadiness,
  fieldValue,
  isResolved,
  projectScaffoldToSpec,
  resolved,
  unresolved,
  type SceneAuthoringScaffold,
  type SceneScaffoldInput,
} from "./scene-scaffold";
import { planRuntimeTiers } from "./tier-plan";

const BASE_INPUT: SceneScaffoldInput = {
  sceneId: "generic-hearing-room-scaffold",
  label: "Generic public hearing room",
  familyId: "PUBLIC_HEARING_ROOM_01",
  plate: { width: 4_096, height: 2_304 },
  plannedAnchors: [
    { id: "witness-chair", type: "witness-seat", kind: "seat" },
    {
      id: "podium-standing",
      type: "speaking-position",
      kind: "floor-standing",
    },
  ],
  plannedOccluders: [{ id: "dais-front", type: "furniture" }],
  plannedSurfaceSlots: [{ slotId: "agenda-board" }],
};

describe("scaffold creation", () => {
  it("invents no contacts, no floor lines and no calibration", () => {
    const scaffold = createSceneAuthoringScaffold(BASE_INPUT);
    expect(isResolved(scaffold.floorCalibration)).toBe(false);
    expect(isResolved(scaffold.camera)).toBe(false);
    expect(isResolved(scaffold.safeArea)).toBe(false);
    expect(isResolved(scaffold.standardBodyWidthPercent)).toBe(false);
    for (const anchor of scaffold.anchors) {
      expect(isResolved(anchor.xPercent)).toBe(false);
      expect(isResolved(anchor.floorContact)).toBe(false);
      expect(isResolved(anchor.seatContact)).toBe(false);
      expect(isResolved(anchor.footprintPercent)).toBe(false);
    }
  });

  it("marks every unresolved field UNKNOWN or UNVERIFIED with a reason", () => {
    const readiness = evaluateScaffoldReadiness(
      createSceneAuthoringScaffold(BASE_INPUT),
    );
    expect(readiness.gaps.length).toBeGreaterThan(0);
    for (const gap of readiness.gaps) {
      expect(["UNKNOWN", "UNVERIFIED"]).toContain(gap.certainty);
      expect(gap.reason.length).toBeGreaterThan(20);
      expect(gap.path.length).toBeGreaterThan(0);
    }
  });

  it("fills in only what the file itself answers", () => {
    const scaffold = createSceneAuthoringScaffold(BASE_INPUT);
    expect(scaffold.plate).toEqual({ width: 4_096, height: 2_304 });
    expect(scaffold.sceneId).toBe("generic-hearing-room-scaffold");
    expect(scaffold.familyId).toBe("PUBLIC_HEARING_ROOM_01");
    // No plate art was supplied, so there is honestly no raster.
    expect(scaffold.raster).toBeNull();
  });

  it("carries an accepted tier ladder in, hashes and all", () => {
    const plan = planRuntimeTiers({
      master: {
        assetId: "env_generic_hearing_room_01",
        width: 5_120,
        height: 2_880,
        nativeDetailWidth: 2_560,
        masterPath: "art/masters/env_generic_hearing_room_01.png",
      },
      outputDirectory: "art/generated/env_generic_hearing_room_01",
    });
    const hashes = new Map(
      plan.tiers.map((tier) => [tier.width, `${tier.width}`.padStart(64, "0")]),
    );
    const scaffold = createSceneAuthoringScaffold({
      ...BASE_INPUT,
      tierPlan: plan,
      tierHashes: hashes,
    });
    expect(scaffold.raster?.tiers).toHaveLength(4);
    const top = scaffold.raster!.tiers.find((tier) => tier.width === 4_096)!;
    expect(top.derivation).toBe("external-upscale-derivative");
    expect(top.native_detail_width).toBe(2_560);
  });

  it("distinguishes a seat anchor's required contact from a standing one's", () => {
    const readiness = evaluateScaffoldReadiness(
      createSceneAuthoringScaffold(BASE_INPUT),
    );
    const blocking = readiness.gaps
      .filter((gap) => gap.blocking)
      .map((gap) => gap.path);
    expect(blocking).toContain("anchors.witness-chair.seatContact");
    expect(blocking).toContain("anchors.podium-standing.floorContact");
    expect(blocking).not.toContain("anchors.witness-chair.floorContact");
    expect(blocking).not.toContain("anchors.podium-standing.seatContact");
  });

  it("says a seated person's feet reach the floor, in the gap reason itself", () => {
    const scaffold = createSceneAuthoringScaffold(BASE_INPUT);
    const seat = scaffold.anchors.find(
      (anchor) => anchor.id === "witness-chair",
    )!;
    expect(seat.seatContact.state).toBe("unresolved");
    if (seat.seatContact.state === "unresolved") {
      expect(seat.seatContact.reason).toMatch(/feet are on the floor/);
    }
  });
});

describe("projection refuses an unfinished scene", () => {
  it("yields no spec while a blocking gap remains", () => {
    const projection = projectScaffoldToSpec(
      createSceneAuthoringScaffold(BASE_INPUT),
    );
    expect(projection.spec).toBeNull();
    expect(projection.readiness.registrable).toBe(false);
    expect(projection.readiness.blockingGapCount).toBeGreaterThan(0);
  });

  it("does not substitute plausible defaults for missing decisions", () => {
    const projection = projectScaffoldToSpec(
      createSceneAuthoringScaffold(BASE_INPUT),
    );
    // The refusal is the feature: no spec at all beats a spec full of guesses.
    expect(projection.spec).toBeNull();
  });
});

/** Settles every blocking field, leaving the optional ones alone. */
function completeScaffold(): SceneAuthoringScaffold {
  const base = createSceneAuthoringScaffold(BASE_INPUT);
  return {
    ...base,
    camera: resolved(
      {
        minimum_aspect_ratio: 1.3,
        maximum_aspect_ratio: 2.4,
        horizontal_focus: 0.5,
        vertical_focus: 0.55,
      },
      "ESTIMATED",
      "author",
    ),
    safeArea: resolved(
      { x: 200, y: 100, width: 3_696, height: 2_104 },
      "ESTIMATED",
      "author",
    ),
    essentialContentArea: resolved(
      { x: 600, y: 300, width: 2_896, height: 1_704 },
      "ESTIMATED",
      "author",
    ),
    floorCalibration: resolved(
      {
        near: { floor_y_percent: 92, scale: 1.1 },
        far: { floor_y_percent: 62, scale: 0.6 },
      },
      "ESTIMATED",
      "author",
    ),
    standardBodyWidthPercent: resolved(11, "ESTIMATED", "author"),
    anchors: base.anchors.map((anchor) =>
      anchor.kind === "seat"
        ? {
            ...anchor,
            xPercent: resolved(38, "ESTIMATED", "overlay"),
            seatContact: resolved(
              {
                seat_plane_y_percent: 74,
                seat_front_x_percent: 36,
                seat_width_percent: 9,
                floor_y_percent: 86,
                seat_z_order: 10,
                backrest_z_order: 4,
              },
              "ESTIMATED",
              "overlay",
            ),
          }
        : {
            ...anchor,
            xPercent: resolved(64, "ESTIMATED", "overlay"),
            floorContact: resolved(
              { floor_y_percent: 88, max_foot_spread_percent: 5 },
              "ESTIMATED",
              "overlay",
            ),
          },
    ),
    surfaceSlots: base.surfaceSlots.map((slot) => ({
      ...slot,
      kind: resolved("monitor-or-bulletin-board", "ESTIMATED", "author"),
      rectPercent: resolved(
        { x_percent: 10, y_percent: 20, width_percent: 18, height_percent: 12 },
        "ESTIMATED",
        "overlay",
      ),
      zOrder: resolved(2, "ESTIMATED", "author"),
      allowedContentClasses: resolved(
        ["agenda"],
        "ESTIMATED",
        "author",
      ),
    })),
  };
}

describe("projection of a completed scaffold", () => {
  it("produces a spec the environment validator accepts", () => {
    const projection = projectScaffoldToSpec(completeScaffold());
    expect(projection.readiness.registrable).toBe(true);
    expect(projection.spec).not.toBeNull();
    const validation = validateEnvironmentSceneSpec(projection.spec);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it("produces a spec the runtime registry accepts", () => {
    const projection = projectScaffoldToSpec(completeScaffold());
    const scene = registerScene(projection.spec!);
    expect(scene.sceneId).toBe("generic-hearing-room-scaffold");
    expect(scene.anchors.size).toBe(2);
    expect(scene.anchors.get("witness-chair")!.contactFloorYPercent).toBe(86);
    expect(scene.surfaceSlots).toHaveLength(1);
  });

  it("carries the remaining non-blocking unknowns into the spec explicitly", () => {
    const projection = projectScaffoldToSpec(completeScaffold());
    const unknowns = projection.spec!.explicit_unknowns ?? [];
    expect(unknowns.length).toBeGreaterThan(0);
    // A scene may register with gaps; it may not register while hiding them.
    expect(unknowns.some((entry) => entry.includes("UNKNOWN"))).toBe(true);
    expect(
      unknowns.some((entry) => entry.startsWith("occluders.dais-front")),
    ).toBe(true);
  });

  it("is deterministic for the same scaffold", () => {
    expect(
      toCanonicalJson(projectScaffoldToSpec(completeScaffold()).spec),
    ).toBe(toCanonicalJson(projectScaffoldToSpec(completeScaffold()).spec));
  });
});

describe("field helpers", () => {
  it("returns null rather than a default for an unresolved field", () => {
    expect(fieldValue(unresolved("nobody has decided"))).toBeNull();
    expect(fieldValue(resolved(42, "VERIFIED"))).toBe(42);
  });

  it("keeps the certainty an author chose", () => {
    const field = resolved(7, "VERIFIED", "plan sheet A-101");
    expect(field.certainty).toBe("VERIFIED");
    expect(field.source).toBe("plan sheet A-101");
  });
});
