import { describe, expect, it } from "vitest";

import type { SceneSurfaceSlot } from "../environment/environment-scene-spec";
import {
  isBakedDecorClass,
  isSemanticContentClass,
  partitionContentClasses,
  validateDynamicSurfaceAuthoring,
  type SceneDynamicSurfaceAuthoring,
} from "./dynamic-surfaces";

function slot(slotId: string, allowed: readonly string[]): SceneSurfaceSlot {
  return {
    slot_id: slotId,
    kind: "wall-board",
    rect_percent: {
      x_percent: 10,
      y_percent: 10,
      width_percent: 20,
      height_percent: 15,
    },
    z_order: 3,
    allowed_content_classes: [...allowed],
  };
}

const CLEAN: SceneDynamicSurfaceAuthoring = {
  sceneId: "generic-hearing-room",
  bakedTextReview: "reviewed",
  semanticSurfaces: [
    { slotId: "agenda-board", contentClasses: ["agenda"] },
    {
      slotId: "front-wall-seal",
      contentClasses: ["jurisdiction-seal", "jurisdiction-name"],
      emptyStateDecor: "wall-artwork",
    },
  ],
  bakedDecor: [
    { decorId: "shelf-books", decorClass: "books", bakedText: "shapes-only" },
    { decorId: "corner-plant", decorClass: "plants", bakedText: "none" },
    {
      decorId: "wall-calendar",
      decorClass: "calendar-grid-block",
      bakedText: "shapes-only",
    },
  ],
};

const SPEC = {
  surface_slots: [
    slot("agenda-board", ["agenda"]),
    slot("front-wall-seal", ["jurisdiction-seal", "jurisdiction-name"]),
  ],
};

function codes(result: { findings: readonly { code: string }[] }): string[] {
  return result.findings.map((finding) => finding.code);
}

describe("the lived-in, not legible line", () => {
  it("accepts restrained decor beside declared semantic surfaces", () => {
    const result = validateDynamicSurfaceAuthoring(CLEAN, SPEC);
    expect(result.valid).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("rejects readable baked text outright", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        bakedDecor: [
          {
            decorId: "wall-notice",
            decorClass: "wall-artwork",
            bakedText: "readable",
          },
        ],
      },
      SPEC,
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("readable-baked-text");
  });

  it("allows text-shaped texture that does not resolve into words", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        bakedDecor: [
          {
            decorId: "spines",
            decorClass: "books",
            bakedText: "shapes-only",
          },
        ],
      },
      SPEC,
    );
    expect(result.valid).toBe(true);
  });

  it("refuses to let simulation-owned information be baked as decor", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        bakedDecor: [
          {
            decorId: "painted-seal",
            decorClass: "jurisdiction-seal" as never,
            bakedText: "none",
          },
        ],
      },
      SPEC,
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("semantic-class-baked-as-decor");
  });

  it("says so when nobody has reviewed the plate for readable text", () => {
    const result = validateDynamicSurfaceAuthoring(
      { ...CLEAN, bakedTextReview: "unreviewed" },
      SPEC,
    );
    expect(codes(result)).toContain("unreviewed-baked-text");
    // A warning, not a rejection: unreviewed is honest, not broken.
    expect(result.valid).toBe(true);
  });
});

describe("semantic slots must be declared dynamic", () => {
  it("catches a spec slot carrying live information with no declaration", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        semanticSurfaces: [
          { slotId: "agenda-board", contentClasses: ["agenda"] },
        ],
      },
      {
        surface_slots: [
          slot("agenda-board", ["agenda"]),
          slot("scoreboard", ["election-result"]),
        ],
      },
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain(
      "spec-slot-carries-semantic-class-without-declaration",
    );
  });

  it("catches a declaration with nowhere on the plate to paint it", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        semanticSurfaces: [
          ...CLEAN.semanticSurfaces,
          { slotId: "ghost-slot", contentClasses: ["headline"] },
        ],
      },
      SPEC,
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("slot-not-declared-in-spec");
  });

  it("rejects a slot that accepts nothing", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        semanticSurfaces: [
          { slotId: "agenda-board", contentClasses: [] },
          CLEAN.semanticSurfaces[1]!,
        ],
      },
      SPEC,
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("semantic-declaration-without-classes");
  });

  it("rejects a fallback that would show placeholder information", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        semanticSurfaces: [
          {
            slotId: "agenda-board",
            contentClasses: ["agenda"],
            emptyStateDecor: "bill-number" as never,
          },
          CLEAN.semanticSurfaces[1]!,
        ],
      },
      SPEC,
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("fallback-decor-is-semantic");
  });

  it("reports a required slot the scene does not have", () => {
    const result = validateDynamicSurfaceAuthoring(CLEAN, SPEC, [
      "agenda-board",
      "briefing-screen",
    ]);
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("required-slot-missing");
  });

  it("catches the same slot declared twice", () => {
    const result = validateDynamicSurfaceAuthoring(
      {
        ...CLEAN,
        semanticSurfaces: [
          ...CLEAN.semanticSurfaces,
          { slotId: "agenda-board", contentClasses: ["agenda"] },
        ],
      },
      SPEC,
    );
    expect(codes(result)).toContain("duplicate-slot-declaration");
  });
});

describe("the two vocabularies do not overlap", () => {
  it("classifies every semantic class as semantic and no decor class as one", () => {
    expect(isSemanticContentClass("bill-number")).toBe(true);
    expect(isSemanticContentClass("election-result")).toBe(true);
    expect(isSemanticContentClass("books")).toBe(false);
    expect(isBakedDecorClass("plants")).toBe(true);
    expect(isBakedDecorClass("headline")).toBe(false);
  });

  it("distinguishes a calendar's grid from a calendar's date", () => {
    // The shape is decor; the value the simulation owns is not.
    expect(isBakedDecorClass("calendar-grid-block")).toBe(true);
    expect(isSemanticContentClass("calendar-date")).toBe(true);
  });

  it("partitions a mixed allowed-content list", () => {
    const parts = partitionContentClasses([
      "agenda",
      "plants",
      "unrecognised-thing",
    ]);
    expect(parts.semantic).toEqual(["agenda"]);
    expect(parts.decor).toEqual(["plants"]);
    expect(parts.unrecognized).toEqual(["unrecognised-thing"]);
  });
});
