import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type * as Assemble from "./assemble";
import { hairWithFaceWindow } from "./hair-face-window";
import {
  composeEnginePerson,
  posedPieces,
  type PeoplePackManifest,
} from "./pack";
import type { Raster } from "./raster";

// The source bank uses pngjs; its transitive package ships no TS declarations.
const PNG = createRequire(import.meta.url)("pngjs").PNG as {
  readonly sync: {
    read(bytes: Buffer): {
      readonly width: number;
      readonly height: number;
      readonly data: Buffer;
    };
  };
};

const captured = vi.hoisted(() => ({ front: undefined as Raster | undefined }));
vi.mock("./assemble", async (importOriginal) => {
  const original = await importOriginal<typeof Assemble>();
  return {
    ...original,
    assemblePerson(...args: Parameters<typeof Assemble.assemblePerson>) {
      captured.front = args[1].find(
        (layer) => layer.slot === "front-hair",
      )?.raster;
      return original.assemblePerson(...args);
    },
  };
});

const root = process.env.PEOPLE_PACK_ROOT ?? "art/people-engine/v1";
const manifest = JSON.parse(
  readFileSync(join(root, "manifest.json"), "utf8"),
) as PeoplePackManifest;
const cache = new Map<string, Raster>();
function image(file: string): Raster {
  const cached = cache.get(file);
  if (cached) return cached;
  const png = PNG.sync.read(readFileSync(join(root, file)));
  expect([png.width, png.height], file).toEqual([
    manifest.canvas.width,
    manifest.canvas.height,
  ]);
  const raster = {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
  cache.set(file, raster);
  return raster;
}

// Native cheek-side bands measured on these immutable reference faces, not
// inferred from whichever mask the implementation happens to produce.
const faceBands = {
  feminine: {
    file: "face-feminine-20s30s-01.png",
    hash: "d5fb4facd7932d733860640b7da9c06b80ab0873ffb83207e1ef1e26bb87b7e8",
    firstRow: 111,
    lastRow: 154,
  },
  masculine: {
    file: "face-masculine-20s30s-01.png",
    hash: "17301bdd9731af66669b5f9fceb4d344dea641e677fef4061e36ca42172c4f31",
    firstRow: 117,
    lastRow: 166,
  },
} as const;

function sideMask(face: Raster, firstRow: number, lastRow: number): Uint8Array {
  const mask = new Uint8Array(face.width * face.height);
  for (let y = firstRow; y <= lastRow; y += 1) {
    const opaque: number[] = [];
    for (let x = 0; x < face.width; x += 1)
      if (face.data[(y * face.width + x) * 4 + 3]! >= 250) opaque.push(x);
    if (opaque.length === 0) continue;
    const left = opaque[0]!;
    const right = opaque.at(-1)!;
    const quarter = Math.floor((right - left + 1) / 4);
    for (const x of opaque)
      if (x < left + quarter || x > right - quarter)
        mask[y * face.width + x] = 1;
  }
  return mask;
}

function overlap(hair: Raster, mask: Uint8Array): number {
  let count = 0;
  for (let p = 0; p < mask.length; p += 1)
    if (mask[p] && hair.data[p * 4 + 3]! >= 250) count += 1;
  return count;
}

describe("front hair leaves the face sides visible", () => {
  const missingTurned = (["feminine", "masculine"] as const).filter(
    (presentation) =>
      !manifest.presentations[presentation].views?.["three-quarter"]?.hair
        .length,
  );
  if (missingTurned.length > 0)
    it("records the input gap when turned hair arrays are empty", () => {
      const message = `Input gap: no three-quarter hair for ${missingTurned.join(", ")}; turned pixel checks require supplied native layers.`;
      process.stdout.write(`${message}\n`);
      for (const presentation of missingTurned)
        expect(
          manifest.presentations[presentation].views?.["three-quarter"]?.hair ??
            [],
          message,
        ).toEqual([]);
    });
  for (const presentation of ["feminine", "masculine"] as const)
    for (const pose of ["standing", "seated"] as const) {
      const pack = manifest.presentations[presentation];
      for (const hair of pack.hair)
        it(`${presentation} average front ${pose} ${hair.id}`, () => {
          const band = faceBands[presentation];
          expect(
            createHash("sha256")
              .update(readFileSync(join(root, band.file)))
              .digest("hex"),
          ).toBe(band.hash);
          const face = image(band.file);
          const front = image(hair.front);
          const immutable = new Uint8ClampedArray(front.data);
          const mask = sideMask(face, band.firstRow, band.lastRow);
          expect(mask.some((pixel) => pixel === 1)).toBe(true);
          const beforeLayer = hairWithFaceWindow(
            front,
            face,
            hair.front,
            hair.faceWindow,
          );
          const before = overlap(beforeLayer, mask);
          const result = composeEnginePerson(manifest, image, {
            presentation,
            pose,
            view: "front",
            build: "average",
            shade: 4,
            face: "20s30s-01",
            hair: hair.id,
            hairColor: "natural",
            outfit: "casual",
          });
          expect({ pose: result.pose, view: result.view }).toEqual({
            pose,
            view: "front",
          });
          const afterLayer = captured.front!;
          const after = overlap(afterLayer, mask);
          process.stdout.write(
            `face-side ${presentation}/average/front/${pose}/${hair.id}: before=${before} after=${after} bound=0\n`,
          );
          expect(after).toBe(0);
          expect(
            Buffer.compare(Buffer.from(front.data), Buffer.from(immutable)),
          ).toBe(0);
          // Bangs above the measured cheek band remain exactly as authored
          // after any existing source-bound window; RGB never changes.
          for (let p = 0; p < face.width * face.height; p += 1) {
            const at = p * 4;
            for (let c = 0; c < 3; c += 1)
              if (afterLayer.data[at + c] !== beforeLayer.data[at + c])
                throw new Error(`Hair RGB changed at pixel ${p}`);
          }
          expect(
            Buffer.compare(
              Buffer.from(
                afterLayer.data.subarray(0, band.firstRow * face.width * 4),
              ),
              Buffer.from(
                beforeLayer.data.subarray(0, band.firstRow * face.width * 4),
              ),
            ),
          ).toBe(0);
        });

      if (pack.views?.["three-quarter"]?.hair.length)
        it(`${presentation} average three-quarter ${pose} has its required layers`, () => {
          const turned = pack.views?.["three-quarter"];
          expect(
            turned?.hair.length,
            "Missing three-quarter front-hair layers",
          ).toBeGreaterThan(0);
          for (const hair of turned!.hair) {
            const pieces = posedPieces(pack, {
              presentation,
              pose,
              view: "three-quarter",
              build: "average",
              shade: 4,
              face: "20s30s-01",
              hair: hair.id,
              hairColor: "natural",
              outfit: "casual",
            });
            expect({ pose: pieces.pose, view: pieces.view }).toEqual({
              pose,
              view: "three-quarter",
            });
            const face = image(pieces.face.file);
            let widestRow = 0;
            let widest = 0;
            for (let y = 0; y < face.height; y += 1) {
              let width = 0;
              for (let x = 0; x < face.width; x += 1)
                if (face.data[(y * face.width + x) * 4 + 3]! >= 250) width += 1;
              if (width > widest) {
                widest = width;
                widestRow = y;
              }
            }
            const mask = sideMask(face, widestRow, face.height - 1);
            expect(mask.some((pixel) => pixel === 1)).toBe(true);
            const original = image(pieces.hair.front);
            const immutable = new Uint8ClampedArray(original.data);
            const before = overlap(
              hairWithFaceWindow(
                original,
                face,
                pieces.hair.front,
                pieces.hair.faceWindow,
              ),
              mask,
            );
            const result = composeEnginePerson(manifest, image, {
              presentation,
              pose,
              view: "three-quarter",
              build: "average",
              shade: 4,
              face: pieces.face.id,
              hair: hair.id,
              hairColor: "natural",
              outfit: "casual",
            });
            expect({ pose: result.pose, view: result.view }).toEqual({
              pose,
              view: "three-quarter",
            });
            const after = overlap(captured.front!, mask);
            process.stdout.write(
              `face-side ${presentation}/average/three-quarter/${pose}/${hair.id}: before=${before} after=${after} bound=0\n`,
            );
            expect(after).toBe(0);
            expect(
              Buffer.compare(
                Buffer.from(original.data),
                Buffer.from(immutable),
              ),
            ).toBe(0);
          }
        });
    }
});
