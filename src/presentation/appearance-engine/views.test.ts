import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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
// The locked PNG decoder has no bundled declaration, matching the typed
// createRequire boundary used by scripts/dev-lab/raster-decode.ts.
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: {
    sync: {
      read(bytes: Buffer): {
        width: number;
        height: number;
        data: Uint8Array;
      };
    };
  };
};

// Synthetic view metadata reuses front paintings to isolate availability and
// direction handling. It is not evidence of delivered side/back artwork.
function withView(
  pack: PackPresentation,
  view: TurnedBodyView,
  toward: "left" | "right",
): PackPresentation {
  const file = (name: string) => `${view}/${name}`;
  return {
    ...pack,
    views: {
      ...pack.views,
      [view]: {
        canonical: pack.canonical,
        bodies: Object.fromEntries(
          BODY_BUILDS.map((build) => [
            build,
            { ...pack.bodies[build], file: file(pack.bodies[build].file) },
          ]),
        ),
        faces: pack.faces.map((face) => ({ ...face, file: file(face.file) })),
        hair: pack.hair.map((hair) => ({
          ...hair,
          back: file(hair.back),
          front: file(hair.front),
        })),
        toward,
      },
    },
    outfits: pack.outfits.map((outfit) => ({
      ...outfit,
      views: {
        ...outfit.views,
        [view]: {
          builds: Object.fromEntries(
            Object.entries(outfit.builds).map(([build, layer]) => [
              build,
              {
                ...layer,
                file: file(layer.file),
                hides: file(layer.hides),
                ...(layer.regions
                  ? {
                      regions: Object.fromEntries(
                        Object.entries(layer.regions).map(([part, mask]) => [
                          part,
                          file(mask),
                        ]),
                      ),
                    }
                  : {}),
                ...(layer.skin ? { skin: file(layer.skin) } : {}),
              },
            ]),
          ),
        },
      },
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

const base: PackPresentation = {
  ...manifest.presentations.feminine,
  views: undefined,
  outfits: manifest.presentations.feminine.outfits.map((outfit) => ({
    ...outfit,
    views: undefined,
  })),
};

describe("side and back view availability", () => {
  it("carries the scene's view and facing through the person's normal recipe", () => {
    const person = {
      id: "person:art7-recipe",
      birthDate: "1990-04-01",
      appearance: {
        seed: "art7-recipe",
        recipeVersion: "appearance-recipe-v1",
      },
    } as unknown as Person;
    const unchanged = engineRecipeFor(person, "2026-10-07", manifest)!;
    const directed = engineRecipeFor(person, "2026-10-07", manifest, {
      view: "back",
      facing: "left",
    });
    expect(directed).toEqual({ ...unchanged, view: "back", facing: "left" });
  });

  for (const view of ["side", "back"] as const) {
    const quarter = withView(base, "three-quarter", "left");
    const native = withView(quarter, view, "right");
    const requested = { ...recipe(native), view };

    it(`uses a complete ${view} view for the requested body and outfit`, () => {
      for (const build of BODY_BUILDS) {
        const pieces = posedPieces(native, { ...requested, build });
        expect(pieces.view).toBe(view);
        expect(pieces.body.file).toBe(`${view}/${base.bodies[build].file}`);
        expect(pieces.outfit?.file).toBe(
          `${view}/${base.outfits[0]!.builds[build]!.file}`,
        );
        expect(pieces.face.file).toBe(`${view}/${base.faces[0]!.file}`);
        expect(pieces.hair.front).toBe(`${view}/${base.hair[0]!.front}`);
      }
    });

    it(`falls back as a whole clothed person when a ${view} layer is missing`, () => {
      const pieces = posedPieces(native, requested);
      const required = [
        pieces.body.file,
        pieces.outfit!.file,
        pieces.outfit!.hides,
        ...Object.values(pieces.outfit!.regions ?? {}),
        ...(pieces.outfit!.skin ? [pieces.outfit!.skin] : []),
        pieces.face.file,
        pieces.hair.front,
        pieces.hair.back,
      ];
      for (const missing of required) {
        const fallback = posedPieces(
          native,
          requested,
          (name) => name !== missing,
        );
        expect(fallback.view, missing).toBe("three-quarter");
        expect(fallback.outfit).toBeDefined();
        expect(fallback.body.file).toBe(
          `three-quarter/${base.bodies.average.file}`,
        );
      }
      const front = posedPieces(
        native,
        requested,
        (name) => !name.includes("/"),
      );
      expect(front.view).toBe("front");
      expect(front.outfit?.file).toBe(base.outfits[0]!.builds.average!.file);
    });

    it(`preserves sitting before using a standing ${view} painting`, () => {
      const pieces = posedPieces(native, { ...requested, pose: "seated" });
      expect([pieces.pose, pieces.view, pieces.seated]).toEqual([
        "seated",
        "front",
        true,
      ]);
      expect(pieces.outfit).toBeDefined();
    });

    it(`applies facing to the resolved ${view} or fallback painting`, () => {
      const directed = { ...requested, facing: "right" as const };
      expect(posedPieces(native, directed).mirrored).toBe(false);
      const fallback = posedPieces(quarter, directed);
      expect([fallback.view, fallback.toward, fallback.mirrored]).toEqual([
        "three-quarter",
        "right",
        true,
      ]);
      const front = posedPieces(base, directed);
      expect([front.view, front.toward, front.mirrored]).toEqual([
        "front",
        null,
        false,
      ]);
      expect(mirrorToFace(quarter, directed, 20, 80)).toBe(true);
      expect(mirrorToFace(quarter, directed, 80, 20)).toBe(false);
    });
  }

  it("keeps old recipe keys and separates requested views and directions", () => {
    const original = recipe(base);
    expect(engineRecipeKey({ ...original, view: "front" })).toBe(
      engineRecipeKey(original),
    );
    const keys = ["side", "back"].flatMap((view) =>
      ["left", "right"].map((facing) =>
        engineRecipeKey({
          ...original,
          view: view as "side" | "back",
          facing: facing as "left" | "right",
        }),
      ),
    );
    expect(new Set(keys).size).toBe(4);
  });

  it("mirrors the raster and measured anchors at draw time for explicit facing", () => {
    const pack = withView(base, "side", "left");
    const fixture = {
      ...manifest,
      presentations: { ...manifest.presentations, feminine: pack },
    };
    const read = (name: string): Raster => {
      const png = PNG.sync.read(
        readFileSync(`art/people-engine/v1/${name.replace(/^side\//, "")}`),
      );
      return {
        width: png.width,
        height: png.height,
        data: new Uint8ClampedArray(png.data),
      };
    };
    const requested = { ...recipe(pack), view: "side" as const };
    const left = composeEnginePerson(fixture, read, {
      ...requested,
      facing: "left",
    });
    const right = composeEnginePerson(fixture, read, {
      ...requested,
      facing: "right",
    });
    expect([left.view, right.view]).toEqual(["side", "side"]);
    const { width, height } = left.raster;
    for (let y = 0; y < height; y += 7)
      for (let x = 0; x < width; x += 5) {
        const a = (y * width + x) * 4;
        const b = (y * width + width - 1 - x) * 4;
        expect(Array.from(right.raster.data.subarray(b, b + 4))).toEqual(
          Array.from(left.raster.data.subarray(a, a + 4)),
        );
      }
    expect(right.anchors.neck.centerX).toBe(
      width - 1 - left.anchors.neck.centerX,
    );
    expect(right.anchors.feet).toBe(left.anchors.feet);
  });
});
