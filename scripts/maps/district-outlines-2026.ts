/**
 * District outlines for the U.S. House lines of 2026, dissolved from Census
 * 2020 blocks.
 *
 * The Census Bureau publishes the 120th Congress lines only as a block
 * equivalency file (block to district), not as a cartographic boundary
 * shapefile. This module builds each district's outline by joining that file
 * to the 2020 block polygons and canceling every edge two blocks of the same
 * district share, so what is left is the district's own boundary.
 *
 * Water follows the shipped cartographic boundary files: a block is drawn when
 * it has land, or when its interior point falls inside the state's
 * cartographic outline (an inland lake stays inside its district; open water
 * past the shoreline does not). Offline compiler input only.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import {
  listZipMembers,
  readZipMember,
  readZipMemberEntry,
} from "../../src/source/core/archive/zip";
import { LINES_2026_DIRECTORY, loadLines2026 } from "./lines-2026-overlay";
import type { Ring, ShapeRecord } from "./shapefile";

// The CommonJS boundary uses the package's coordinate-array contract.
// These types are erased; intersection and all geometry operations stay unchanged.
type ClipRing = [number, number][];
type Polygon = ClipRing[];
type MultiPolygon = Polygon[];
interface PolygonClipper {
  intersection(
    geometry: Polygon | MultiPolygon,
    ...geometries: (Polygon | MultiPolygon)[]
  ): MultiPolygon;
}

// The package ships CommonJS only; Node's ESM loader exposes no named exports.
const { intersection } = createRequire(import.meta.url)(
  "polygon-clipping",
) as PolygonClipper;

const MICRO = 1_000_000;
const SPAN = 2 ** 26;

/**
 * Interns integer-keyed vertices to dense ids. A Map stops at 2^24 entries,
 * which the largest states pass, so the table is open-addressed typed arrays.
 */
class VertexTable {
  private static readonly SLOTS = 2 ** 26;
  private readonly keys = new Float64Array(VertexTable.SLOTS).fill(-1);
  private readonly ids = new Int32Array(VertexTable.SLOTS);
  lon = new Int32Array(1 << 20);
  lat = new Int32Array(1 << 20);
  count = 0;

  intern(key: number, lon: number, lat: number): number {
    const mask = VertexTable.SLOTS - 1;
    let slot =
      ((Math.imul(lon, 0x9e3779b1) ^ Math.imul(lat, 0x85ebca6b)) >>> 6) & mask;
    for (;;) {
      const found = this.keys[slot] as number;
      if (found === key) return this.ids[slot] as number;
      if (found === -1) break;
      slot = (slot + 1) & mask;
    }
    if (this.count >= VertexTable.SLOTS * 0.7)
      throw new Error("Too many vertices to key edges.");
    if (this.count === this.lon.length) {
      for (const axis of ["lon", "lat"] as const) {
        const grown = new Int32Array(this.count * 2);
        grown.set(this[axis]);
        this[axis] = grown;
      }
    }
    const id = this.count;
    this.count += 1;
    this.keys[slot] = key;
    this.ids[slot] = id;
    this.lon[id] = lon;
    this.lat[id] = lat;
    return id;
  }
}

/** Point-in-polygon over even-odd rings, indexed by latitude band. */
export class RingIndex {
  private readonly bands: number[][];
  private readonly segments: Float64Array;
  private readonly minLat: number;
  private readonly bandHeight: number;
  readonly bbox: readonly [number, number, number, number];

