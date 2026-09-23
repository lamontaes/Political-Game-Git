/**
 * Intersection rows into place-to-congressional-district records.
 *
 * Whole-place membership needs exactly one intersecting district, not residual,
 * whose intersection equals the place's published land and water. Any second
 * intersecting district, even a water-only sliver, is a split: the file shows
 * which districts a place touches, not where inside it anybody lives, so no
 * district is chosen by largest overlap. Empty cells are skipped, not filled.
 */

import type { DelimitedRow, Evidence, ParseDefect } from "../../core/index";
import { CD_PLACE_COLUMNS } from "./parse";
import {
  isCongressionalGeoid,
  isPlaceGeoid,
  isUnassignedResidualGeoid,
} from "./identity";
import type {
  CongressionalPlaceMembershipKind,
  CongressionalPlaceRelationRecord,
} from "./types";

export interface CdRelationNormalizeResult {
  readonly records: readonly CongressionalPlaceRelationRecord[];
  readonly defects: readonly ParseDefect[];
}

function cell(row: DelimitedRow, name: (typeof CD_PLACE_COLUMNS)[number]) {
  return row.fields[CD_PLACE_COLUMNS.indexOf(name)] ?? "";
}

function integer(
  row: DelimitedRow,
  field: (typeof CD_PLACE_COLUMNS)[number],
  defects: ParseDefect[],
): number | null {
  const raw = cell(row, field);
  const parsed = Number(raw);
  if (raw === "" || !Number.isInteger(parsed)) {
    defects.push({
      kind: "unparsable-record",
      line: row.line,
      message: `Line ${row.line}: ${field} is "${raw}", which is not an integer area. A blank measurement is not zero.`,
    });
    return null;
  }
  return parsed;
}

interface IntersectionRow {
  readonly line: number;
  readonly districtGeoid: string;
  readonly placeLand: number;
  readonly placeWater: number;
  readonly partLand: number;
  readonly partWater: number;
}

export function normalizeCdPlaceRelations(
  rows: readonly DelimitedRow[],
  artifactId: string,
): CdRelationNormalizeResult {
  const defects: ParseDefect[] = [];
  const grouped = new Map<string, IntersectionRow[]>();

  for (const row of rows) {
    const districtGeoid = cell(row, "GEOID_CD119_20");
    const placeGeoid = cell(row, "GEOID_PLACE_20");
    // A district remainder outside every place, or a place with no district.
    if (districtGeoid === "" || placeGeoid === "") continue;
    if (!isPlaceGeoid(placeGeoid)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: place GEOID "${placeGeoid}" is not a 7-digit Census place identifier.`,
      });
      continue;
    }
    if (!isCongressionalGeoid(districtGeoid)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: district GEOID "${districtGeoid}" is not a congressional district identifier.`,
      });
      continue;
    }
    if (districtGeoid.slice(0, 2) !== placeGeoid.slice(0, 2)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: place ${placeGeoid} and district ${districtGeoid} are in different states.`,
      });
      continue;
    }
    const placeLand = integer(row, "AREALAND_PLACE_20", defects);
    const placeWater = integer(row, "AREAWATER_PLACE_20", defects);
    const partLand = integer(row, "AREALAND_PART", defects);
    const partWater = integer(row, "AREAWATER_PART", defects);
    if (
      placeLand === null ||
      placeWater === null ||
      partLand === null ||
      partWater === null
    ) {
      continue;
    }
    if (partLand === 0 && partWater === 0) continue;
    const bucket = grouped.get(placeGeoid) ?? [];
    bucket.push({
      line: row.line,
      districtGeoid,
      placeLand,
      placeWater,
      partLand,
      partWater,
    });
    grouped.set(placeGeoid, bucket);
  }

  const records: CongressionalPlaceRelationRecord[] = [];
  for (const [placeGeoid, intersections] of grouped) {
    const first = intersections[0]!;
    if (
      intersections.some(
        (row) =>
          row.placeLand !== first.placeLand ||
          row.placeWater !== first.placeWater,
      )
    ) {
      defects.push({
        kind: "unparsable-record",
        line: first.line,
        message: `Place ${placeGeoid} is published with disagreeing place-area values across intersection rows.`,
      });
      continue;
    }
    const byDistrict = new Map<string, { land: number; water: number }>();
    for (const row of intersections) {
      const current = byDistrict.get(row.districtGeoid) ?? {
        land: 0,
        water: 0,
      };
      byDistrict.set(row.districtGeoid, {
        land: current.land + row.partLand,
        water: current.water + row.partWater,
      });
    }
    const districtGeoids = [...byDistrict.keys()].sort();
    const intersectionLand = [...byDistrict.values()].reduce(
      (sum, part) => sum + part.land,
      0,
    );
    const intersectionWater = [...byDistrict.values()].reduce(
      (sum, part) => sum + part.water,
      0,
    );
    let membership: CongressionalPlaceMembershipKind = "split";
    let districtGeoid: string | null = null;
    const sole = districtGeoids.length === 1 ? districtGeoids[0]! : null;
    if (
      sole !== null &&
      !isUnassignedResidualGeoid(sole) &&
      intersectionLand === first.placeLand &&
      intersectionWater === first.placeWater
    ) {
      membership = "whole-place";
      districtGeoid = sole;
    }
    const evidence: Evidence = {
      artifactId,
      locator: { kind: "delimited-row", artifactId, line: first.line },
      providerNativeId: placeGeoid,
    };
    records.push({
      recordId: `congressional:${placeGeoid}`,
      chamber: "congressional",
      placeGeoid,
      membership,
      districtGeoid,
      intersectingDistrictGeoids: districtGeoids,
      placeLandAreaSquareMeters: first.placeLand,
      placeWaterAreaSquareMeters: first.placeWater,
      intersectionLandAreaSquareMeters: intersectionLand,
      intersectionWaterAreaSquareMeters: intersectionWater,
      evidence,
    });
  }

  records.sort((left, right) => left.recordId.localeCompare(right.recordId));
  return { records, defects };
}
