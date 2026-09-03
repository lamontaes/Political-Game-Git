import { describe, expect, it } from "vitest";

import { OFFICE_COUNCIL_STAFF_FIXTURE_SCENE } from "../environment/scenes/office-council-staff-fixture";
import {
  DYNAMIC_COMPONENT_FAMILIES,
  MINIMUM_LEGIBLE_HEIGHT_PERCENT,
  slotIsPromotable,
  validateSlotComponentBindings,
} from "./dynamic-components";
import { validateDynamicSurfaceAuthoring } from "./dynamic-surfaces";
import {
  PRODUCTION_DYNAMIC_SURFACE_AUTHORING,
  PRODUCTION_SLOT_COMPONENT_BINDINGS,
} from "./fixtures/dynamic-surface-authoring";
import { PRODUCTION_SCENE_FAMILIES } from "./fixtures/production-scene-families";
import { PRODUCTION_SCENE_SCAFFOLDS } from "./fixtures/production-scenes";
import {
  evaluateScaffoldReadiness,
  projectScaffoldToSpec,
  surfaceSlotsFromScaffold,
  type SceneAuthoringScaffold,
} from "./scene-scaffold";
import { validatePhysicalSceneFamily } from "./semantic-context";

const SCAFFOLDS_BY_ID = new Map<string, SceneAuthoringScaffold>(
  PRODUCTION_SCENE_SCAFFOLDS.map((scaffold) => [scaffold.sceneId, scaffold]),
);

/**
 * Slots for a scene id: from its scaffold, or from the Lexington fixture, which
 * is the one room in the library whose plate is actually in the repository.
 */
function slotsFor(sceneId: string) {
  const scaffold = SCAFFOLDS_BY_ID.get(sceneId);
  if (scaffold) return surfaceSlotsFromScaffold(scaffold);
  expect(sceneId).toBe("office-council-staff-fixture");
  return OFFICE_COUNCIL_STAFF_FIXTURE_SCENE.surface_slots ?? [];
}

describe("the production scene families", () => {
  it("validates every family", () => {
    expect(PRODUCTION_SCENE_FAMILIES).toHaveLength(6);
    for (const family of PRODUCTION_SCENE_FAMILIES) {
      const result = validatePhysicalSceneFamily(family);
      expect(result.findings, family.familyId).toEqual([]);
      expect(result.valid, family.familyId).toBe(true);
    }
  });

  it("keeps the reusable rooms generic and says so where a room is not", () => {
    const scoped = PRODUCTION_SCENE_FAMILIES.filter(
      (family) => family.architectureScope === "jurisdiction-specific",
    );
    // Exactly two rooms carry a real place in their pixels: the office painted
    // with one city's street map, and the suite whose window frames a real
    // capitol. Both name the scope they are stuck in.
    expect(scoped.map((family) => family.familyId)).toEqual([
      "COUNCIL_STAFF_OFFICE_LEXINGTON_01",
      "EXECUTIVE_PRIVATE_OFFICE_01",
    ]);
    for (const family of scoped) {
      expect(family.jurisdictionScope, family.familyId).toBeDefined();
    }
    for (const family of PRODUCTION_SCENE_FAMILIES) {
      if (family.architectureScope === "generic") {
        expect(family.jurisdictionScope, family.familyId).toBeUndefined();
      }
    }
  });

  it("gives every apartment more than one thing the world could call it", () => {
    const apartments = PRODUCTION_SCENE_FAMILIES.filter((family) =>
      family.familyId.startsWith("HOME_APARTMENT_"),
    );
    expect(apartments).toHaveLength(3);
    for (const family of apartments) {
      // The whole argument for the library: one plate, several homes.
      expect(
        family.semanticUses.length,
        family.familyId,
      ).toBeGreaterThanOrEqual(3);
      expect(family.architectureScope, family.familyId).toBe("generic");
    }
  });
});

