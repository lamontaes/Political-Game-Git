/**
 * Browser-side geometry access: lazy pack loading and arc decoding.
 *
 * The national pack loads with the map; each state's detail pack loads only
 * when that state is focused. Decoded paths are cached per pack so no
 * component keeps its own copy of the coordinates.
 */

import {
  MAP_GEOMETRY_FORMAT,
  MAP_GEOMETRY_VINTAGE,
  type MapFeature,
  type MapGeometryPack,
  type MapLayerId,
} from "./geometry-types";

type PackLoader = () => Promise<{ default: unknown } | unknown>;

const STATE_PACK_LOADERS = import.meta.glob<{ default: unknown }>(
  "./geometry/states/*.generated.json",
);

const NATIONAL_LOADER: PackLoader = () =>
  import("./geometry/national.generated.json");

export function validateGeometryPack(
  value: unknown,
  expectedId: string,
): MapGeometryPack {
  const pack = value as Partial<MapGeometryPack> | null;
  if (
    !pack ||
    pack.format !== MAP_GEOMETRY_FORMAT ||
    pack.vintage !== MAP_GEOMETRY_VINTAGE ||
    pack.packId !== expectedId ||
    !Array.isArray(pack.arcs) ||
    typeof pack.quantum !== "number" ||
    !pack.layers
  ) {
    throw new Error(
      `Map geometry pack ${expectedId} is missing or not the accepted Census 2025 format.`,
    );
  }
  return pack as MapGeometryPack;
}

const packCache = new Map<string, Promise<MapGeometryPack>>();

function unwrap(module: unknown): unknown {
  return module && typeof module === "object" && "default" in module
    ? (module as { default: unknown }).default
    : module;
}

export function loadNationalPack(): Promise<MapGeometryPack> {
  let pending = packCache.get("national");
  if (!pending) {
    pending = Promise.resolve(NATIONAL_LOADER()).then((module) =>
      validateGeometryPack(unwrap(module), "national"),
    );
    pending.catch(() => packCache.delete("national"));
    packCache.set("national", pending);
  }
  return pending;
}

export function hasStatePack(stateFips: string): boolean {
  return Object.keys(STATE_PACK_LOADERS).some((path) =>
    path.includes(`/states/${stateFips}-`),
  );
}

export function loadStatePack(stateFips: string): Promise<MapGeometryPack> {
  const id = `state-${stateFips}`;
  let pending = packCache.get(id);
  if (!pending) {
    const entry = Object.entries(STATE_PACK_LOADERS).find(([path]) =>
      path.includes(`/states/${stateFips}-`),
    );
    pending = entry
      ? entry[1]().then((module) => validateGeometryPack(unwrap(module), id))
      : Promise.reject(
          new Error(`No map geometry pack for state FIPS ${stateFips}.`),
        );
    pending.catch(() => packCache.delete(id));
    packCache.set(id, pending);
  }
  return pending;
}

/* ------------------------------------------------------------------ */
/* Decoding                                                            */
/* ------------------------------------------------------------------ */

const decodedArcs = new WeakMap<
  MapGeometryPack,
  (Float64Array | undefined)[]
>();
const pathCache = new WeakMap<MapGeometryPack, Map<string, string>>();

function arcPoints(pack: MapGeometryPack, index: number): Float64Array {
  let cache = decodedArcs.get(pack);
  if (!cache) {
    cache = new Array(pack.arcs.length);
    decodedArcs.set(pack, cache);
  }
  const hit = cache[index];
  if (hit) return hit;
  const encoded = pack.arcs[index];
  if (!encoded) throw new Error(`Arc ${index} is outside pack ${pack.packId}.`);
  const out = new Float64Array(encoded.length);
  let x = 0;
  let y = 0;
  for (let i = 0; i < encoded.length; i += 2) {
    x += encoded[i] as number;
    y += encoded[i + 1] as number;
    out[i] = x * pack.quantum;
    out[i + 1] = y * pack.quantum;
  }
  cache[index] = out;
  return out;
}

const fmt = (value: number) => {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

/** SVG path data for one feature, even-odd fill. Cached per pack. */
export function featurePath(
  pack: MapGeometryPack,
  layer: MapLayerId,
  feature: MapFeature,
): string {
  let cache = pathCache.get(pack);
  if (!cache) {
    cache = new Map();
    pathCache.set(pack, cache);
  }
  const key = `${layer}:${feature.geoid}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const parts: string[] = [];
  for (const ring of feature.rings) {
    const commands: string[] = [];
    ring.forEach((ref, arcIndex) => {
      const points = arcPoints(pack, ref < 0 ? ~ref : ref);
      const count = points.length / 2;
      for (let step = 0; step < count; step += 1) {
        const at = ref < 0 ? count - 1 - step : step;
        // Consecutive arcs share an endpoint; skip the duplicate.
        if (step === 0 && arcIndex > 0) continue;
        const x = points[at * 2] as number;
        const y = points[at * 2 + 1] as number;
        commands.push(
          `${commands.length === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`,
        );
      }
    });
    if (commands.length >= 3) parts.push(`${commands.join("")}Z`);
  }
  const path = parts.join("");
  cache.set(key, path);
  return path;
}

/** Exact decoded rings, for tests and topology checks. */
export function featureRings(
  pack: MapGeometryPack,
  feature: MapFeature,
): [number, number][][] {
  return feature.rings.map((ring) => {
    const out: [number, number][] = [];
    ring.forEach((ref, arcIndex) => {
      const points = arcPoints(pack, ref < 0 ? ~ref : ref);
      const count = points.length / 2;
      for (let step = 0; step < count; step += 1) {
        if (step === 0 && arcIndex > 0) continue;
        const at = ref < 0 ? count - 1 - step : step;
        out.push([points[at * 2] as number, points[at * 2 + 1] as number]);
      }
    });
    return out;
  });
}

export function layerFeatures(
  pack: MapGeometryPack | null,
  layer: MapLayerId,
): readonly MapFeature[] {
  return pack?.layers[layer] ?? [];
}

/** Point-in-feature test on decoded geometry (even-odd), for pin placement checks. */
export function featureContains(
  pack: MapGeometryPack,
  feature: MapFeature,
  x: number,
  y: number,
): boolean {
  const [x0, y0, x1, y1] = feature.bbox;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  let inside = false;
  for (const ring of featureRings(pack, feature)) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] as [number, number];
      const [xj, yj] = ring[j] as [number, number];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
  }
  return inside;
}
