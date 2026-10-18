/**
 * Compiles the map packs for the five territories (Puerto Rico, Guam, the U.S.
 * Virgin Islands, American Samoa and the Northern Mariana Islands) from the
 * same Census cartographic boundary files, at the same vintage and the same
 * topology-preserving reduction, as the 50 states and D.C. Each territory gets
 * its own pack in `src/maps/geometry/states/` (`<fips>-<usps>.generated.json`)
 * with its state outline, at-large delegate district, county equivalents,
 * legislative districts where the Census publishes them, and places.
 *
 * Raw archives stay in the ignored source cache and are checked against the
 * hashes in `data/source/map-geometry/artifact-lock.json`; only the compiled,
 * simplified packs are committed.
 *
 *   node --import tsx scripts/maps/compile-territories.ts
 *
 * Each territory is drawn in its own equal-area projection (the composite one
 * the states share can't hold islands thousands of miles apart), at the same
 * scale, so every pack's map units are the same size on the ground.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  encodeLayer,
  type ArcStore,
  type LayerTopologyReport,
  type Point,
  type SourceFeature,
} from "./topology";

const ROOT = new URL("../../", import.meta.url).pathname;
const LOCK = JSON.parse(
  readFileSync(
    join(ROOT, "data/source/map-geometry/artifact-lock.json"),
    "utf8",
  ),
) as {
  cacheDirectory: string;
  urlBase: string;
  vintage: string;
  artifacts: { artifactId: string; file: string; sha256: string }[];
};
const CACHE = join(ROOT, LOCK.cacheDirectory);
const OUT = join(ROOT, "src/maps/geometry/states");

/** The territories: Census state FIPS and postal code. */
export const TERRITORIES = [
  { fips: "60", usps: "AS" },
  { fips: "66", usps: "GU" },
  { fips: "69", usps: "MP" },
  { fips: "72", usps: "PR" },
  { fips: "78", usps: "VI" },
] as const;

/** Kilometers one map unit covers, the scale the state packs are drawn at. */
const KM_PER_UNIT = 6;
const EARTH_RADIUS_KM = 6371.0088;
const QUANTUM = 0.0021;
const COMPILER_VERSION = "1.0.0";

// ------------------------------------------------------------------ sources

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function artifactPath(artifactId: string): string {
  const row = LOCK.artifacts.find((a) => a.artifactId === artifactId);
  if (!row) throw new Error(`No artifact ${artifactId} in the lock.`);
  const path = join(CACHE, row.file);
  mkdirSync(CACHE, { recursive: true });
  if (!existsSync(path))
    execFileSync("curl", [
      "-sSL",
      "--fail",
      "-o",
      path,
      `${LOCK.urlBase}${row.file}`,
    ]);
  if (sha256(path) !== row.sha256)
    throw new Error(`${row.file} does not match its locked hash.`);
  return path;
}

interface Shape {
  readonly rings: readonly (readonly Point[])[];
  readonly attrs: Readonly<Record<string, string>>;
}

/** Reads a zipped shapefile: polygon geometry (longitude, latitude) and the attribute table. */
function readShapefile(zip: string): Shape[] {
  const dir = join(
    CACHE,
    "unzipped",
    zip
      .split("/")
      .pop()!
      .replace(/\.zip$/, ""),
  );
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    execFileSync("unzip", ["-qo", zip, "-d", dir]);
  }
  const base = readdirSync(dir)
    .find((name) => name.endsWith(".shp"))!
    .replace(/\.shp$/, "");
  const shp = readFileSync(join(dir, `${base}.shp`));
  const dbf = readFileSync(join(dir, `${base}.dbf`));

  // The attribute table.
  const count = dbf.readUInt32LE(4);
  const headerLength = dbf.readUInt16LE(8);
  const recordLength = dbf.readUInt16LE(10);
  const fields: { name: string; length: number }[] = [];
  for (let at = 32; dbf[at] !== 0x0d; at += 32)
    fields.push({
      name: dbf.toString("latin1", at, at + 11).replace(/\0.*$/, ""),
      length: dbf[at + 16]!,
    });
  const attributes: Record<string, string>[] = [];
  for (let record = 0; record < count; record += 1) {
    let at = headerLength + record * recordLength + 1;
    const row: Record<string, string> = {};
    for (const field of fields) {
      row[field.name] = dbf.toString("utf8", at, at + field.length).trim();
      at += field.length;
    }
    attributes.push(row);
  }

  // The geometry: one polygon record per attribute row.
  const shapes: Shape[] = [];
  let at = 100;
  let index = 0;
  while (at < shp.length) {
    const words = shp.readInt32BE(at + 4);
    const body = at + 8;
    const type = shp.readInt32LE(body);
    const rings: Point[][] = [];
    if (type === 5 || type === 15) {
      const parts = shp.readInt32LE(body + 36);
      const points = shp.readInt32LE(body + 40);
      const partsAt = body + 44;
      const pointsAt = partsAt + parts * 4;
      const starts = Array.from({ length: parts }, (_, p) =>
        shp.readInt32LE(partsAt + p * 4),
      );
      for (let p = 0; p < parts; p += 1) {
        const end = p + 1 < parts ? starts[p + 1]! : points;
        const ring: Point[] = [];
        for (let i = starts[p]!; i < end; i += 1)
          ring.push([
            shp.readDoubleLE(pointsAt + i * 16),
            shp.readDoubleLE(pointsAt + i * 16 + 8),
          ]);
        rings.push(ring);
      }
    }
    shapes.push({ rings, attrs: attributes[index] ?? {} });
    index += 1;
    at = body + words * 2;
  }
  return shapes;
}