  constructor(rings: readonly Ring[], bandCount = 1024) {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    let segmentCount = 0;
    for (const ring of rings) {
      segmentCount += ring.length / 2 - 1;
      for (let at = 0; at < ring.length; at += 2) {
        x0 = Math.min(x0, ring[at] as number);
        x1 = Math.max(x1, ring[at] as number);
        y0 = Math.min(y0, ring[at + 1] as number);
        y1 = Math.max(y1, ring[at + 1] as number);
      }
    }
    this.bbox = [x0, y0, x1, y1];
    this.minLat = y0;
    this.bandHeight = Math.max((y1 - y0) / bandCount, 1e-9);
    this.bands = Array.from({ length: bandCount }, () => []);
    this.segments = new Float64Array(segmentCount * 4);
    let index = 0;
    for (const ring of rings) {
      for (let at = 0; at + 3 < ring.length; at += 2) {
        const ax = ring[at] as number;
        const ay = ring[at + 1] as number;
        const bx = ring[at + 2] as number;
        const by = ring[at + 3] as number;
        this.segments.set([ax, ay, bx, by], index * 4);
        const first = this.bandOf(Math.min(ay, by));
        const last = this.bandOf(Math.max(ay, by));
        for (let band = first; band <= last; band += 1)
          (this.bands[band] as number[]).push(index);
        index += 1;
      }
    }
  }

  private bandOf(lat: number): number {
    return Math.min(
      this.bands.length - 1,
      Math.max(0, Math.floor((lat - this.minLat) / this.bandHeight)),
    );
  }

  contains(lon: number, lat: number): boolean {
    if (
      lon < this.bbox[0] ||
      lon > this.bbox[2] ||
      lat < this.bbox[1] ||
      lat > this.bbox[3]
    )
      return false;
    let inside = false;
    for (const segment of this.bands[this.bandOf(lat)] as number[]) {
      const at = segment * 4;
      const ax = this.segments[at] as number;
      const ay = this.segments[at + 1] as number;
      const bx = this.segments[at + 2] as number;
      const by = this.segments[at + 3] as number;
      if (
        ay > lat !== by > lat &&
        lon < ax + ((lat - ay) / (by - ay)) * (bx - ax)
      )
        inside = !inside;
    }
    return inside;
  }
}

interface DbfColumns {
  readonly count: number;
  readonly geoid: string[];
  readonly land: Float64Array;
  readonly lon: Float64Array;
  readonly lat: Float64Array;
}

function readBlockColumns(dbf: Buffer): DbfColumns {
  const count = dbf.readUInt32LE(4);
  const headerLength = dbf.readUInt16LE(8);
  const recordLength = dbf.readUInt16LE(10);
  const fields = new Map<string, { offset: number; length: number }>();
  let offset = 1;
  for (let at = 32; dbf[at] !== 0x0d; at += 32) {
    const name = dbf.toString("latin1", at, at + 11).replace(/\0+$/, "");
    const length = dbf[at + 16] as number;
    fields.set(name, { offset, length });
    offset += length;
  }
  const need = (name: string) => {
    const field = fields.get(name);
    if (!field) throw new Error(`Block table lacks ${name}.`);
    return field;
  };
  const [geoid, land, lon, lat] = [
    need("GEOID20"),
    need("ALAND20"),
    need("INTPTLON20"),
    need("INTPTLAT20"),
  ];
  const text = (base: number, field: { offset: number; length: number }) =>
    dbf
      .toString(
        "latin1",
        base + field.offset,
        base + field.offset + field.length,
      )
      .trim();
  const out: DbfColumns = {
    count,
    geoid: new Array<string>(count),
    land: new Float64Array(count),
    lon: new Float64Array(count),
    lat: new Float64Array(count),
  };
  for (let row = 0; row < count; row += 1) {
    const base = headerLength + row * recordLength;
    out.geoid[row] = text(base, geoid);
    out.land[row] = Number(text(base, land));
    out.lon[row] = Number(text(base, lon));
    out.lat[row] = Number(text(base, lat));
    if (
      !Number.isFinite(
        (out.land[row] as number) +
          (out.lon[row] as number) +
          (out.lat[row] as number),
      )
    )
      throw new Error(
        `Block ${out.geoid[row]} has an unreadable land area or point.`,
      );
  }
  return out;
}

export interface DissolveStats {
  readonly blocks: number;
  /** Blocks with land or an interior point inside the state outline. */
  readonly drawn: number;
  readonly residualBlocks: number;
  readonly residualWithLand: number;
  readonly waterKept: number;
  readonly waterDropped: number;
  readonly ringsByDistrict: Readonly<Record<string, number>>;
}

