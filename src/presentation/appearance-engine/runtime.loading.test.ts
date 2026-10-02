import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineRecipe } from "./pack";
import type * as RuntimePack from "./pack";

// Controlled browser decoding/composition isolates cache behavior; no pixel proof.
vi.mock("../optional-glob", () => ({
  optionalGlob: () => new Proxy({}, { get: (_target, key) => String(key) }),
}));
vi.mock("./pack", async (importOriginal) => ({
  ...(await importOriginal<typeof RuntimePack>()),
  composeEnginePerson: () => ({
    raster: { width: 1, height: 1, data: new Uint8ClampedArray(4) },
    anchors: {
      top: 0,
      feet: 1,
      neck: { row: 0, centerX: 0, width: 1 },
      head: { left: 0, right: 0, top: 0, bottom: 0 },
      shoulderRow: 0,
    },
    pose: "standing" as const,
  }),
}));

let attempts: string[];
let failNext: boolean;
beforeEach(() => {
  vi.resetModules();
  attempts = [];
  failNext = false;
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      naturalWidth = 1;
      naturalHeight = 1;
      decode() {
        attempts.push(this.src);
        if (failNext) {
          failNext = false;
          return Promise.reject(new Error("Transient image load failure"));
        }
        return Promise.resolve();
      }
    },
  );
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 1,
      height: 1,
      getContext: () => ({
        drawImage() {},
        putImageData() {},
        getImageData: () => ({
          width: 1,
          height: 1,
          data: new Uint8ClampedArray(4),
        }),
      }),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob()),
    }),
  });
  vi.stubGlobal("ImageData", class {});
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:controlled-portrait");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function runtime() {
  const module = await import("./runtime");
  const presentation = module.PEOPLE_PACK.presentations.feminine;
  const recipe: EngineRecipe = {
    presentation: "feminine",
    build: "average",
    shade: 1,
    face: presentation.faces[0]!.id,
    hair: presentation.hair[0]!.id,
    hairColor: "natural",
    outfit: presentation.outfits[0]!.id,
  };
  return { ...module, recipe };
}

describe("portrait images recover from a transient decoded-file failure", () => {
  it("retries the same actual recipe after failure without redownloading successful files", async () => {
    const { enginePersonImage, recipe } = await runtime();
    failNext = true;
    await expect(enginePersonImage(recipe)).rejects.toThrow(
      "Transient image load failure",
    );
    const firstAttempts = [...attempts];
    await expect(enginePersonImage(recipe)).resolves.toMatchObject({
      url: "blob:controlled-portrait",
    });
    expect(attempts.length).toBe(firstAttempts.length + 1);
    expect(attempts.at(-1)).toBe(firstAttempts[0]);
  });
  it("shares pending and successful compositions for the same recipe", async () => {
    const { enginePersonImage, recipe } = await runtime();
    const first = enginePersonImage(recipe);
    const second = enginePersonImage({ ...recipe });
    expect(second).toBe(first);
    const image = await first;
    const count = attempts.length;
    expect(await enginePersonImage(recipe)).toBe(image);
    expect(attempts).toHaveLength(count);
  });
  it("allows another portrait consumer to recover the same failed shared recipe", async () => {
    const { enginePersonImage, recipe } = await runtime();
    failNext = true;
    const failed = enginePersonImage(recipe);
    expect(enginePersonImage({ ...recipe })).toBe(failed);
    await expect(failed).rejects.toThrow("Transient image load failure");
    await expect(enginePersonImage({ ...recipe })).resolves.toMatchObject({
      url: "blob:controlled-portrait",
    });
  });
});
