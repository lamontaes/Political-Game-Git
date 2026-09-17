/**
 * compile:map-geometry — offline Census cartographic boundary compiler.
 *
 *   npm run compile:map-geometry            # compile from the locked cache
 *   npm run compile:map-geometry -- --acquire   # download missing locked archives first
 *   npm run compile:map-geometry -- --check     # fail if committed output is stale
 *
 * Output: src/maps/geometry/national.generated.json, one pack per state/DC
 * under src/maps/geometry/states/, and data/source/map-geometry/manifest.json.
 * Raw archives are verified against the lock and never committed.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import {
  MAP_GEOMETRY_FORMAT,
  MAP_GEOMETRY_VINTAGE,
  type MapFeature,
  type MapGeometryPack,
  type MapLayerId,
} from "../../src/maps/geometry-types";
import {
  NOT_DRAWN_STATE_FIPS,
  projectLonLat,
  projectionRegionForStateFips,
} from "../../src/maps/projection";
import { readShapefileArchive, type ShapeRecord } from "./shapefile";
import {
  encodeLayer,
  type ArcStore,
  type LayerTopologyReport,
  type Point,
} from "./topology";

export const MAP_GEOMETRY_COMPILER_VERSION = "1.0.0";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const LOCK_PATH = join(ROOT, "data/source/map-geometry/artifact-lock.json");
const MANIFEST_PATH = join(ROOT, "data/source/map-geometry/manifest.json");
const OUT_DIR = join(ROOT, "src/maps/geometry");

interface LockArtifact {
  readonly artifactId: string;
  readonly file: string;
  readonly bytes: number;
  readonly sha256: string;
}
interface Lock {
  readonly cacheDirectory: string;
  readonly urlBase: string;
  readonly artifacts: readonly LockArtifact[];
}

const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as Lock;
const args = new Set(
  process.argv.slice(2).filter((arg) => !arg.startsWith("--only=")),
);
/** `--only=WA,KY` compiles just those state packs (plus national) and skips the manifest. */
const onlyStates = new Set(
  (process.argv.find((arg) => arg.startsWith("--only="))?.slice(7) ?? "")
    .split(",")
    .filter(Boolean),
);
const log = (message: string) =>
  process.stdout.write(`[map-geometry] ${message}\n`);

async function loadArchive(
  artifactId: string,
): Promise<{ records: readonly ShapeRecord[]; artifact: LockArtifact }> {
  const artifact = lock.artifacts.find(
    (entry) => entry.artifactId === artifactId,
  );
  if (!artifact) throw new Error(`Artifact ${artifactId} is not in the lock.`);
  const path = join(ROOT, lock.cacheDirectory, artifact.file);
  if (!existsSync(path)) {
    if (!args.has("--acquire")) {
      throw new Error(
        `${path} is missing. Re-run with --acquire to download locked Census archives.`,
      );
    }
    mkdirSync(dirname(path), { recursive: true });
    const response = await fetch(lock.urlBase + artifact.file);
    if (!response.ok)
      throw new Error(
        `Download of ${artifact.file} failed: HTTP ${response.status}`,
      );
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = readFileSync(path);
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== artifact.sha256 || bytes.length !== artifact.bytes) {
    throw new Error(
      `${artifact.file} does not match the lock (sha ${sha}, ${bytes.length} bytes). Refusing to compile.`,
    );
  }
  return { records: readShapefileArchive(bytes).records, artifact };
}

interface LayerSpec {
  readonly layer: MapLayerId;
  readonly nameOf: (attributes: Readonly<Record<string, string>>) => string;
}

const LAYER_SPECS: Readonly<Record<MapLayerId, LayerSpec>> = {
  state: { layer: "state", nameOf: (a) => a.NAME ?? "" },
  congressional: { layer: "congressional", nameOf: (a) => a.NAMELSAD ?? "" },
  county: { layer: "county", nameOf: (a) => a.NAMELSAD ?? "" },
  "state-upper": { layer: "state-upper", nameOf: (a) => a.NAMELSAD ?? "" },
  "state-lower": { layer: "state-lower", nameOf: (a) => a.NAMELSAD ?? "" },
  place: { layer: "place", nameOf: (a) => a.NAMELSAD ?? "" },
};

