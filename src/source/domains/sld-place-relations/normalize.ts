/**
 * Intersection rows into place-to-district membership records.
 *
 * Whole-place membership requires exactly one non-residual district and that
 * the intersection land and water equal the place's published land and water.
 * A unique district that only covers part of the place is not membership.
 * Multiple districts are a split. Empty district cells are skipped, not filled.
 */

import type { DelimitedRow, Evidence, ParseDefect } from "../../core/index";
import { districtGeoidColumn, columnsForChamber } from "./parse";
import {
  isPlaceGeoid,
  isStateLegislativeGeoid,
  isUnassignedResidualGeoid,
} from "./identity";
import type {
  PlaceDistrictMembershipKind,
  PlaceDistrictRelationRecord,
  RelationChamber,
} from "./types";

export interface RelationNormalizeResult {
  readonly records: readonly PlaceDistrictRelationRecord[];
  readonly defects: readonly ParseDefect[];
}

function cell(
  row: DelimitedRow,
  columns: readonly string[],
  name: string,
): string {
  return row.fields[columns.indexOf(name)] ?? "";
}

function numberOrDefect(
  raw: string,
  field: string,
  line: number,
  defects: ParseDefect[],
): number | null {
  if (raw === "") {
    defects.push({
      kind: "unparsable-record",
      line,
      message: `Line ${line}: ${field} is blank. A blank measurement is not zero.`,
    });
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    defects.push({
      kind: "unparsable-record",
      line,
      message: `Line ${line}: ${field} is "${raw}", which is not an integer area.`,
    });
    return null;
  }
  return parsed;
}

interface IntersectionRow {
  readonly line: number;
  readonly placeGeoid: string;
  readonly districtGeoid: string;
  readonly placeLand: number;
  readonly placeWater: number;
  readonly partLand: number;
  readonly partWater: number;
}

export function normalizeSldPlaceRelations(
  rows: readonly DelimitedRow[],
  chamber: RelationChamber,
  artifactId: string,
): RelationNormalizeResult {
  const columns = columnsForChamber(chamber);
  const districtColumn = districtGeoidColumn(chamber);
  const defects: ParseDefect[] = [];
  const grouped = new Map<string, IntersectionRow[]>();

  for (const row of rows) {
    const districtGeoid = cell(row, columns, districtColumn);
    const placeGeoid = cell(row, columns, "GEOID_PLACE_20");
    // Empty cells are the publisher saying this row is not a place–district
    // pair (no chamber in that state, or district remainder outside any place).
    if (districtGeoid === "" || placeGeoid === "") continue;
    if (!isPlaceGeoid(placeGeoid)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: place GEOID "${placeGeoid}" is not a 7-digit Census place identifier.`,
      });
      continue;
    }
    if (!isStateLegislativeGeoid(districtGeoid)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: district GEOID "${districtGeoid}" is not a state-legislative identifier.`,
      });
      continue;
    }
    const placeLand = numberOrDefect(
      cell(row, columns, "AREALAND_PLACE_20"),
      "AREALAND_PLACE_20",
      row.line,
      defects,
    );
    const placeWater = numberOrDefect(
      cell(row, columns, "AREAWATER_PLACE_20"),
      "AREAWATER_PLACE_20",
      row.line,
      defects,
    );
    const partLand = numberOrDefect(
      cell(row, columns, "AREALAND_PART"),
      "AREALAND_PART",
      row.line,
      defects,
    );
    const partWater = numberOrDefect(
      cell(row, columns, "AREAWATER_PART"),
      "AREAWATER_PART",
      row.line,
      defects,
    );
    if (
      placeLand === null ||
      placeWater === null ||
      partLand === null ||
      partWater === null
    ) {
      continue;
    }
    if (partLand === 0 && partWater === 0) continue;
    const entry: IntersectionRow = {
      line: row.line,
      placeGeoid,
      districtGeoid,
      placeLand,
      placeWater,
      partLand,
      partWater,
    };
    const bucket = grouped.get(placeGeoid) ?? [];
    bucket.push(entry);
    grouped.set(placeGeoid, bucket);
  }

  const records: PlaceDistrictRelationRecord[] = [];
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
    const intersectionLand = districtGeoids.reduce(
      (sum, geoid) => sum + (byDistrict.get(geoid)?.land ?? 0),
      0,
    );
    const intersectionWater = districtGeoids.reduce(
      (sum, geoid) => sum + (byDistrict.get(geoid)?.water ?? 0),
      0,
    );
    const nonResidual = districtGeoids.filter(
      (geoid) => !isUnassignedResidualGeoid(geoid),
    );
    let membership: PlaceDistrictMembershipKind = "split";
    let districtGeoid: string | null = null;
    if (nonResidual.length === 1) {
      const sole = nonResidual[0]!;
      const parts = byDistrict.get(sole)!;
      if (
        parts.land === first.placeLand &&
        parts.water === first.placeWater &&
        districtGeoids.length === 1
      ) {
        membership = "whole-place";
        districtGeoid = sole;
      }
    }
    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "delimited-row",
        artifactId,
        line: first.line,
      },
      providerNativeId: placeGeoid,
    };
    records.push({
      recordId: `${chamber}:${placeGeoid}`,
      chamber,
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
