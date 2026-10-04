/** Offline, hash-bound additions to an already classified garment mask. */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: {
    sync: {
      read(bytes: Buffer): { width: number; height: number; data: Buffer };
    };
  };
};

export interface OwnershipRaster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}
export interface OwnershipContext {
  readonly stem: string;
  readonly presentation: "feminine" | "masculine";
  readonly build: "lean" | "average" | "fuller";
  readonly outfit: string;
  readonly pose: string;
  readonly view: string;
}
interface ImagePin {
  readonly root?: string;
  readonly path: string;
  readonly sha256: string;
  readonly rgbaSha256: string;
}
export interface OwnershipEntry {
  readonly context: OwnershipContext;
  readonly canvas: readonly [number, number];
  readonly source: ImagePin;
  readonly originalMask: ImagePin;
  readonly resultMask: ImagePin;
  readonly skin: ImagePin | null;
  readonly otherMaterials: Readonly<Record<string, ImagePin>>;
  readonly additions: readonly (readonly [number, number, number])[];
  readonly held: readonly (readonly [number, number])[];
}
interface LoadedEntry {
  readonly entry: OwnershipEntry;
  readonly resultBytes: Buffer;
  readonly result: OwnershipRaster;
}
export interface PinnedRegionOwnership {
  readonly entries: ReadonlyMap<string, LoadedEntry>;
}
export interface OwnershipInputs {
  readonly context: OwnershipContext;
  readonly source: OwnershipRaster;
  readonly regions: Readonly<Record<string, OwnershipRaster>>;
  readonly skin: OwnershipRaster | null;
}
export interface AppliedRegionOwnership {
  readonly regions: Readonly<Record<string, OwnershipRaster>>;
  /** Reuse exact pinned PNG bytes, avoiding an encoder-dependent hash change. */
  readonly encodedBottom?: Buffer;
}
const refuse = (reason: string): never => {
  throw new Error(`Garment ownership override refused: ${reason}`);
};
export const ownershipHash = (bytes: Uint8Array | Uint8ClampedArray): string =>
  createHash("sha256")
    .update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
    .digest("hex");