const STATE_USPS = new Map<string, string>();

function project(record: ShapeRecord): (readonly Point[])[] | null {
  const fips = record.attributes.STATEFP ?? "";
  const region = projectionRegionForStateFips(fips);
  if (!region) return null;
  return record.rings.map((ring) => {
    const out: Point[] = new Array(ring.length / 2);
    for (let index = 0; index < ring.length; index += 2) {
      out[index / 2] = projectLonLat(
        region,
        ring[index] as number,
        ring[index + 1] as number,
      ) as Point;
    }
    return out;
  });
}

interface LayerBuild {
  readonly features: MapFeature[];
  readonly report: LayerTopologyReport;
}

function buildLayer(
  spec: LayerSpec,
  records: readonly ShapeRecord[],
  store: ArcStore,
  options: { minTriangleArea: number; minRingArea: number; quantum: number },
): LayerBuild {
  const sorted = [...records].sort((a, b) =>
    (a.attributes.GEOID ?? "").localeCompare(b.attributes.GEOID ?? ""),
  );
  const projected = sorted.map((record) => ({
    record,
    rings: project(record),
  }));
  const drawable = projected.filter((entry) => entry.rings !== null);
  const { features, report } = encodeLayer(
    drawable.map((entry) => ({
      id: entry.record.attributes.GEOID ?? "",
      rings: entry.rings ?? [],
    })),
    options,
    store,
  );
  return {
    report,
    features: features.map((feature, index) => {
      const attributes = (drawable[index] as { record: ShapeRecord }).record
        .attributes;
      const stateFips = attributes.STATEFP ?? "";
      const out: MapFeature = {
        geoid: feature.id,
        name: spec.nameOf(attributes),
        stateFips,
        stateUsps: attributes.STUSPS ?? STATE_USPS.get(stateFips) ?? "",
        rings: feature.rings,
        bbox: feature.bbox,
        label: feature.label,
        ...(attributes.LSY ? { sessionYear: attributes.LSY } : {}),
        ...(spec.layer === "place" && attributes.LSAD
          ? { lsad: attributes.LSAD }
          : {}),
      };
      return out;
    }),
  };
}

function packBbox(
  layers: Partial<Record<MapLayerId, readonly MapFeature[]>>,
): [number, number, number, number] {
  let box: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];
  for (const features of Object.values(layers)) {
    for (const feature of features ?? []) {
      box = [
        Math.min(box[0], feature.bbox[0]),
        Math.min(box[1], feature.bbox[1]),
        Math.max(box[2], feature.bbox[2]),
        Math.max(box[3], feature.bbox[3]),
      ];
    }
  }
  return box.map((value) => Number(value.toFixed(4))) as [
    number,
    number,
    number,
    number,
  ];
}

function serialize(pack: MapGeometryPack): string {
  return `${JSON.stringify(pack)}\n`;
}

