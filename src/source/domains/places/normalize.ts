/**
 * Gazetteer rows into place identity records.
 *
 * The interesting part is `displayName`. The Gazetteer appends a place's legal
 * or statistical class to its name — "Abbeville city", "San Juan zona urbana" —
 * and a place's name is not its class. Rather than hand-authoring an LSAD
 * translation table this substrate would then be the only authority for, the
 * suffix is derived *from the artifact*: for each LSAD code, the longest run of
 * trailing tokens shared by every name carrying that code is that code's class
 * description, and it is removed. Where names carrying a code do not share a
 * suffix at all — LSAD 00, the consolidated-government balances — nothing is
 * removed, because there is nothing the source says to remove.
 *
 * `sourceName` is always kept verbatim, so the derivation is reversible and
 * checkable.
 */

import { SourceValidationError } from "../../core/index";
import type { DelimitedRow, Evidence, ParseDefect } from "../../core/index";
import { GAZETTEER_PLACE_COLUMNS } from "./parse";
import { isPlaceGeoid, placeGeoidFq } from "./identity";
import type { PlaceRecord } from "./types";

export interface PlaceNormalizeResult {
  readonly records: readonly PlaceRecord[];
  readonly defects: readonly ParseDefect[];
  /** The class description derived for each LSAD code, for the audit trail. */
  readonly classSuffixByLsad: ReadonlyMap<string, string>;
}

function column(row: DelimitedRow, name: (typeof GAZETTEER_PLACE_COLUMNS)[number]): string {
  return row.fields[GAZETTEER_PLACE_COLUMNS.indexOf(name)] ?? "";
}

/**
 * The longest trailing token run shared by every name under one LSAD code.
 *
 * Deterministic and derived only from the rows in hand: no external table, and
 * no threshold to tune.
 */
export function deriveClassSuffixes(
  namesByLsad: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, string> {
  const suffixes = new Map<string, string>();
  for (const [lsad, names] of [...namesByLsad].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const tokenised = names.map((name) => name.split(/\s+/));
    let length = 0;
    for (;;) {
      const next = length + 1;
      if (tokenised.some((tokens) => tokens.length <= next)) break;
      const candidates = new Set(tokenised.map((tokens) => tokens.slice(-next).join(" ")));
      if (candidates.size !== 1) break;
      length = next;
    }
    if (length > 0) {
      suffixes.set(lsad, (tokenised[0] as string[]).slice(-length).join(" "));
    }
  }
  return suffixes;
}

/** Remove a code's class description from one published name. */
export function deriveDisplayName(sourceName: string, classSuffix: string | undefined): string {
  if (!classSuffix) return sourceName;
  if (!sourceName.endsWith(` ${classSuffix}`)) return sourceName;
  const trimmed = sourceName.slice(0, -(classSuffix.length + 1)).replace(/[\s,]+$/, "");
  return trimmed === "" ? sourceName : trimmed;
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
      message: `Line ${line}: ${field} is blank, so this record is dropped rather than given an empty value.`,
    });
    return null;
  }
  return raw;
}

export function normalizePlaces(
  rows: readonly DelimitedRow[],
  artifactId: string,
): PlaceNormalizeResult {
  const defects: ParseDefect[] = [];

  const namesByLsad = new Map<string, string[]>();
  for (const row of rows) {
    const lsad = column(row, "LSAD");
    const name = column(row, "NAME");
    if (lsad === "" || name === "") continue;
    const bucket = namesByLsad.get(lsad);
    if (bucket) bucket.push(name);
    else namesByLsad.set(lsad, [name]);
  }
  const classSuffixByLsad = deriveClassSuffixes(namesByLsad);

  const records: PlaceRecord[] = [];
  for (const row of rows) {
    const line = row.line;
    const geoid = requiredText(column(row, "GEOID"), "GEOID", line, defects);
    const stateUsps = requiredText(column(row, "USPS"), "USPS", line, defects);
    const geoidFq = requiredText(column(row, "GEOIDFQ"), "GEOIDFQ", line, defects);
    const ansiCode = requiredText(column(row, "ANSICODE"), "ANSICODE", line, defects);
    const sourceName = requiredText(column(row, "NAME"), "NAME", line, defects);
    const lsad = requiredText(column(row, "LSAD"), "LSAD", line, defects);
    const funcstat = requiredText(column(row, "FUNCSTAT"), "FUNCSTAT", line, defects);
    const landAreaSquareMeters = requiredNumber(column(row, "ALAND"), "ALAND", line, defects);
    const waterAreaSquareMeters = requiredNumber(column(row, "AWATER"), "AWATER", line, defects);
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
    const latitude = requiredNumber(column(row, "INTPTLAT"), "INTPTLAT", line, defects);
    const longitude = requiredNumber(column(row, "INTPTLONG"), "INTPTLONG", line, defects);

    if (
      geoid === null ||
      stateUsps === null ||
      geoidFq === null ||
      ansiCode === null ||
      sourceName === null ||
      lsad === null ||
      funcstat === null ||
      landAreaSquareMeters === null ||
      waterAreaSquareMeters === null ||
      landAreaSquareMiles === null ||
      waterAreaSquareMiles === null ||
      latitude === null ||
      longitude === null
    ) {
      continue;
    }

    if (!isPlaceGeoid(geoid)) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: GEOID "${geoid}" is not two state digits followed by five place digits.`,
      });
      continue;
    }
    if (geoidFq !== placeGeoidFq(geoid)) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: GEOIDFQ "${geoidFq}" does not match the published grammar for GEOID "${geoid}".`,
      });
      continue;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
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
      placeFips: geoid.slice(2),
      stateUsps,
      ansiCode,
      sourceName,
      displayName: deriveDisplayName(sourceName, classSuffixByLsad.get(lsad)),
      legalStatisticalAreaDescriptionCode: lsad,
      functionalStatusCode: funcstat,
      landAreaSquareMeters,
      waterAreaSquareMeters,
      landAreaSquareMiles,
      waterAreaSquareMiles,
      interiorPoint: { latitude, longitude },
      evidence,
    });
  }

  records.sort((left, right) => (left.geoid < right.geoid ? -1 : left.geoid > right.geoid ? 1 : 0));

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.geoid)) {
      throw new SourceValidationError(
        `The places file yields GEOID "${record.geoid}" twice; identity must be unique.`,
      );
    }
    seen.add(record.geoid);
  }

  return { records, defects, classSuffixByLsad };
}