export const ownershipRgbaHash = (raster: OwnershipRaster): string =>
  ownershipHash(raster.data);
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return refuse("expected an object");
  return value as Record<string, unknown>;
};
const text = (value: unknown): string => {
  if (typeof value !== "string" || value.length === 0)
    return refuse("expected a nonempty string");
  return value;
};
const hash = (value: unknown): string => {
  const result = text(value);
  if (!/^[a-f0-9]{64}$/.test(result)) refuse("invalid SHA-256");
  return result;
};
const integer = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    return refuse("invalid coordinate or dimension");
  return value;
};
function pin(value: unknown): ImagePin {
  const r = record(value);
  return {
    ...(r.root === undefined ? {} : { root: text(r.root) }),
    path: text(r.path),
    sha256: hash(r.sha256),
    rgbaSha256: hash(r.rgbaSha256),
  };
}
function tuple(value: unknown, length: number): number[] {
  if (!Array.isArray(value) || value.length !== length) refuse("invalid tuple");
  return (value as unknown[]).map(integer);
}
function parseEntry(value: unknown): OwnershipEntry {
  const r = record(value);
  const c = record(r.context);
  const presentation = text(c.presentation);
  const build = text(c.build);
  if (presentation !== "feminine" && presentation !== "masculine")
    return refuse("unknown presentation");
  if (build !== "lean" && build !== "average" && build !== "fuller")
    return refuse("unknown body build");
  const canvas = tuple(r.canvas, 2) as [number, number];
  if (canvas.some((n) => n === 0)) refuse("empty canvas");
  if (!Array.isArray(r.additions) || !Array.isArray(r.held))
    return refuse("missing additions or held coordinates");
  const otherMaterials = Object.fromEntries(
    Object.entries(record(r.otherMaterials)).map(([part, value]) => {
      if (part === "bottom") refuse("bottom listed as another material");
      return [part, pin(value)];
    }),
  );
  return {
    context: {
      stem: text(c.stem),
      presentation,
      build,
      outfit: text(c.outfit),
      pose: text(c.pose),
      view: text(c.view),
    },
    canvas,
    source: pin(r.source),
    originalMask: pin(r.originalMask),
    resultMask: pin(r.resultMask),
    skin: r.skin === null ? null : pin(r.skin),
    otherMaterials,
    additions: r.additions.map((v) => tuple(v, 3) as [number, number, number]),
    held: r.held.map((v) => tuple(v, 2) as [number, number]),
  };
}
function verifyCanvas(
  raster: OwnershipRaster,
  canvas: readonly [number, number],
): void {
  if (
    raster.width !== canvas[0] ||
    raster.height !== canvas[1] ||
    raster.data.length !== canvas[0] * canvas[1] * 4
  )
    refuse("canvas mismatch");
}
function readPinnedImage(
  roots: Readonly<Record<string, string>>,
  ref: ImagePin,
  canvas: readonly [number, number],
): { raster: OwnershipRaster; bytes: Buffer } {
  const root = roots[ref.root ?? "descriptor"];
  if (!root) return refuse(`missing input root: ${ref.root}`);
  if (isAbsolute(ref.path)) refuse("image references must be root-relative");
  const resolvedRoot = realpathSync(root);
  const path = realpathSync(resolve(root, ref.path));
  const rel = relative(resolvedRoot, path);
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel))
    refuse("image reference escapes input root");
  const bytes = readFileSync(path);
  if (ownershipHash(bytes) !== ref.sha256)
    refuse(`PNG hash mismatch: ${ref.path}`);
  const png = PNG.sync.read(bytes);
  const raster = {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
  verifyCanvas(raster, canvas);
  if (ownershipRgbaHash(raster) !== ref.rgbaSha256)
    refuse(`RGBA hash mismatch: ${ref.path}`);
  return { raster, bytes };
}
/** An absent packet is identity; an explicitly declared invalid packet fails. */
export function loadPinnedRegionOwnership(
  file?: string,
  inputRoots: Readonly<Record<string, string>> = {},
): PinnedRegionOwnership | undefined {
  if (file === undefined) return undefined;
  const packet = record(JSON.parse(readFileSync(file, "utf8")));
  if (
    packet.schema !== "garment-region-ownership-v1" ||
    !Array.isArray(packet.entries)
  )
    return refuse("unsupported or missing packet schema");
  const entries = new Map<string, LoadedEntry>();
  for (const value of packet.entries) {
    const entry = parseEntry(value);
    if (entries.has(entry.context.stem)) refuse("duplicate context stem");
    const roots = { ...inputRoots, descriptor: dirname(resolve(file)) };
    readPinnedImage(roots, entry.source, entry.canvas);
    readPinnedImage(roots, entry.originalMask, entry.canvas);
    const result = readPinnedImage(roots, entry.resultMask, entry.canvas);
    if (entry.skin) readPinnedImage(roots, entry.skin, entry.canvas);
    for (const ref of Object.values(entry.otherMaterials))
      readPinnedImage(roots, ref, entry.canvas);
    entries.set(entry.context.stem, {
      entry,
      result: result.raster,
      resultBytes: result.bytes,
    });
  }
  return { entries };
}
export function verifyPreparedRegionInputs(
  entry: OwnershipEntry,
  inputs: OwnershipInputs,
): void {
  for (const field of [
    "stem",
    "presentation",
    "build",
    "outfit",
    "pose",
    "view",
  ] as const)
    if (entry.context[field] !== inputs.context[field])
      refuse(`context mismatch: ${field}`);
  const verify = (
    raster: OwnershipRaster | null | undefined,
    ref: ImagePin,
    label: string,
  ) => {
    if (!raster) return refuse(`missing ${label}`);
    verifyCanvas(raster, entry.canvas);
    if (ownershipRgbaHash(raster) !== ref.rgbaSha256)
      refuse(`${label} RGBA hash mismatch`);
  };
  verify(inputs.source, entry.source, "source");
  verify(inputs.regions.bottom, entry.originalMask, "original bottom mask");
  if (entry.skin) verify(inputs.skin, entry.skin, "skin mask");
  else if (inputs.skin) refuse("unexpected skin mask");
  const actual = Object.keys(inputs.regions)
    .filter((part) => part !== "bottom")
    .sort();
  const expected = Object.keys(entry.otherMaterials).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    refuse("other-material set mismatch");
  for (const [part, ref] of Object.entries(entry.otherMaterials))
    verify(inputs.regions[part], ref, part);
}
/** Apply only explicit reviewed runs. Never infer material ownership from color. */
export function applyPinnedRegionOwnership(
  packet: PinnedRegionOwnership | undefined,
  inputs: OwnershipInputs,
): AppliedRegionOwnership {
  const loaded = packet?.entries.get(inputs.context.stem);
  if (!loaded) return { regions: inputs.regions };
  const { entry } = loaded;
  verifyPreparedRegionInputs(entry, inputs);
  const original = inputs.regions.bottom!;
  const data = new Uint8ClampedArray(original.data);
  const width = entry.canvas[0],
    height = entry.canvas[1];
  const held = new Set<number>();
  for (const [x, y] of entry.held) {
    if (x >= width || y >= height) refuse("held coordinate out of bounds");
    const p = y * width + x;
    if (held.has(p)) refuse("duplicate held coordinate");
    held.add(p);
  }
  const added = new Set<number>();
  for (const [y, first, last] of entry.additions) {
    if (y >= height || first > last || last >= width)
      refuse("addition run out of bounds");
    for (let x = first; x <= last; x++) {
      const p = y * width + x,
        alpha = p * 4 + 3;
      if (added.has(p)) refuse("duplicate addition");
      if (held.has(p)) refuse("held-pixel overlap");
      if (data[alpha] !== 0) refuse("previously claimed bottom ownership");
      if (inputs.source.data[alpha]! <= 128)
        refuse("insufficient source coverage");
      if (inputs.skin?.data[alpha]) refuse("skin overlap");
      for (const [part, raster] of Object.entries(inputs.regions))
        if (part !== "bottom" && raster.data[alpha])
          refuse(`other-material overlap: ${part}`);
      added.add(p);
      data[alpha] = 255;
    }
  }
  const bottom = { width, height, data };
  if (
    ownershipRgbaHash(bottom) !== entry.resultMask.rgbaSha256 ||
    ownershipRgbaHash(loaded.result) !== entry.resultMask.rgbaSha256
  )
    refuse("result mask hash mismatch");
  if (ownershipHash(loaded.resultBytes) !== entry.resultMask.sha256)
    refuse("result PNG hash mismatch");
  return {
    regions: { ...inputs.regions, bottom },
    encodedBottom: loaded.resultBytes,
  };
}
