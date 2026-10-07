import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import {
  BODY_BUILDS,
  composeEnginePerson,
  engineRecipeKey,
  mirrorToFace,
  posedPieces,
  type EngineRecipe,
  type PackPresentation,
  type PeoplePackManifest,
  type TurnedBodyView,
} from "./pack";
import type { Raster } from "./raster";
import { engineRecipeFor } from "./recipe";
import type { Person } from "../../simulation/types";

const manifest = manifestJson as unknown as PeoplePackManifest;

// Fixture views reuse shipped layers to exercise view admission and raster
// mirroring; this does not assert that side/back paintings have been delivered.
function withViews(
  pack: PackPresentation,
  views: readonly TurnedBodyView[],
): PackPresentation {
  return {
    ...pack,
    views: Object.fromEntries(
      views.map((view) => [
        view,
        {
          canonical: pack.canonical,
          bodies: pack.bodies,
          faces: pack.faces,
          hair: pack.hair,
          toward: "right",
        },
      ]),
    ),
    outfits: pack.outfits.map((outfit) => ({
      ...outfit,
      views: Object.fromEntries(views.map((view) => [view, outfit])),
    })),
  };
}

function recipe(pack: PackPresentation): EngineRecipe {
  return {
    presentation: "feminine",
    build: "average",
    shade: 4,
    face: pack.faces[0]!.id,
    hair: pack.hair[0]!.id,
    hairColor: "natural",
    outfit: pack.outfits[0]!.id,
  };
}

function read(file: string): Raster {
  const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}

describe("back and side view rendering", () => {
  it("keeps every shipped outfit clothed while new views await their artwork", () => {
    for (const presentation of ["feminine", "masculine"] as const) {
      const pack = manifest.presentations[presentation];
      for (const build of BODY_BUILDS)
        for (const outfit of pack.outfits)
          for (const view of ["side", "back"] as const) {
            const pieces = posedPieces(
              pack,
              { ...recipe(pack), presentation, build, outfit: outfit.id, view },
              (file) => existsSync(`art/people-engine/v1/${file}`),
            );
            expect(pieces.outfit).toBeDefined();
            for (const file of [
              pieces.body.file,
              pieces.outfit!.file,
              pieces.face.file,
              pieces.hair.front,
              pieces.hair.back,
            ])
              expect(existsSync(`art/people-engine/v1/${file}`)).toBe(true);
          }
    }
  });

  it("carries the scene's view and facing through a recorded person's recipe", () => {
    const person = {
      id: "person:view-proof",
      birthDate: "1990-04-01",
      appearance: { seed: "view-proof", recipeVersion: "appearance-recipe-v1" },
    } as unknown as Person;
    const resolved = engineRecipeFor(person, "2026-10-07", manifest, {
      view: "side",
      facing: "left",
    });
    expect(resolved?.view).toBe("side");
    expect(resolved?.facing).toBe("left");
  });

  it("uses a complete requested view, otherwise three-quarter, then front", () => {
    for (const presentation of ["feminine", "masculine"] as const) {
      const original = manifest.presentations[presentation];
      for (const build of BODY_BUILDS)
        for (const view of ["back", "side"] as const)
          for (const views of [
            [view, "three-quarter"],
            ["three-quarter"],
            [],
          ] as readonly (readonly TurnedBodyView[])[]) {
            const pack = withViews(original, views);
            const pieces = posedPieces(pack, {
              ...recipe(pack),
              presentation,
              build,
              view,
            });
            expect(pieces.view).toBe(views[0] ?? "front");
            expect(pieces.outfit).toBeDefined();
          }
    }
  });

  it("rejects an incomplete view instead of mixing layers or drawing bare", () => {
    const pack = withViews(manifest.presentations.feminine, [
      "side",
      "three-quarter",
    ]);
    const base = { ...recipe(pack), view: "side" as const };
    for (const missing of ["outfit", "face", "hair"] as const) {
      const incomplete: PackPresentation =
        missing === "outfit"
          ? {
              ...pack,
              outfits: pack.outfits.map((outfit) => ({
                ...outfit,
                views: { "three-quarter": outfit.views!["three-quarter"] },
              })),
            }
          : {
              ...pack,
              views: {
                ...pack.views,
                side: {
                  ...pack.views!.side!,
                  [missing === "face" ? "faces" : "hair"]: [],
                },
              },
            };
      const pieces = posedPieces(incomplete, base);
      expect(pieces.view).toBe("three-quarter");
      expect(pieces.outfit).toBeDefined();
    }
    const absentFile: PackPresentation = {
      ...pack,
      views: {
        ...pack.views,
        side: {
          ...pack.views!.side!,
          bodies: {
            ...pack.bodies,
            average: { ...pack.bodies.average, file: "not-delivered.png" },
          },
        },
      },
    };
    expect(
      posedPieces(absentFile, base, (file) => file !== "not-delivered.png")
        .view,
    ).toBe("three-quarter");
  });

  it("keeps available pose art before falling back to a standing turned view", () => {
    const pack = withViews(manifest.presentations.feminine, [
      "side",
      "three-quarter",
    ]);
    const pieces = posedPieces(pack, {
      ...recipe(pack),
      view: "side",
      pose: "arms-folded",
    });
    expect([pieces.pose, pieces.view]).toEqual(["arms-folded", "front"]);
  });

  it("mirrors the resolved view's pixels and anchors toward the requested side", () => {
    const pack = withViews(manifest.presentations.feminine, ["three-quarter"]);
    const fixture: PeoplePackManifest = {
      ...manifest,
      presentations: { ...manifest.presentations, feminine: pack },
    };
    const base = { ...recipe(pack), view: "back" as const };
    const right = composeEnginePerson(fixture, read, {
      ...base,
      facing: "right",
    });
    const left = composeEnginePerson(fixture, read, {
      ...base,
      facing: "left",
    });
    expect(right.view).toBe("three-quarter");
    expect(left.view).toBe("three-quarter");
    const { width, height } = right.raster;
    for (let y = 0; y < height; y += 13)
      for (let x = 0; x < width; x += 11) {
        const a = (y * width + x) * 4;
        const b = (y * width + width - 1 - x) * 4;
        expect(Array.from(left.raster.data.subarray(b, b + 4))).toEqual(
          Array.from(right.raster.data.subarray(a, a + 4)),
        );
      }
    expect(left.anchors.neck.centerX).toBe(
      width - 1 - right.anchors.neck.centerX,
    );
    expect(posedPieces(pack, { ...base, facing: "left" }).toward).toBe("left");
    expect(mirrorToFace(pack, { ...base, facing: "left" }, 30, 70)).toBe(false);
  });

  it("keeps legacy recipe keys and distinguishes new views and facing requests", () => {
    const base = recipe(manifest.presentations.feminine);
    expect(engineRecipeKey({ ...base, view: "front" })).toBe(
      engineRecipeKey(base),
    );
    const keys = new Set(["side", "back"] as const);
    expect(
      new Set(
        [...keys].flatMap((view) =>
          (["left", "right"] as const).map((facing) =>
            engineRecipeKey({ ...base, view, facing }),
          ),
        ),
      ).size,
    ).toBe(4);
  });
});