/**
 * One outline per district code. `districtOf` maps a block GEOID to its
 * district code; the residual code ZZ is never drawn.
 */
export function dissolveDistricts(
  blocksArchive: Buffer,
  districtOf: ReadonlyMap<string, string>,
  stateOutline: readonly Ring[],
  options: { readonly clip?: boolean } = {},
): { districts: Map<string, Ring[]>; stats: DissolveStats } {
  const members = listZipMembers(blocksArchive);
  const shpMember = members.find((member) => member.path.endsWith(".shp"));
  const dbfMember = members.find((member) => member.path.endsWith(".dbf"));
  if (!shpMember || !dbfMember)
    throw new Error("Block archive lacks a .shp/.dbf pair.");
  const columns = readBlockColumns(
    readZipMemberEntry(blocksArchive, dbfMember),
  );
  const shp = readZipMemberEntry(blocksArchive, shpMember);
  if (shp.readInt32BE(0) !== 9994) throw new Error("Bad .shp file code.");
  const outline = new RingIndex(stateOutline);

  // Vertices are interned as integers so an edge is one number.
  const lonBase = Math.floor(outline.bbox[0] * MICRO) - MICRO;
  const latBase = Math.floor(outline.bbox[1] * MICRO) - MICRO;
  if (
    (outline.bbox[2] - outline.bbox[0] + 2) * MICRO >= SPAN ||
    (outline.bbox[3] - outline.bbox[1] + 2) * MICRO >= SPAN
  )
    throw new Error("State outline is too wide to key vertices.");
  const vertices = new VertexTable();
  const intern = (lon: number, lat: number): number => {
    const lonI = Math.round(lon * MICRO);
    const latI = Math.round(lat * MICRO);
    return vertices.intern(
      (lonI - lonBase) * SPAN + (latI - latBase),
      lonI,
      latI,
    );
  };

  const codeIndex = new Map<string, number>();
  const codes: string[] = [];
  const edges = new Map<number, number>();
  let drawn = 0;
  let residualBlocks = 0;
  let residualWithLand = 0;
  let waterKept = 0;
  let waterDropped = 0;

  let offset = 100;
  const fileLength = shp.readInt32BE(24) * 2;
  let row = 0;
  while (offset < fileLength) {
    const contentLength = shp.readInt32BE(offset + 4) * 2;
    const content = offset + 8;
    const type = shp.readInt32LE(content);
    const block = columns.geoid[row] as string;
    const code = districtOf.get(block);
    if (code === undefined)
      throw new Error(`Block ${block} is missing from the district file.`);
    const hasLand = (columns.land[row] as number) > 0;
    let take = false;
    if (code === "ZZ") {
      residualBlocks += 1;
      if (hasLand) residualWithLand += 1;
    } else if (hasLand) {
      take = true;
    } else if (
      outline.contains(columns.lon[row] as number, columns.lat[row] as number)
    ) {
      take = true;
      waterKept += 1;
    } else {
      waterDropped += 1;
    }
    if (take && type === 5) {
      drawn += 1;
      let district = codeIndex.get(code);
      if (district === undefined) {
        district = codes.length;
        codeIndex.set(code, district);
        codes.push(code);
      }
      const numParts = shp.readInt32LE(content + 36);
      const numPoints = shp.readInt32LE(content + 40);
      const partsStart = content + 44;
      const pointsStart = partsStart + numParts * 4;
      for (let part = 0; part < numParts; part += 1) {
        const from = shp.readInt32LE(partsStart + part * 4);
        const to =
          part + 1 < numParts
            ? shp.readInt32LE(partsStart + (part + 1) * 4)
            : numPoints;
        let prev = -1;
        for (let point = from; point < to; point += 1) {
          const at = pointsStart + point * 16;
          const id = intern(shp.readDoubleLE(at), shp.readDoubleLE(at + 8));
          if (prev >= 0 && prev !== id) {
            const reverse = id * SPAN + prev;
            if (edges.get(reverse) === district) edges.delete(reverse);
            else edges.set(prev * SPAN + id, district);
          }
          prev = id;
        }
      }
    }
    offset = content + contentLength;
    row += 1;
  }
  if (row !== columns.count)
    throw new Error(`${row} block shapes but ${columns.count} table rows.`);

  // Chain the surviving directed edges of each district into closed rings.
  const perDistrict: number[][] = codes.map(() => []);
  for (const [key, district] of edges) {
    const from = Math.floor(key / SPAN);
    const to = key - from * SPAN;
    (perDistrict[district] as number[]).push(
      vertices.lon[from] as number,
      vertices.lat[from] as number,
      vertices.lon[to] as number,
      vertices.lat[to] as number,
    );
  }
  const districts = new Map<string, Ring[]>();
  const shoreline =
    options.clip === false ? null : toMultiPolygon(stateOutline);
  codes.forEach((code, district) => {
    const rings = chainRings(perDistrict[district] as number[], code);
    districts.set(code, shoreline ? clipToShoreline(rings, shoreline) : rings);
  });
  const ringsByDistrict: Record<string, number> = {};
  for (const [code, rings] of districts) ringsByDistrict[code] = rings.length;
  return {
    districts,
    stats: {
      blocks: columns.count,
      drawn,
      residualBlocks,
      residualWithLand,
      waterKept,
      waterDropped,
      ringsByDistrict,
    },
  };
}

