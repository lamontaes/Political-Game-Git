import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: {
    new (options: { width: number; height: number }): {
      width: number;
      height: number;
      data: Buffer;
    };
    sync: {
      write(image: { width: number; height: number; data: Buffer }): Buffer;
    };
  };
};
import {
  applyPinnedRegionOwnership,
  loadPinnedRegionOwnership,
  ownershipHash,
  ownershipRgbaHash,
  type OwnershipInputs,
  type OwnershipRaster,
} from "./garment-region-ownership";
const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0))
    rmSync(folder, { recursive: true, force: true });
});
const raster = (alpha = 0): OwnershipRaster => {
  const data = new Uint8ClampedArray(4 * 3 * 4);
  for (let p = 0; p < 12; p++) {
    data[p * 4] = 30;
    data[p * 4 + 1] = 60;
    data[p * 4 + 2] = 90;
    data[p * 4 + 3] = alpha;
  }
  return { width: 4, height: 3, data };
};
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "owned-region-test-"));
  folders.push(root);
  const source = raster(255),
    bottom = raster(),
    skin = raster(),
    top = raster(),
    result = raster();
  result.data[4 * 5 + 3] = 255;
  const pin = (name: string, image: OwnershipRaster) => {
    const png = new PNG({ width: image.width, height: image.height });
    png.data = Buffer.from(image.data);
    const bytes = PNG.sync.write(png);
    const path = join(root, name);
    writeFileSync(path, bytes);
    return {
      path: name,
      sha256: ownershipHash(bytes),
      rgbaSha256: ownershipRgbaHash(image),
    };
  };
  const context = {
    stem: "outfit-feminine-hoodie-jeans-lean",
    presentation: "feminine" as const,
    build: "lean" as const,
    outfit: "hoodie-jeans",
    pose: "standing",
    view: "front",
  };
  const entry = {
    context: { ...context },
    canvas: [4, 3],
    source: pin("source.png", source),
    originalMask: pin("old.png", bottom),
    resultMask: pin("result.png", result),
    skin: pin("skin.png", skin),
    otherMaterials: { top: pin("top.png", top) },
    additions: [[1, 1, 1]],
    held: [[2, 1]],
  };
  const packet = { schema: "garment-region-ownership-v1", entries: [entry] };
  const file = join(root, "packet.json");
  const save = () => writeFileSync(file, JSON.stringify(packet));
  save();
  const inputs: OwnershipInputs = {
    context,
    source,
    regions: { bottom, top },
    skin,
  };
  const load = () => {
    save();
    return loadPinnedRegionOwnership(file);
  };
  return { root, entry, packet, file, inputs, load, save, result, pin };
}
describe("pinned offline garment ownership", () => {
  it("absent descriptor is byte and object identity", () => {
    const f = fixture();
    expect(loadPinnedRegionOwnership()).toBeUndefined();
    expect(applyPinnedRegionOwnership(undefined, f.inputs).regions).toBe(
      f.inputs.regions,
    );
  });
  it("applies only one explicit alpha addition and reuses exact pinned PNG", () => {
    const f = fixture();
    const before = new Uint8ClampedArray(f.inputs.regions.bottom!.data);
    const value = applyPinnedRegionOwnership(f.load(), f.inputs);
    expect(value.regions.bottom!.data).toEqual(f.result.data);
    expect(value.encodedBottom).toEqual(
      readFileSync(join(f.root, f.entry.resultMask.path)),
    );
    expect(f.inputs.regions.bottom!.data).toEqual(before);
    expect(value.regions.top).toBe(f.inputs.regions.top);
    for (let i = 0; i < before.length; i++)
      if (i !== 23) expect(value.regions.bottom!.data[i]).toBe(before[i]);
  });
  it.each(["source", "originalMask", "resultMask", "skin"] as const)(
    "refuses mismatched %s PNG pin",
    (field) => {
      const f = fixture();
      f.entry[field].sha256 = "0".repeat(64);
      expect(f.load).toThrow("PNG hash mismatch");
    },
  );
  it("refuses mismatched decoded source pins", () => {
    const f = fixture();
    f.entry.source.rgbaSha256 = "0".repeat(64);
    expect(f.load).toThrow("RGBA hash mismatch");
  });
  it("refuses mutated prepared source", () => {
    const f = fixture();
    const loaded = f.load();
    f.inputs.source.data[0] = 99;
    expect(() => applyPinnedRegionOwnership(loaded, f.inputs)).toThrow(
      "source RGBA hash mismatch",
    );
  });
  it("refuses a different original classified mask", () => {
    const f = fixture();
    const loaded = f.load();
    f.inputs.regions.bottom!.data[3] = 255;
    expect(() => applyPinnedRegionOwnership(loaded, f.inputs)).toThrow(
      "original bottom mask RGBA hash mismatch",
    );
  });
  it("refuses a result that does not match the declared runs", () => {
    const f = fixture();
    f.entry.additions = [];
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "result mask hash mismatch",
    );
  });
  it.each(["build", "outfit", "pose", "view", "presentation"] as const)(
    "refuses wrong %s for a declared stem",
    (field) => {
      const f = fixture();
      const inputs = {
        ...f.inputs,
        context: { ...f.inputs.context, [field]: "different" },
      } as OwnershipInputs;
      expect(() => applyPinnedRegionOwnership(f.load(), inputs)).toThrow(
        `context mismatch: ${field}`,
      );
    },
  );
  it("does not propagate to another pose, view or build stem", () => {
    const f = fixture();
    const loaded = f.load();
    for (const stem of [
      "outfit-feminine-hoodie-jeans-fuller",
      `${f.inputs.context.stem}-seated`,
      `${f.inputs.context.stem}-three-quarter`,
    ])
      expect(
        applyPinnedRegionOwnership(loaded, {
          ...f.inputs,
          context: { ...f.inputs.context, stem },
        }).regions,
      ).toBe(f.inputs.regions);
  });
  it("refuses canvas mismatch", () => {
    const f = fixture();
    f.entry.canvas = [8, 3];
    expect(f.load).toThrow("canvas mismatch");
  });
  it("refuses held-pixel overlap", () => {
    const f = fixture();
    f.entry.held = [[1, 1]];
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "held-pixel overlap",
    );
  });
  it("refuses insufficient coverage without inferring from hue", () => {
    const f = fixture();
    f.inputs.source.data[23] = 128;
    f.entry.source = f.pin("source-low.png", f.inputs.source);
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "insufficient source coverage",
    );
  });
  it("refuses already claimed bottom ownership", () => {
    const f = fixture();
    f.inputs.regions.bottom!.data[23] = 1;
    f.entry.originalMask = f.pin("claimed.png", f.inputs.regions.bottom!);
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "previously claimed",
    );
  });
  it("refuses skin overlap", () => {
    const f = fixture();
    f.inputs.skin!.data[23] = 1;
    f.entry.skin = f.pin("skin-overlap.png", f.inputs.skin!);
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "skin overlap",
    );
  });
  it("refuses other material overlap", () => {
    const f = fixture();
    f.inputs.regions.top!.data[23] = 1;
    f.entry.otherMaterials.top = f.pin("overlap.png", f.inputs.regions.top!);
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "other-material overlap",
    );
  });
  it("refuses an undeclared other material", () => {
    const f = fixture();
    expect(() =>
      applyPinnedRegionOwnership(f.load(), {
        ...f.inputs,
        regions: { ...f.inputs.regions, shoe: raster() },
      }),
    ).toThrow("other-material set mismatch");
  });
  it("refuses missing pinned skin", () => {
    const f = fixture();
    expect(() =>
      applyPinnedRegionOwnership(f.load(), { ...f.inputs, skin: null }),
    ).toThrow("missing skin");
  });
  it.each([
    { label: "y", additions: [[3, 0, 0]] },
    { label: "reversed", additions: [[1, 3, 2]] },
    { label: "x", additions: [[1, 4, 4]] },
  ])("refuses out of bounds runs $label", ({ additions }) => {
    const f = fixture();
    f.entry.additions = additions;
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "out of bounds",
    );
  });
  it("refuses overlapping or duplicate runs", () => {
    const f = fixture();
    f.entry.additions.push([1, 1, 1]);
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "duplicate addition",
    );
  });
  it("refuses a pinned result carrying edits outside the declared addition", () => {
    const f = fixture();
    f.result.data[0] = 100;
    f.entry.resultMask = f.pin("extra-edit.png", f.result);
    expect(() => applyPinnedRegionOwnership(f.load(), f.inputs)).toThrow(
      "result mask hash mismatch",
    );
  });
  it("refuses absolute image references in portable packets", () => {
    const f = fixture();
    f.entry.source.path = join(f.root, f.entry.source.path);
    expect(f.load).toThrow("root-relative");
  });
  it("refuses an unsupplied named input root", () => {
    const f = fixture();
    Object.assign(f.entry.source, { root: "source" });
    expect(f.load).toThrow("missing input root");
  });
  it("refuses duplicate descriptor contexts", () => {
    const f = fixture();
    f.packet.entries.push(f.entry);
    expect(f.load).toThrow("duplicate context");
  });
  it("refuses malformed explicit descriptor", () => {
    const f = fixture();
    writeFileSync(f.file, JSON.stringify({ schema: "other" }));
    expect(() => loadPinnedRegionOwnership(f.file)).toThrow("schema");
  });
});
