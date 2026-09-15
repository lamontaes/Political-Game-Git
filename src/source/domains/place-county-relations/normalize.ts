/**
 * Summary-level-155 rows into place-within-county part records.
 *
 * The place's land area is the sum of its parts' land; the acquisition cut has
 * already checked that sum against the publisher's own place row. A blank or
 * non-integer area is a defect, never zero.
 */

import type { DelimitedRow, ParseDefect } from "../../core/index";
import { GEO_FIELD } from "./acquisition";
import type { PlaceCountyPartRecord, PublisherPartFlag } from "./types";

export interface PlaceCountyNormalizeResult {
  readonly records: readonly PlaceCountyPartRecord[];
  readonly defects: readonly ParseDefect[];
}

interface Part {
  readonly row: DelimitedRow;
  readonly placeGeoid: string;
  readonly countyGeoid: string;
  readonly land: number;
  readonly water: number;
  readonly flag: PublisherPartFlag;
}

function defect(defects: ParseDefect[], line: number, message: string): void {
  defects.push({
    kind: "unparsable-record",
    line,
    message: `Line ${line}: ${message}`,
  });
}

export function normalizePlaceCountyParts(
  rows: readonly DelimitedRow[],
  stateFips: string,
  artifactId: string,
): PlaceCountyNormalizeResult {
  const defects: ParseDefect[] = [];
  const parts: Part[] = [];

  for (const row of rows) {
    const field = (index: number) => row.fields[index] ?? "";
    if (field(GEO_FIELD.SUMLEV) !== "155") {
      defect(
        defects,
        row.line,
        `SUMLEV is "${field(GEO_FIELD.SUMLEV)}", not 155.`,
      );
      continue;
    }
    const geocode = field(GEO_FIELD.GEOCODE);
    if (!/^\d{10}$/.test(geocode)) {
      defect(
        defects,
        row.line,
        `GEOCODE "${geocode}" is not state+place+county.`,
      );
      continue;
    }
    if (field(GEO_FIELD.GEOID) !== `1550000US${geocode}`) {
      defect(
        defects,
        row.line,
        `GEOID "${field(GEO_FIELD.GEOID)}" disagrees with GEOCODE ${geocode}.`,
      );
      continue;
    }
    const state = field(GEO_FIELD.STATE);
    const county = field(GEO_FIELD.COUNTY);
    if (
      state !== stateFips ||
      geocode.slice(0, 2) !== state ||
      geocode.slice(7) !== county
    ) {
      defect(
        defects,
        row.line,
        `STATE "${state}" and COUNTY "${county}" disagree with GEOCODE ${geocode} in the ${stateFips} file.`,
      );
      continue;
    }
    const flag = field(GEO_FIELD.PARTFLAG);
    if (flag !== "W" && flag !== "P") {
      defect(defects, row.line, `PARTFLAG "${flag}" is neither "W" nor "P".`);
      continue;
    }
    const landRaw = field(GEO_FIELD.AREALAND);
    const waterRaw = field(GEO_FIELD.AREAWATR);
    const land = Number(landRaw);
    const water = Number(waterRaw);
    if (
      landRaw === "" ||
      waterRaw === "" ||
      !Number.isSafeInteger(land) ||
      !Number.isSafeInteger(water)
    ) {
      defect(
        defects,
        row.line,
        `AREALAND "${landRaw}" or AREAWATR "${waterRaw}" is not an integer area.`,
      );
      continue;
    }
    parts.push({
      row,
      placeGeoid: geocode.slice(0, 7),
      countyGeoid: state + county,
      land,
      water,
      flag,
    });
  }

  const byPlace = new Map<string, Part[]>();
  for (const part of parts) {
    const list = byPlace.get(part.placeGeoid);
    if (list) list.push(part);
    else byPlace.set(part.placeGeoid, [part]);
  }

  const records: PlaceCountyPartRecord[] = [];
  for (const [placeGeoid, placeParts] of byPlace) {
    const counties = new Set(placeParts.map((part) => part.countyGeoid));
    if (counties.size !== placeParts.length) {
      defect(
        defects,
        placeParts[0]!.row.line,
        `place ${placeGeoid} lists a county more than once.`,
      );
      continue;
    }
    const placeLand = placeParts.reduce((sum, part) => sum + part.land, 0);
    for (const part of placeParts) {
      records.push({
        recordId: `${placeGeoid}:${part.countyGeoid}`,
        placeGeoid,
        countyGeoid: part.countyGeoid,
        stateFips,
        partLandAreaSquareMeters: part.land,
        partWaterAreaSquareMeters: part.water,
        placeLandAreaSquareMeters: placeLand,
        placeCountyPartCount: placeParts.length,
        publisherPartFlag: part.flag,
        evidence: {
          artifactId,
          locator: { kind: "delimited-row", artifactId, line: part.row.line },
          providerNativeId: `1550000US${placeGeoid}${part.countyGeoid.slice(2)}`,
        },
      });
    }
  }
  return { records, defects };
}