const ringArea = (ring: Ring): number => {
  let sum = 0;
  for (let at = 0; at + 3 < ring.length; at += 2)
    sum +=
      (ring[at] as number) * (ring[at + 3] as number) -
      (ring[at + 2] as number) * (ring[at + 1] as number);
  return sum / 2;
};

const pairs = (ring: Ring): ClipRing => {
  const out: [number, number][] = [];
  for (let at = 0; at < ring.length; at += 2)
    out.push([ring[at] as number, ring[at + 1] as number]);
  return out;
};

/**
 * Shapefile rings to a nested polygon set: exteriors run clockwise, holes
 * counterclockwise, and each hole goes to the smallest exterior around it.
 */
export function toMultiPolygon(rings: readonly Ring[]): MultiPolygon {
  const exteriors: { ring: Ring; area: number; polygon: Polygon }[] = [];
  const holes: Ring[] = [];
  for (const ring of rings) {
    const area = ringArea(ring);
    if (area < 0) {
      const polygon: Polygon = [pairs(ring)];
      exteriors.push({ ring, area: -area, polygon });
    } else if (area > 0) holes.push(ring);
  }
  exteriors.sort((a, b) => a.area - b.area);
  const indexes = exteriors.map((entry) => new RingIndex([entry.ring], 64));
  for (const hole of holes) {
    const x = hole[0] as number;
    const y = hole[1] as number;
    const home = indexes.findIndex((index) => index.contains(x, y));
    if (home >= 0)
      (exteriors[home] as { polygon: Polygon }).polygon.push(pairs(hole));
  }
  return exteriors.map((entry) => entry.polygon);
}

/** Back to shapefile winding: exteriors clockwise, holes counterclockwise. */
function toRings(polygons: MultiPolygon): Ring[] {
  const out: Ring[] = [];
  for (const polygon of polygons)
    polygon.forEach((ring, at) => {
      const flat = new Float64Array(ring.length * 2);
      ring.forEach(([x, y], index) => {
        flat[index * 2] = x;
        flat[index * 2 + 1] = y;
      });
      const clockwise = ringArea(flat) < 0;
      if (clockwise !== (at === 0)) {
        for (let left = 0, right = ring.length - 1; left < right;) {
          for (let axis = 0; axis < 2; axis += 1) {
            const swap = flat[left * 2 + axis] as number;
            flat[left * 2 + axis] = flat[right * 2 + axis] as number;
            flat[right * 2 + axis] = swap;
          }
          left += 1;
          right -= 1;
        }
      }
      out.push(flat);
    });
  return out;
}

/**
 * Offsets, in degrees, tried in turn when the clip library cannot complete an
 * output ring. Where a block edge and the shoreline nearly coincide (a bay
 * shore in Texas), a shift of a few centimeters breaks the tie; the offsets are
 * fixed so a compile reproduces.
 */
