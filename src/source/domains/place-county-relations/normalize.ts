/**
 * Summary-level-155 rows into place-within-county part records.
 *
 * The place's land area is the sum of its parts' land; the acquisition cut has
 * already checked that sum against the publisher's own place row. A blank or
 * non-integer area is a defect, never zero.
 */

import type { DelimitedRow, ParseDefect } from "../../core/index";
import { GEO_FIELD } from "./acquisition";
import type {
  PlaceCountyPartRecord,
  PlaceDistrictPopulationRecord,
  PublisherPartFlag,
} from "./types";

export interface PlaceCountyNormalizeResult {
  readonly records: readonly PlaceCountyPartRecord[];
  readonly defects: readonly ParseDefect[];
}

export interface DistrictPopulationBlock {
  readonly blockGeoid: string;
  readonly placeGeoid: string | null;
  readonly districtGeoid: string;
  readonly chamber: PlaceDistrictPopulationRecord["chamber"];
  readonly boundaryVintage: string;
  readonly population: number;
}

/** Join inputs are publisher block counts and dated assignments, never areas. */
export function normalizeDistrictPopulationParts(
  rows: Iterable<DistrictPopulationBlock>,
  artifactId: string,
): readonly PlaceDistrictPopulationRecord[] {
  const seen = new Set<string>();
  const parts = new Map<string, PlaceDistrictPopulationRecord>();
  const totals = new Map<string, number>();
  let line = 0;
  for (const row of rows) {
    line += 1;
    const blockKey = `${row.boundaryVintage}:${row.chamber}:${row.blockGeoid}`;
    if (seen.has(blockKey))
      throw new Error(`Duplicate district block ${blockKey}`);
    seen.add(blockKey);
    if (
      !/^\d{15}$/.test(row.blockGeoid) ||
      !Number.isSafeInteger(row.population) ||
      row.population < 0 ||
      row.districtGeoid.slice(0, 2) !== row.blockGeoid.slice(0, 2)
    )
      throw new Error(`Invalid district population block ${blockKey}`);
    if (row.placeGeoid === null) continue;
    if (
      !/^\d{7}$/.test(row.placeGeoid) ||
      row.placeGeoid.slice(0, 2) !== row.blockGeoid.slice(0, 2)
    )
      throw new Error(`Invalid Census place for block ${blockKey}`);
    const group = `${row.boundaryVintage}:${row.placeGeoid}:${row.chamber}`;
    const recordId = `district:${group}:${row.districtGeoid}`;
    totals.set(group, (totals.get(group) ?? 0) + row.population);
    const previous = parts.get(recordId);
    parts.set(recordId, {
      relationKind: "legislative-district",
      recordId,
      placeGeoid: row.placeGeoid,
      stateFips: row.blockGeoid.slice(0, 2),
      chamber: row.chamber,
      districtGeoid: row.districtGeoid,
      boundaryVintage: row.boundaryVintage,
      populationAsOf: "2020-04-01",
      partPopulationCount:
        (previous?.partPopulationCount ?? 0) + row.population,
      placePopulationCount: 0,
      evidence: previous?.evidence ?? {
        artifactId,
        locator: { kind: "delimited-row", artifactId, line },
        providerNativeId: recordId,
      },
    });
  }
  return [...parts.values()]
    .map((part) => ({
      ...part,
      placePopulationCount: totals.get(
        `${part.boundaryVintage}:${part.placeGeoid}:${part.chamber}`,
      )!,
    }))
    .sort((a, b) => a.recordId.localeCompare(b.recordId));
}

interface Part {
  readonly row: DelimitedRow;
  readonly placeGeoid: string;
  readonly countyGeoid: string;
  readonly land: number;
  readonly water: number;
  readonly population: number;
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
    const populationRaw = field(GEO_FIELD.POP100);
    const population = Number(populationRaw);
    if (!/^\d+$/.test(populationRaw) || !Number.isSafeInteger(population)) {
      defect(
        defects,
        row.line,
        `POP100 "${populationRaw}" is not a nonnegative integer population count.`,
      );
      continue;
    }
    parts.push({
      row,
      placeGeoid: geocode.slice(0, 7),
      countyGeoid: state + county,
      land,
      water,
      population,
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
        partPopulationCount: part.population,
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
