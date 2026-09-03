/**
 * Gazetteer rows into county identity records.
 *
 * A blank required cell is a defect that drops the record and says so. It never
 * becomes `""`, `0` or a default category — that substitution is the failure
 * this whole substrate is built around, and the missingness sweep proves the
 * refusal for every field in turn.
 */

import { SourceValidationError } from "../../core/index";
import type { DelimitedRow, Evidence, ParseDefect } from "../../core/index";
import { GAZETTEER_COUNTY_COLUMNS } from "./parse";
import type { CountyRecord } from "./types";
import { countyGeoidFq, isCountyGeoid } from "./identity";

export interface NormalizeResult {
  readonly records: readonly CountyRecord[];
  readonly defects: readonly ParseDefect[];
}

function column(
  row: DelimitedRow,
  name: (typeof GAZETTEER_COUNTY_COLUMNS)[number],
): string {
  return row.fields[GAZETTEER_COUNTY_COLUMNS.indexOf(name)] ?? "";
}

/**
 * The published name, disambiguated.
 *
 * Census writes independent cities in lower case ("Baltimore city") and
 * counties in title case ("Baltimore County"), which is the distinction this
 * derivation preserves: a city keeps "City" so it cannot collide with the
 * county beside it, and every other suffix is dropped because the record's
 * `sourceName` still carries it verbatim.
 */
export function deriveDisplayName(sourceName: string): string {
  if (sourceName.endsWith(" city")) {
    return `${sourceName.slice(0, -" city".length)} City`;
  }
  for (const suffix of [
    " County",
    " Parish",
    " Borough",
    " Census Area",
    " Municipality",
    " Municipio",
    " City and Borough",
    " city and borough",
  ]) {
    if (sourceName.endsWith(suffix)) {
      return sourceName.slice(0, -suffix.length);
    }
  }
  return sourceName;
}

function requiredNumber(
  raw: string,
  field: string,
  line: number,
  defects: ParseDefect[],
): number | null {
  if (raw === "") {
    defects.push({
      kind: "unparsable-record",
      line,
      message: `Line ${line}: ${field} is blank. A blank measurement is not zero, so this record is dropped rather than coerced.`,
    });
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    defects.push({
      kind: "unparsable-record",
      line,
      message: `Line ${line}: ${field} is "${raw}", which is not a number.`,
    });
    return null;
  }
  return parsed;
}

function requiredText(
  raw: string,
  field: string,
  line: number,
  defects: ParseDefect[],
): string | null {
  if (raw === "") {
    defects.push({
      kind: "unparsable-record",
      line,
      message: `Line ${line}: ${field} is blank. An empty identifier is not an identifier, so this record is dropped.`,
    });
    return null;
  }
  return raw;
}

export function normalizeCounties(
  rows: readonly DelimitedRow[],
  artifactId: string,
): NormalizeResult {
  const records: CountyRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const line = row.line;
    const geoid = requiredText(column(row, "GEOID"), "GEOID", line, defects);
    const stateUsps = requiredText(column(row, "USPS"), "USPS", line, defects);
    const geoidFq = requiredText(
      column(row, "GEOIDFQ"),
      "GEOIDFQ",
      line,
      defects,
    );
    const ansiCode = requiredText(
      column(row, "ANSICODE"),
      "ANSICODE",
      line,
      defects,
    );
    const sourceName = requiredText(column(row, "NAME"), "NAME", line, defects);
    const landAreaSquareMeters = requiredNumber(
      column(row, "ALAND"),
      "ALAND",
      line,
      defects,
    );
    const waterAreaSquareMeters = requiredNumber(
      column(row, "AWATER"),
      "AWATER",
      line,
      defects,
    );
    const landAreaSquareMiles = requiredNumber(
      column(row, "ALAND_SQMI"),
      "ALAND_SQMI",
      line,
      defects,
    );
    const waterAreaSquareMiles = requiredNumber(
      column(row, "AWATER_SQMI"),
      "AWATER_SQMI",
      line,
      defects,
    );
    const latitude = requiredNumber(
      column(row, "INTPTLAT"),
      "INTPTLAT",
      line,
      defects,
    );
    const longitude = requiredNumber(
      column(row, "INTPTLONG"),
      "INTPTLONG",
      line,
      defects,
    );

    if (
      geoid === null ||
      stateUsps === null ||
      geoidFq === null ||
      ansiCode === null ||
      sourceName === null ||
      landAreaSquareMeters === null ||
      waterAreaSquareMeters === null ||
      landAreaSquareMiles === null ||
      waterAreaSquareMiles === null ||
      latitude === null ||
      longitude === null
    ) {
      continue;
    }

    if (!isCountyGeoid(geoid)) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: GEOID "${geoid}" is not two state digits followed by three county digits.`,
      });
      continue;
    }
    if (geoidFq !== countyGeoidFq(geoid)) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: GEOIDFQ "${geoidFq}" does not match the published grammar for GEOID "${geoid}".`,
      });
      continue;
    }
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: interior point (${latitude}, ${longitude}) is outside the coordinate domain.`,
      });
      continue;
    }

    const evidence: Evidence = {
      artifactId,
      locator: { kind: "delimited-row", artifactId, line },
    };

    records.push({
      geoid,
      geoidFq,
      stateFips: geoid.slice(0, 2),
      countyFips: geoid.slice(2),
      stateUsps,
      ansiCode,
      sourceName,
      displayName: deriveDisplayName(sourceName),
      landAreaSquareMeters,
      waterAreaSquareMeters,
      landAreaSquareMiles,
      waterAreaSquareMiles,
      interiorPoint: { latitude, longitude },
      evidence,
    });
  }

  records.sort((left, right) =>
    left.geoid < right.geoid ? -1 : left.geoid > right.geoid ? 1 : 0,
  );

  const geoids = new Set<string>();
  for (const record of records) {
    if (geoids.has(record.geoid)) {
      throw new SourceValidationError(
        `The counties file yields GEOID "${record.geoid}" twice; identity must be unique.`,
      );
    }
    geoids.add(record.geoid);
  }

  return { records, defects };
}