const SHORELINE_NUDGES: readonly (readonly [number, number])[] = [
  [0, 0],
  [1e-7, 0],
  [0, 1e-7],
  [1e-7, 1e-7],
  [3e-7, -2e-7],
  [1e-6, 1e-6],
  [-1e-6, 3e-6],
];

/**
 * Coastal blocks reach past the cartographic shoreline, so district color
 * would poke into open water. Clip each district's outline to the state
 * outline; a district whose outline lies wholly inside is returned as is.
 */
export function clipToShoreline(
  rings: readonly Ring[],
  shoreline: MultiPolygon,
): Ring[] {
  const subject = toMultiPolygon(rings);
  let failure: unknown;
  for (const [dx, dy] of SHORELINE_NUDGES) {
    const moved =
      dx === 0 && dy === 0
        ? shoreline
        : shoreline.map((polygon) =>
            polygon.map((ring) =>
              ring.map(([x, y]): [number, number] => [x + dx, y + dy]),
            ),
          );
    try {
      return toRings(intersection(subject, moved));
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}

/** Artifacts the outlines are dissolved from, as named in the lines lock. */
export const BEF_ARTIFACT_ID = "census-bef-cd120";
export const blockArtifactId = (usps: string) =>
  `census-tiger-2025-tabblock20-${usps.toLowerCase()}`;

interface LinesLock {
  readonly artifacts: readonly {
    readonly artifactId: string;
    readonly file: string;
    readonly sha256: string;
  }[];
}

/** One locked source file, refused unless it matches the lock's SHA-256. */
export function readLockedLinesArtifact(
  root: string,
  artifactId: string,
): { bytes: Buffer; sha256: string } {
  const lock = JSON.parse(
    readFileSync(
      join(root, LINES_2026_DIRECTORY, "artifact-lock.json"),
      "utf8",
    ),
  ) as LinesLock;
  const entry = lock.artifacts.find((item) => item.artifactId === artifactId);
  if (!entry)
    throw new Error(`Artifact ${artifactId} is not in the lines lock.`);
  const path = join(root, ".source-cache/district-lines-2026", entry.file);
  if (!existsSync(path))
    throw new Error(
      `${path} is missing. Run npm run compile:district-lines-2026 -- --acquire first.`,
    );
  const bytes = readFileSync(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== entry.sha256)
    throw new Error(
      `${entry.file} does not match the lines lock. Refusing to compile.`,
    );
  return { bytes, sha256 };
}

/** Block GEOID to district code from one state's 120th Congress file. */
export function readDistrictFile(
  bef: Buffer,
  stateFips: string,
): Map<string, string> {
  const lines = readZipMember(bef, `CD120_${stateFips}.txt`)
    .toString("utf8")
    .split(/\r?\n/);
  if ((lines.shift() ?? "") !== "GEOID,STATEFP,COUNTYFP,TRACTCE,BLOCKCE,CDFP")
    throw new Error("Unexpected 120th Congress file layout.");
  const out = new Map<string, string>();
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split(",");
    out.set(cells[0] as string, cells[5] as string);
  }
  return out;
}

export interface RedrawnOutlines {
  /** Dissolved outlines by district GEOID. */
  readonly rings: ReadonlyMap<string, readonly Ring[]>;
  readonly stateUsps: ReadonlyMap<string, string>;
  /** Locked sources by state FIPS, for the packs that use them. */
  readonly sourcesByState: ReadonlyMap<
    string,
    readonly { artifactId: string; sha256: string }[]
  >;
  readonly summary: readonly {
    stateUsps: string;
    districts: number;
    blocksDrawn: number;
    waterBlocksKept: number;
    waterBlocksDropped: number;
  }[];
}

/**
 * Replace the 119th Congress outlines of every state in the compiled 2026 set
 * with outlines dissolved from the 120th Congress block file. Districts keep
 * their published attributes; the district set must not change.
 */
export function redrawCongressionalRecords(
  root: string,
  congressional: readonly ShapeRecord[],
  states: readonly ShapeRecord[],
  log: (message: string) => void,
): RedrawnOutlines {
  const lines = loadLines2026(root);
  const bef = readLockedLinesArtifact(root, BEF_ARTIFACT_ID);
  const replaced = new Map<string, readonly Ring[]>();
  const sourcesByState = new Map<
    string,
    { artifactId: string; sha256: string }[]
  >();
  const stateUsps = new Map<string, string>();
  const summary: RedrawnOutlines["summary"][number][] = [];
  for (const [fips, state] of Object.entries(lines.states).sort()) {
    const stateRecord = states.find(
      (record) => record.attributes.STATEFP === fips,
    );
    if (!stateRecord)
      throw new Error(`No state outline for ${state.stateUsps}.`);
    const blockId = blockArtifactId(state.stateUsps);
    const blocks = readLockedLinesArtifact(root, blockId);
    log(`dissolving ${state.stateUsps} districts from 2020 blocks`);
    const { districts, stats } = dissolveDistricts(
      blocks.bytes,
      readDistrictFile(bef.bytes, fips),
      stateRecord.rings,
    );
    const published = congressional.filter(
      (record) => record.attributes.STATEFP === fips,
    );
    const expected = new Set(
      published.map((record) => record.attributes.CD119FP ?? ""),
    );
    if (
      districts.size !== expected.size ||
      [...districts.keys()].some((code) => !expected.has(code))
    )
      throw new Error(
        `${state.stateUsps}: dissolved districts ${[...districts.keys()].sort()} differ from the published set ${[...expected].sort()}.`,
      );
    for (const record of published)
      replaced.set(
        record.attributes.GEOID ?? "",
        districts.get(record.attributes.CD119FP ?? "") as Ring[],
      );
    stateUsps.set(fips, state.stateUsps);
    sourcesByState.set(fips, [
      { artifactId: BEF_ARTIFACT_ID, sha256: bef.sha256 },
      { artifactId: blockId, sha256: blocks.sha256 },
    ]);
    summary.push({
      stateUsps: state.stateUsps,
      districts: districts.size,
      blocksDrawn: stats.drawn,
      waterBlocksKept: stats.waterKept,
      waterBlocksDropped: stats.waterDropped,
    });
  }
  return {
    rings: replaced,
    stateUsps,
    sourcesByState,
    summary,
  };
}

/** A cartographic layer with the dissolved outlines swapped in, attributes kept. */
export function applyRedrawn(
  records: readonly ShapeRecord[],
  redrawn: RedrawnOutlines,
): ShapeRecord[] {
  return records.map((record) => {
    const rings = redrawn.rings.get(record.attributes.GEOID ?? "");
    return rings ? { attributes: record.attributes, rings } : record;
  });
}

/** Directed edges as flat [x0, y0, x1, y1, ...] microdegrees to closed rings. */
function chainRings(flat: readonly number[], label: string): Ring[] {
  const adjacency = new Map<string, number[]>();
  const at = (x: number, y: number) => `${x},${y}`;
  for (let index = 0; index < flat.length; index += 4) {
    const from = at(flat[index] as number, flat[index + 1] as number);
    const list = adjacency.get(from);
    const target = [flat[index + 2] as number, flat[index + 3] as number];
    if (list) list.push(...target);
    else adjacency.set(from, target);
  }
  const rings: Ring[] = [];
  while (adjacency.size) {
    const startKey = adjacency.keys().next().value as string;
    const [sx, sy] = startKey.split(",").map(Number) as [number, number];
    const path = [sx, sy];
    let hereKey = startKey;
    for (;;) {
      const next = adjacency.get(hereKey);
      if (!next?.length) {
        throw new Error(`${label} has an open outline near ${hereKey}.`);
      }
      const y = next.pop() as number;
      const x = next.pop() as number;
      if (!next.length) adjacency.delete(hereKey);
      path.push(x, y);
      hereKey = at(x, y);
      if (hereKey === startKey) break;
    }
    const ring = new Float64Array(path.length);
    for (let index = 0; index < path.length; index += 1)
      ring[index] = (path[index] as number) / MICRO;
    rings.push(ring);
  }
  return rings;
}