async function main() {
  const ids = [
    "cb-2025-state-5m",
    "cb-2025-cd119-5m",
    "cb-2025-state-500k",
    "cb-2025-cd119-500k",
    "cb-2025-county-500k",
    "cb-2025-sldu-500k",
    "cb-2025-sldl-500k",
    "cb-2025-place-500k",
  ];
  // Sequential on purpose: one inflated archive in memory at a time.
  const loaded: Awaited<ReturnType<typeof loadArchive>>[] = [];
  for (const id of ids) {
    log(`reading ${id}`);
    loaded.push(await loadArchive(id));
  }
  const [
    state5m,
    cd5m,
    state500k,
    cd500k,
    county500k,
    sldu500k,
    sldl500k,
    place500k,
  ] = loaded;
  for (const record of state500k!.records) {
    STATE_USPS.set(
      record.attributes.STATEFP ?? "",
      record.attributes.STUSPS ?? "",
    );
  }

  const outputs = new Map<string, string>();
  const manifestPacks: Record<string, unknown>[] = [];
  const excluded: Record<string, unknown>[] = [];

  // National pack: states + congressional districts, drawn areas only.
  {
    const store: ArcStore = { arcs: [] };
    const options = {
      minTriangleArea: 0.012,
      minRingArea: 0.02,
      quantum: 0.02,
    };
    const stateLayer = buildLayer(
      LAYER_SPECS.state,
      state5m!.records,
      store,
      options,
    );
    const cdLayer = buildLayer(
      LAYER_SPECS.congressional,
      cd5m!.records,
      store,
      options,
    );
    for (const [layer, archive] of [
      ["state", state5m!],
      ["congressional", cd5m!],
    ] as const) {
      for (const record of archive.records) {
        const fips = record.attributes.STATEFP ?? "";
        if (fips in NOT_DRAWN_STATE_FIPS) {
          excluded.push({
            pack: "national",
            layer,
            geoid: record.attributes.GEOID,
            name: record.attributes.NAMELSAD ?? record.attributes.NAME,
            reason: `${NOT_DRAWN_STATE_FIPS[fips]} is outside the 50-state + D.C. national canvas; it is not treated as absent data.`,
          });
        }
      }
    }
    const layers = {
      state: stateLayer.features,
      congressional: cdLayer.features,
    };
    const pack: MapGeometryPack = {
      format: MAP_GEOMETRY_FORMAT,
      vintage: MAP_GEOMETRY_VINTAGE,
      packId: "national",
      compilerVersion: MAP_GEOMETRY_COMPILER_VERSION,
      quantum: options.quantum,
      bbox: packBbox(layers),
      arcs: store.arcs,
      layers,
      sources: [state5m!, cd5m!].map(({ artifact }) => ({
        artifactId: artifact.artifactId,
        sha256: artifact.sha256,
      })),
    };
    const text = serialize(pack);
    outputs.set(join(OUT_DIR, "national.generated.json"), text);
    manifestPacks.push({
      packId: "national",
      path: "src/maps/geometry/national.generated.json",
      bytes: Buffer.byteLength(text),
      sha256: createHash("sha256").update(text).digest("hex"),
      layers: { state: stateLayer.report, congressional: cdLayer.report },
    });
  }

  // State packs: detailed layers for each drawn state and D.C.
  const byState = <T extends { records: readonly ShapeRecord[] }>(
    archive: T,
  ) => {
    const groups = new Map<string, ShapeRecord[]>();
    for (const record of archive.records) {
      const fips = record.attributes.STATEFP ?? "";
      groups.set(fips, [...(groups.get(fips) ?? []), record]);
    }
    return groups;
  };
  const grouped = {
    state: byState(state500k!),
    congressional: byState(cd500k!),
    county: byState(county500k!),
    "state-upper": byState(sldu500k!),
    "state-lower": byState(sldl500k!),
    place: byState(place500k!),
  } satisfies Record<MapLayerId, Map<string, ShapeRecord[]>>;
  const detailSources = [
    state500k!,
    cd500k!,
    county500k!,
    sldu500k!,
    sldl500k!,
    place500k!,
  ];
  const drawnStates = [...grouped.state.keys()]
    .filter((fips) => projectionRegionForStateFips(fips))
    .filter(
      (fips) => !onlyStates.size || onlyStates.has(STATE_USPS.get(fips) ?? ""),
    )
    .sort();
  log(`national pack done; compiling ${drawnStates.length} state packs`);
  for (const fips of drawnStates) {
    const usps = STATE_USPS.get(fips) ?? fips;
    const outline =
      project((grouped.state.get(fips) as ShapeRecord[])[0] as ShapeRecord) ??
      [];
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const ring of outline) {
      for (const [x, y] of ring) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    const diagonal = Math.hypot(x1 - x0, y1 - y0);
    // Detail sized so the state filled to ~900 px can zoom a further 8x.
    const unitsPerPixel = diagonal / 7200;
    const quantum = Number(
      Math.max(unitsPerPixel * 0.5, 0.0005).toPrecision(2),
    );
    const options = {
      quantum,
      minTriangleArea: 0.35 * unitsPerPixel * unitsPerPixel,
      minRingArea: 4 * unitsPerPixel * unitsPerPixel,
    };
    const store: ArcStore = { arcs: [] };
    const layers: Partial<Record<MapLayerId, MapFeature[]>> = {};
    const reports: Record<string, LayerTopologyReport> = {};
    for (const layer of [
      "state",
      "congressional",
      "county",
      "state-upper",
      "state-lower",
      "place",
    ] as const) {
      const records = grouped[layer].get(fips) ?? [];
      if (!records.length) continue;
      const build = buildLayer(LAYER_SPECS[layer], records, store, options);
      layers[layer] = build.features;
      reports[layer] = build.report;
    }
    const pack: MapGeometryPack = {
      format: MAP_GEOMETRY_FORMAT,
      vintage: MAP_GEOMETRY_VINTAGE,
      packId: `state-${fips}`,
      compilerVersion: MAP_GEOMETRY_COMPILER_VERSION,
      quantum,
      bbox: packBbox(layers),
      arcs: store.arcs,
      layers,
      sources: detailSources.map(({ artifact }) => ({
        artifactId: artifact.artifactId,
        sha256: artifact.sha256,
      })),
    };
    const text = serialize(pack);
    const file = `states/${fips}-${usps.toLowerCase()}.generated.json`;
    outputs.set(join(OUT_DIR, file), text);
    manifestPacks.push({
      packId: pack.packId,
      stateUsps: usps,
      path: `src/maps/geometry/${file}`,
      bytes: Buffer.byteLength(text),
      sha256: createHash("sha256").update(text).digest("hex"),
      quantum,
      layers: reports,
    });
    log(`${usps} ${Math.round(Buffer.byteLength(text) / 1024)} KB`);
    if (!args.has("--check")) {
      const path = join(OUT_DIR, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
      outputs.set(path, text);
    }
  }
  for (const [layer, groups] of Object.entries(grouped)) {
    for (const [fips, records] of groups) {
      if (projectionRegionForStateFips(fips)) continue;
      excluded.push({
        pack: "state",
        layer,
        stateFips: fips,
        count: records.length,
        reason: `${NOT_DRAWN_STATE_FIPS[fips]} has no drawn pack in this map; its identities remain in their own catalogs.`,
      });
    }
  }

  const manifest = {
    format: "ocd-map-geometry-manifest/v1",
    vintage: MAP_GEOMETRY_VINTAGE,
    compilerVersion: MAP_GEOMETRY_COMPILER_VERSION,
    projection:
      "Composite Albers equal-area (conterminous) with Alaska and Hawaii insets; insets are not true position or relative scale.",
    simplification:
      "Topology-preserving Visvalingam on shared arcs with fixed junctions; quantized; tiny non-primary rings dropped and counted.",
    packs: manifestPacks,
    excluded,
  };
  if (onlyStates.size) {
    for (const [path, text] of outputs) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    }
    log(`--only run: wrote ${outputs.size} packs; manifest not rewritten.`);
    return;
  }
  outputs.set(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  if (args.has("--check")) {
    const stale = [...outputs].filter(
      ([path, text]) =>
        !existsSync(path) || readFileSync(path, "utf8") !== text,
    );
    const expected = new Set([...outputs.keys()]);
    const extra = existsSync(join(OUT_DIR, "states"))
      ? readdirSync(join(OUT_DIR, "states"))
          .map((name) => join(OUT_DIR, "states", name))
          .filter((path) => !expected.has(path))
      : [];
    if (stale.length || extra.length) {
      throw new Error(
        `Map geometry output is stale: ${[...stale.map(([path]) => path), ...extra].join(", ")}`,
      );
    }
    console.log(`map geometry up to date (${outputs.size} files)`);
    return;
  }
  for (const [path, text] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  const total = [...outputs.values()].reduce(
    (sum, text) => sum + Buffer.byteLength(text),
    0,
  );
  console.log(
    `wrote ${outputs.size} files, ${(total / 1024 / 1024).toFixed(1)} MB`,
  );
}

await main();