// --------------------------------------------------------------- projection

/** A Lambert azimuthal equal-area projection centered on a territory, in map units (y down). */
function projection(lon0: number, lat0: number) {
  const rad = Math.PI / 180;
  const scale = EARTH_RADIUS_KM / KM_PER_UNIT;
  const [s0, c0] = [Math.sin(lat0 * rad), Math.cos(lat0 * rad)];
  return ([lon, lat]: Point): Point => {
    const [s, c] = [Math.sin(lat * rad), Math.cos(lat * rad)];
    const dl = (lon - lon0) * rad;
    const k = Math.sqrt(2 / (1 + s0 * s + c0 * c * Math.cos(dl)));
    return [
      scale * k * c * Math.sin(dl),
      -scale * k * (c0 * s - s0 * c * Math.cos(dl)),
    ];
  };
}

// --------------------------------------------------------------------- pack

interface LayerSpec {
  readonly name: string;
  readonly artifactId: string;
  readonly stateField: string;
  readonly geoid: (a: Shape["attrs"]) => string;
  readonly label: (a: Shape["attrs"]) => string;
  readonly extra?: (a: Shape["attrs"]) => Record<string, string>;
}

const LAYERS: readonly LayerSpec[] = [
  {
    name: "state",
    artifactId: "cb-2025-state-500k",
    stateField: "STATEFP",
    geoid: (a) => a.STATEFP!,
    label: (a) => a.NAME!,
  },
  {
    name: "congressional",
    artifactId: "cb-2025-cd119-500k",
    stateField: "STATEFP",
    geoid: (a) => a.GEOID!,
    label: (a) => a.NAMELSAD!,
  },
  {
    name: "county",
    artifactId: "cb-2025-county-500k",
    stateField: "STATEFP",
    geoid: (a) => a.GEOID!,
    label: (a) => a.NAMELSAD!,
  },
  {
    name: "state-upper",
    artifactId: "cb-2025-sldu-500k",
    stateField: "STATEFP",
    geoid: (a) => a.GEOID!,
    label: (a) => a.NAMELSAD!,
    extra: (a): Record<string, string> => (a.LSY ? { sessionYear: a.LSY } : {}),
  },
  {
    name: "state-lower",
    artifactId: "cb-2025-sldl-500k",
    stateField: "STATEFP",
    geoid: (a) => a.GEOID!,
    label: (a) => a.NAMELSAD!,
    extra: (a): Record<string, string> => (a.LSY ? { sessionYear: a.LSY } : {}),
  },
  {
    name: "place",
    artifactId: "cb-2025-place-500k",
    stateField: "STATEFP",
    geoid: (a) => a.GEOID!,
    label: (a) => a.NAMELSAD!,
    extra: (a): Record<string, string> => (a.LSAD ? { lsad: a.LSAD } : {}),
  },
];

const shapeCache = new Map<string, Shape[]>();
function shapesOf(artifactId: string): Shape[] {
  if (!shapeCache.has(artifactId))
    shapeCache.set(artifactId, readShapefile(artifactPath(artifactId)));
  return shapeCache.get(artifactId)!;
}