describe("the production scene scaffolds", () => {
  it("carries the six approved rooms, five of them as scaffolds", () => {
    expect(PRODUCTION_SCENE_SCAFFOLDS.map((s) => s.sceneId)).toEqual([
      "apartment-ordinary-02",
      "apartment-settled-03",
      "apartment-starter-01",
      "civic-community-meeting-hall",
      "executive-private-office",
    ]);
    // The sixth is the Lexington fixture, which already exists as a spec
    // because its plate is the one that is actually in this repository.
    expect(OFFICE_COUNCIL_STAFF_FIXTURE_SCENE.scene_id).toBe(
      "office-council-staff-fixture",
    );
  });

  it("refuses to project any of them, because none has a plate or a camera", () => {
    for (const scaffold of PRODUCTION_SCENE_SCAFFOLDS) {
      const projection = projectScaffoldToSpec(scaffold);
      // The refusal is the feature. A spec with plausible numbers standing in
      // for decisions nobody made is worse than no spec at all.
      expect(projection.spec, scaffold.sceneId).toBeNull();
      expect(projection.readiness.registrable, scaffold.sceneId).toBe(false);
      expect(scaffold.raster, scaffold.sceneId).toBeNull();

      const blocking = projection.readiness.gaps
        .filter((gap) => gap.blocking)
        .map((gap) => gap.path);
      expect(blocking, scaffold.sceneId).toContain("camera");
      expect(blocking, scaffold.sceneId).toContain("safeArea");
      expect(blocking, scaffold.sceneId).toContain("essentialContentArea");
    }
  });

  it("settles the geometry that was measured and leaves the seat boxes open", () => {
    for (const scaffold of PRODUCTION_SCENE_SCAFFOLDS) {
      const readiness = evaluateScaffoldReadiness(scaffold);
      const open = new Set(readiness.gaps.map((gap) => gap.path));

      // Measured off the plate, so settled.
      expect(open, scaffold.sceneId).not.toContain("floorCalibration");
      expect(open, scaffold.sceneId).not.toContain("standardBodyWidthPercent");

      for (const anchor of scaffold.anchors) {
        expect(open, `${scaffold.sceneId}/${anchor.id}`).not.toContain(
          `anchors.${anchor.id}.xPercent`,
        );
        expect(open, `${scaffold.sceneId}/${anchor.id}`).not.toContain(
          `anchors.${anchor.id}.zOrder`,
        );
        if (anchor.kind === "seat") {
          // The plane was readable off the picture; the seat's width and the
          // paint order of its pan and backrest were not.
          expect(anchor.seatPlaneYPercent.state, anchor.id).toBe("resolved");
          expect(anchor.seatContact.state, anchor.id).toBe("unresolved");
        } else {
          expect(anchor.floorContact.state, anchor.id).toBe("resolved");
        }
      }
    }
  });

  it("marks every measurement as an estimate, because none of it is plan-derived", () => {
    for (const scaffold of PRODUCTION_SCENE_SCAFFOLDS) {
      const fields = [
        scaffold.floorCalibration,
        scaffold.standardBodyWidthPercent,
        ...scaffold.anchors.map((anchor) => anchor.xPercent),
        ...scaffold.occluders.map((occluder) => occluder.regionPercent),
        ...scaffold.surfaceSlots.map((slot) => slot.rectPercent),
      ];
      for (const field of fields) {
        if (field.state !== "resolved") continue;
        expect(field.certainty, scaffold.sceneId).toBe("ESTIMATED");
        expect(field.source, scaffold.sceneId).toContain("visual estimate");
      }
    }
  });

  it("declares no alpha mask it does not have", () => {
    for (const scaffold of PRODUCTION_SCENE_SCAFFOLDS) {
      for (const occluder of scaffold.occluders) {
        // Regions are traced; masks are rendered, and none has been.
        expect(occluder.regionPercent.state, occluder.id).toBe("resolved");
        expect(occluder.assetId.state, occluder.id).toBe("unresolved");
      }
    }
  });
});

describe("what the simulation owns in each room", () => {
  it("validates every scene's dynamic-surface authoring against its slots", () => {
    expect(PRODUCTION_DYNAMIC_SURFACE_AUTHORING).toHaveLength(6);
    for (const authoring of PRODUCTION_DYNAMIC_SURFACE_AUTHORING) {
      const result = validateDynamicSurfaceAuthoring(
        authoring,
        { surface_slots: slotsFor(authoring.sceneId) },
        [],
      );
      expect(result.findings, authoring.sceneId).toEqual([]);
      expect(result.valid, authoring.sceneId).toBe(true);
    }
  });

  it("has had a person look at every plate for readable text", () => {
    for (const authoring of PRODUCTION_DYNAMIC_SURFACE_AUTHORING) {
      // `unreviewed` is the honest default and a real finding. Every room here
      // has been through the inspection, so every room says `reviewed`.
      expect(authoring.bakedTextReview, authoring.sceneId).toBe("reviewed");
      for (const decor of authoring.bakedDecor) {
        expect(decor.bakedText, decor.decorId).not.toBe("readable");
      }
    }
  });

  it("refuses every micro-frame it declared as decor, by the same rule", () => {
    const framed = PRODUCTION_DYNAMIC_SURFACE_AUTHORING.flatMap((authoring) =>
      authoring.bakedDecor
        .filter((decor) => decor.regionPercent !== undefined)
        .map((decor) => ({ sceneId: authoring.sceneId, decor })),
    );
    // Nine inspected frames stayed decor. Eight are simply too small; the
    // ninth (the settled apartment's angled side-wall art) is large enough and
    // was refused on perspective instead, which the rule cannot see.
    expect(framed.length).toBeGreaterThanOrEqual(9);
    const tooSmall = framed.filter(
      ({ decor }) =>
        !slotIsPromotable(decor.regionPercent!, "picture-frame" as never)
          .promotable,
    );
    expect(tooSmall.length).toBeGreaterThanOrEqual(8);
    for (const { decor } of tooSmall) {
      expect(
        decor.regionPercent!.height_percent < MINIMUM_LEGIBLE_HEIGHT_PERCENT ||
          decor.regionPercent!.width_percent < 5,
        decor.decorId,
      ).toBe(true);
    }
  });

  it("promotes exactly the surfaces that carry a fact about the world", () => {
    const promoted = PRODUCTION_DYNAMIC_SURFACE_AUTHORING.flatMap((authoring) =>
      authoring.semanticSurfaces.map((surface) => surface.slotId),
    );
    expect(promoted).toContain("wall-district-map-slot");
    expect(promoted).toContain("podium-front-placard");
    expect(promoted).toContain("jurisdiction-state-flag");
    expect(
      promoted.filter((id) => id === "television-screen-slot"),
    ).toHaveLength(3);
    // Not one bookcase, certificate or side-table frame is anywhere in it.
    for (const id of promoted) {
      expect(id).not.toMatch(/bookcase|cert|table-side|wall-edge/);
    }
  });
});

