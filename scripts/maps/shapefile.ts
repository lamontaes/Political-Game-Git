/**
 * Minimal ESRI shapefile + dBASE reader for Census cartographic boundary
 * archives. Offline compiler input only; never bundled into the game.
 *
 * Supports the polygon shape type (5) that every Census CB polygon layer
 * uses, and null shapes. Anything else fails closed.
 */

import {
  listZipMembers,
  readZipMemberEntry,
} from "../../src/source/core/archive/zip";

export type LonLat = readonly [number, number];
/** Packed [lon0, lat0, lon1, lat1, ...]; compact so national layers fit in memory. */
export type Ring = Float64Array;

export interface ShapeRecord {
  readonly attributes: Readonly<Record<string, string>>;
  /** Raw rings in file order; outer/hole role is decided by winding later. */
  readonly rings: readonly Ring[];
}

export function ringPointCount(ring: Ring): number {
  return ring.length / 2;
}

const SHAPE_NULL = 0;
const SHAPE_POLYGON = 5;

export function readShapefileArchive(archive: Buffer): {
  readonly baseName: string;
  readonly records: readonly ShapeRecord[];
  readonly projection: string | null;
} {
  const members = listZipMembers(archive);
  const shp = members.find((member) => member.path.endsWith(".shp"));
  const dbf = members.find((member) => member.path.endsWith(".dbf"));
  const prj = members.find((member) => member.path.endsWith(".prj"));
  if (!shp || !dbf) {
    throw new Error(
      `Archive lacks a .shp/.dbf pair; members: ${members.map((m) => m.path).join(", ")}`,
    );
  }
  const shapes = parseShp(readZipMemberEntry(archive, shp));
  const attributes = parseDbf(readZipMemberEntry(archive, dbf));
  if (shapes.length !== attributes.length) {
    throw new Error(
      `${shp.path} has ${shapes.length} shapes but ${dbf.path} has ${attributes.length} rows.`,
    );
  }
  return {
    baseName: shp.path.replace(/\.shp$/, ""),
    records: shapes.map((rings, index) => ({
      attributes: attributes[index] as Record<string, string>,
      rings,
    })),
    projection: prj
      ? readZipMemberEntry(archive, prj).toString("latin1")
      : null,
  };
}

function parseShp(bytes: Buffer): Ring[][] {
  if (bytes.readInt32BE(0) !== 9994) throw new Error("Bad .shp file code.");
  const fileLength = bytes.readInt32BE(24) * 2;
  const shapeType = bytes.readInt32LE(32);
  if (shapeType !== SHAPE_POLYGON) {
    throw new Error(
      `Unsupported shapefile type ${shapeType}; expected polygon (5).`,
    );
  }
  const shapes: Ring[][] = [];
  let offset = 100;
  while (offset < fileLength) {
    const contentLength = bytes.readInt32BE(offset + 4) * 2;
    const content = offset + 8;
    const type = bytes.readInt32LE(content);
    if (type === SHAPE_NULL) {
      shapes.push([]);
    } else if (type === SHAPE_POLYGON) {
      const numParts = bytes.readInt32LE(content + 36);
      const numPoints = bytes.readInt32LE(content + 40);
      const partsStart = content + 44;
      const pointsStart = partsStart + numParts * 4;
      const rings: Ring[] = [];
      for (let part = 0; part < numParts; part += 1) {
        const from = bytes.readInt32LE(partsStart + part * 4);
        const to =
          part + 1 < numParts
            ? bytes.readInt32LE(partsStart + (part + 1) * 4)
            : numPoints;
        const ring = new Float64Array((to - from) * 2);
        for (let point = from; point < to; point += 1) {
          const at = pointsStart + point * 16;
          ring[(point - from) * 2] = bytes.readDoubleLE(at);
          ring[(point - from) * 2 + 1] = bytes.readDoubleLE(at + 8);
        }
        rings.push(ring);
      }
      shapes.push(rings);
    } else {
      throw new Error(
        `Unsupported record shape type ${type} at byte ${offset}.`,
      );
    }
    offset = content + contentLength;
  }
  return shapes;
}

function parseDbf(bytes: Buffer): Record<string, string>[] {
  const recordCount = bytes.readUInt32LE(4);
  const headerLength = bytes.readUInt16LE(8);
  const recordLength = bytes.readUInt16LE(10);
  const fields: { name: string; length: number }[] = [];
  for (let at = 32; at < headerLength - 1 && bytes[at] !== 0x0d; at += 32) {
    const name = bytes
      .subarray(at, at + 11)
      .toString("latin1")
      .replace(/\0.*$/, "");
    fields.push({ name, length: bytes[at + 16] as number });
  }
  // Census CB dBASE files declare UTF-8 in their .cpg sidecar.
  const rows: Record<string, string>[] = [];
  for (let index = 0; index < recordCount; index += 1) {
    let at = headerLength + index * recordLength + 1;
    const row: Record<string, string> = {};
    for (const field of fields) {
      row[field.name] = bytes
        .subarray(at, at + field.length)
        .toString("utf8")
        .trim();
      at += field.length;
    }
    rows.push(row);
  }
  return rows;
}