export function compileTerritory(territory: (typeof TERRITORIES)[number]) {
  const { fips, usps } = territory;
  const rowsOf = (spec: LayerSpec) =>
    shapesOf(spec.artifactId).filter(
      (shape) => shape.attrs[spec.stateField] === fips,
    );
  // The territory's own projection, centered on its outline.
  const outline = rowsOf(LAYERS[0]!);
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const shape of outline)
    for (const ring of shape.rings)
      for (const [x, y] of ring) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  const project = projection((x0 + x1) / 2, (y0 + y1) / 2);
  const projected = new Map<LayerSpec, SourceFeature[]>();
  const attrsOf = new Map<LayerSpec, Shape["attrs"][]>();
  let [minX, minY] = [Infinity, Infinity];
  for (const spec of LAYERS) {
    const rows = rowsOf(spec)
      .map((shape) => ({
        id: spec.geoid(shape.attrs),
        attrs: shape.attrs,
        rings: shape.rings.map((ring) => ring.map(project)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const row of rows)
      for (const ring of row.rings)
        for (const [x, y] of ring) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
        }
    projected.set(
      spec,
      rows.map((row) => ({ id: row.id, rings: row.rings })),
    );
    attrsOf.set(
      spec,
      rows.map((row) => row.attrs),
    );
  }
  // Every pack's map starts a little off the origin, as the states' do.
  const shift = ([x, y]: Point): Point => [x - minX + 100, y - minY + 100];
  const store: ArcStore = { arcs: [] };
  const layers: Record<string, unknown[]> = {};
  const reports: Record<string, LayerTopologyReport> = {};
  const bbox: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];
  for (const spec of LAYERS) {
    const features = projected.get(spec)!.map((feature) => ({
      id: feature.id,
      rings: feature.rings.map((ring) => ring.map(shift)),
    }));
    if (!features.length) continue;
    const { features: encoded, report } = encodeLayer(
      features,
      {
        minTriangleArea: QUANTUM * QUANTUM * 4,
        minRingArea: 0.0005,
        quantum: QUANTUM,
      },
      store,
    );
    reports[spec.name] = report;
    const attrs = attrsOf.get(spec)!;
    layers[spec.name] = encoded.map((feature, i) => {
      for (let k = 0; k < 4; k += 1) {
        bbox[k] =
          k < 2
            ? Math.min(bbox[k]!, feature.bbox[k]!)
            : Math.max(bbox[k]!, feature.bbox[k]!);
      }
      return {
        geoid: feature.id,
        name: spec.label(attrs[i]!),
        stateFips: fips,
        stateUsps: usps,
        rings: feature.rings,
        bbox: feature.bbox,
        label: feature.label,
        ...(spec.extra?.(attrs[i]!) ?? {}),
      };
    });
  }
  const used = LAYERS.filter((spec) => layers[spec.name]);
  const pack = {
    format: "ocd-map-geometry/v1",
    vintage: LOCK.vintage,
    packId: `state-${fips}`,
    compilerVersion: COMPILER_VERSION,
    quantum: QUANTUM,
    bbox: bbox.map((n) => Math.round(n * 10000) / 10000),
    arcs: store.arcs,
    layers,
    sources: used.map((spec) => ({
      artifactId: spec.artifactId,
      sha256: LOCK.artifacts.find((a) => a.artifactId === spec.artifactId)!
        .sha256,
    })),
  };
  return { pack, reports };
}

/** The manifest names each pack by its hash, with the topology of every layer; the territories' entries are rewritten here. */
function updateManifest(
  entries: readonly {
    packId: string;
    stateUsps: string;
    path: string;
    bytes: number;
    sha256: string;
    quantum: number;
    layers: Record<string, LayerTopologyReport>;
  }[],
): void {
  const path = join(ROOT, "data/source/map-geometry/manifest.json");
  const manifest = JSON.parse(readFileSync(path, "utf8")) as {
    packs: { packId: string }[];
    territoryProjection?: string;
  };
  const ids = new Set(entries.map((entry) => entry.packId));
  manifest.packs = [
    ...manifest.packs.filter((pack) => !ids.has(pack.packId)),
    ...entries,
  ];
  manifest.territoryProjection =
    "Each territory pack is drawn in its own Lambert azimuthal equal-area projection centered on the territory, at the same scale as the state packs (one map unit is about 6 kilometers); the territories are not placed on the national canvas.";
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1]?.endsWith("compile-territories.ts")) {
  mkdirSync(OUT, { recursive: true });
  const entries = [];
  for (const territory of TERRITORIES) {
    const { pack, reports } = compileTerritory(territory);
    const name = `${territory.fips}-${territory.usps.toLowerCase()}.generated.json`;
    const text = `${JSON.stringify(pack)}\n`;
    writeFileSync(join(OUT, name), text);
    entries.push({
      packId: pack.packId,
      stateUsps: territory.usps,
      path: `src/maps/geometry/states/${name}`,
      bytes: Buffer.byteLength(text),
      sha256: createHash("sha256").update(text).digest("hex"),
      quantum: pack.quantum,
      layers: reports,
    });
    const counts = Object.entries(pack.layers)
      .map(([layer, rows]) => `${layer} ${(rows as unknown[]).length}`)
      .join(", ");
    console.log(`${territory.usps}: ${counts}; ${pack.arcs.length} arcs`);
  }
  updateManifest(entries);
}
