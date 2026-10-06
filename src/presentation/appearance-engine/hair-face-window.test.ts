import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import rules from "../../../art/manifest/hair_face_windows.json" with { type: "json" };
import {
  hairFaceWindowErrors,
  hairWithFaceWindow,
  type HairFaceWindow,
} from "./hair-face-window";
import {
  composeEnginePerson,
  posedPieces,
  type PeoplePackManifest,
} from "./pack";
import { createRaster, type Raster } from "./raster";

const manifest = manifestJson as unknown as PeoplePackManifest;
const file = "hair-feminine-afro-front.png";
const window = rules.styles[file] as HairFaceWindow;
const cache = new Map<string, Raster>();
function read(name: string): Raster {
  let raster = cache.get(name);
  if (!raster) {
    const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${name}`));
    raster = {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    };
    cache.set(name, raster);
  }
  return raster;
}

describe("source-bound front hair face window", () => {
  it("binds only the measured existing front style and keeps immutable bytes", () => {
    expect(hairFaceWindowErrors(window)).toEqual([]);
    expect(
      createHash("sha256")
        .update(readFileSync(`art/people-engine/v1/${file}`))
        .digest("hex"),
    ).toBe(window.sourceSha256);
    const tagged = Object.values(manifest.presentations)
      .flatMap((p) => p.hair)
      .filter((h) => h.faceWindow);
    expect(tagged.map((h) => h.front)).toEqual([file]);
    expect(tagged[0]!.faceWindow).toEqual(window);
    expect(
      manifest.presentations.feminine.views?.["three-quarter"]?.hair.some(
        (h) => h.faceWindow,
      ),
    ).toBeFalsy();
  });

  it("protects scalp, bangs and outer hair across every registered feminine face/expression", () => {
    const hair = read(file);
    const original = new Uint8ClampedArray(hair.data);
    const faces = manifest.presentations.feminine.faces.flatMap((face) => [
      face.file,
      ...Object.values(face.expressions ?? {}).map((e) => e.file),
    ]);
    expect(faces.length).toBeGreaterThan(100);
    for (const name of faces) {
      const face = read(name);
      const faceBefore = new Uint8ClampedArray(face.data);
      const out = hairWithFaceWindow(hair, face, file, window);
      let removed = 0;
      for (let at = 0; at < hair.data.length; at += 4) {
        const y = Math.floor(at / 4 / hair.width);
        const before = hair.data[at + 3]!;
        const after = out.data[at + 3]!;
        if (after > before) throw new Error(`Alpha increased: ${name}`);
        if (after !== before) {
          removed += 1;
          if (
            y < window.fromRow ||
            y > window.throughRow ||
            face.data[at + 3] === 0
          )
            throw new Error(
              `Hair changed outside the authored face support: ${name}`,
            );
        }
        // The rendering derivative never invents color or changes hair outside support.
        if (
          out.data[at] !== hair.data[at] ||
          out.data[at + 1] !== hair.data[at + 1] ||
          out.data[at + 2] !== hair.data[at + 2]
        )
          throw new Error(`RGB changed: ${name}`);
      }
      expect(removed).toBeGreaterThan(0);
      expect(
        Buffer.compare(Buffer.from(face.data), Buffer.from(faceBefore)),
      ).toBe(0);
    }
    expect(hair.data).toEqual(original);
  });

  it("keeps bald/transparent support and other styles unchanged, and refuses wrong geometry", () => {
    const hair = read(file);
    const face = read("face-feminine-20s30s-01.png");
    expect(hairWithFaceWindow(hair, face, file)).toBe(hair);
    expect(
      hairWithFaceWindow(
        hair,
        createRaster(hair.width, hair.height),
        file,
        window,
      ),
    ).toBe(hair);
    expect(
      hairWithFaceWindow(hair, face, "hair-feminine-pixie-front.png", window),
    ).toBe(hair);
    expect(
      hairWithFaceWindow(hair, face, file, { ...window, fromRow: -1 }),
    ).toBe(hair);
    expect(hairWithFaceWindow(hair, createRaster(2, 2), file, window)).toBe(
      hair,
    );
    expect(hairFaceWindowErrors({ ...window, insetPixels: 10 })).toContain(
      "edge bounds",
    );
  });

  it("changes the actual assembler route without changing pose/view fallback or source layers", () => {
    const recipe = {
      presentation: "feminine" as const,
      build: "average" as const,
      shade: 3,
      face: "20s30s-01",
      hair: "afro",
      hairColor: "natural",
      outfit: "casual",
    };
    const baseline: PeoplePackManifest = {
      ...manifest,
      presentations: {
        ...manifest.presentations,
        feminine: {
          ...manifest.presentations.feminine,
          hair: manifest.presentations.feminine.hair.map((h) => ({
            id: h.id,
            back: h.back,
            front: h.front,
          })),
        },
      },
    };
    const before = composeEnginePerson(baseline, read, recipe);
    const after = composeEnginePerson(manifest, read, recipe);
    // Diagnostic front-hair-free control preserves back hair. The source faces
    // are translucent, so removing back hair too changes the composited face.
    const style = manifest.presentations.feminine.hair.find(
      (h) => h.id === "afro",
    )!;
    const frontFree = composeEnginePerson(
      baseline,
      (name) =>
        name === style.front
          ? createRaster(manifest.canvas.width, manifest.canvas.height)
          : read(name),
      recipe,
    );
    const masked = hairWithFaceWindow(
      read(file),
      read("face-feminine-20s30s-01.png"),
      file,
      window,
    );
    let restored = 0;
    for (let at = 0; at < masked.data.length; at += 4) {
      if (read(file).data[at + 3] === 0 || masked.data[at + 3] !== 0) continue;
      for (let c = 0; c < 4; c += 1) {
        if (after.raster.data[at + c] !== frontFree.raster.data[at + c])
          throw new Error(
            "Cleared face pixel differs from the front-hair-free control",
          );
      }
      restored += 1;
    }
    expect(restored).toBeGreaterThan(0);
    expect(after.anchors).toEqual(before.anchors);
    expect(after.pose).toBe(before.pose);
    expect(after.view).toBe(before.view);
    expect(after.raster.data).not.toEqual(before.raster.data);
    const turned = { ...recipe, view: "three-quarter" as const };
    expect(posedPieces(manifest.presentations.feminine, turned).view).toBe(
      posedPieces(baseline.presentations.feminine, turned).view,
    );
    const pixie = { ...recipe, hair: "pixie" };
    expect(composeEnginePerson(manifest, read, pixie).raster.data).toEqual(
      composeEnginePerson(baseline, read, pixie).raster.data,
    );
  });

  it("keeps the complete facial-feature window visible for every front hair style", () => {
    const checkedStyles: string[] = [];
    for (const presentation of ["feminine", "masculine"] as const) {
      const pack = manifest.presentations[presentation];
      const face = pack.faces.find((candidate) =>
        candidate.id.startsWith("20s30s-"),
      )!;
      for (const hair of pack.hair) {
        const recipe = {
          presentation,
          build: "average" as const,
          shade: 3,
          face: face.id,
          hair: hair.id,
          hairColor: "natural",
          outfit: "casual",
        };
        const composed = composeEnginePerson(manifest, read, recipe).raster;
        const withoutFrontHair = composeEnginePerson(
          manifest,
          (name) =>
            name === hair.front
              ? createRaster(manifest.canvas.width, manifest.canvas.height)
              : read(name),
          recipe,
        ).raster;

        // This source-authored window spans both eyes, the nose and the mouth.
        // Side locks and bangs may frame it, but no front-hair pixels may cover it.
        for (let y = 112; y <= 155; y += 1) {
          for (let x = 248; x <= 264; x += 1) {
            const at = (y * composed.width + x) * 4;
            expect(
              composed.data.slice(at, at + 4),
              `${presentation}/${hair.id} covers the face at ${x},${y}`,
            ).toEqual(withoutFrontHair.data.slice(at, at + 4));
          }
        }
        checkedStyles.push(`${presentation}/${hair.id}`);
      }
    }

    expect(checkedStyles).toHaveLength(26);
    expect(new Set(checkedStyles).size).toBe(checkedStyles.length);
  });
});