describe("what may be drawn on the surfaces it owns", () => {
  it("validates every binding against the slot it annotates", () => {
    for (const [sceneId, bindings] of Object.entries(
      PRODUCTION_SLOT_COMPONENT_BINDINGS,
    )) {
      const result = validateSlotComponentBindings(bindings, slotsFor(sceneId));
      expect(result.findings, sceneId).toEqual([]);
      expect(result.valid, sceneId).toBe(true);
    }
  });

  it("binds a component family to every promoted slot that takes one", () => {
    for (const authoring of PRODUCTION_DYNAMIC_SURFACE_AUTHORING) {
      const bindings =
        PRODUCTION_SLOT_COMPONENT_BINDINGS[authoring.sceneId] ?? [];
      const bound = new Set(bindings.map((binding) => binding.slotId));
      for (const surface of authoring.semanticSurfaces) {
        expect(bound, `${authoring.sceneId}/${surface.slotId}`).toContain(
          surface.slotId,
        );
      }
    }
  });

  it("keeps a chamber voting board off a domestic television", () => {
    const televisions = Object.values(PRODUCTION_SLOT_COMPONENT_BINDINGS)
      .flat()
      .filter((binding) => binding.slotId === "television-screen-slot");
    expect(televisions).toHaveLength(3);
    for (const binding of televisions) {
      expect(binding.componentFamilies).not.toContain("ROLL_CALL_GRID");
      expect(binding.componentFamilies).toContain("RESULT_BOARD");
    }
  });

  it("binds no component at all to a window, a flag or a portrait", () => {
    const imageOnly = Object.values(PRODUCTION_SLOT_COMPONENT_BINDINGS)
      .flat()
      .filter((binding) =>
        ["window-view", "flag-standard", "official-portrait-slot"].includes(
          binding.surfaceKind,
        ),
      );
    expect(imageOnly.length).toBeGreaterThanOrEqual(4);
    for (const binding of imageOnly) {
      expect(binding.componentFamilies, binding.slotId).toEqual([]);
    }
  });

  it("gives every component family an empty state that admits the absence", () => {
    expect(DYNAMIC_COMPONENT_FAMILIES).toHaveLength(12);
    for (const family of DYNAMIC_COMPONENT_FAMILIES) {
      expect(family.emptyState.length, family.id).toBeGreaterThan(20);
      expect(family.surfaceKinds.length, family.id).toBeGreaterThan(0);
      expect(family.prohibitedInferences.length, family.id).toBeGreaterThan(0);
    }
  });

  it("refuses a binding on a slot below the legibility threshold", () => {
    const result = validateSlotComponentBindings(
      [
        {
          slotId: "bookcase-frame-01",
          surfaceKind: "monitor-display",
          componentFamilies: ["LINE_SERIES"],
          fallbackDecor: "neutral-photograph",
        },
      ],
      [
        {
          slot_id: "bookcase-frame-01",
          kind: "monitor-display",
          rect_percent: {
            x_percent: 5.5,
            y_percent: 41,
            width_percent: 4,
            height_percent: 8,
          },
          z_order: 1,
          allowed_content_classes: ["headline"],
        },
      ],
    );
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "slot-below-legibility-threshold",
    );
  });

  it("refuses a family drawn on a surface it cannot be drawn on", () => {
    const result = validateSlotComponentBindings(
      [
        {
          slotId: "podium-front-placard",
          surfaceKind: "podium-placard",
          componentFamilies: ["ROLL_CALL_GRID"],
          fallbackDecor: "furniture-detail",
        },
      ],
      [
        {
          slot_id: "podium-front-placard",
          kind: "podium-placard",
          rect_percent: {
            x_percent: 27,
            y_percent: 44,
            width_percent: 10.5,
            height_percent: 38,
          },
          z_order: 3,
          allowed_content_classes: ["jurisdiction-seal"],
        },
      ],
    );
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "family-cannot-draw-on-surface",
    );
  });
});
