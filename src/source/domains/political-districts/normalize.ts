/**
 * Gazetteer rows into district geography records.
 *
 * The three files reuse GEOID values across chambers — Alabama's first state
 * house district and its first state senate district are both `01001` — so the
 * record key names the chamber. Residual `ZZ`/`ZZZ` rows are kept exactly as
 * published, because territory assigned to no district is a fact about the
 * partition and dropping it would silently make the map look complete.
 */

import type { DelimitedRow, Evidence, ParseDefect } from "../../core/index";
import { GAZETTEER_CD_COLUMNS, GAZETTEER_SLD_COLUMNS } from "./parse";
import {
  CONGRESSIONAL_GEOIDFQ_PREFIX,
  CONGRESSIONAL_GEOID_PATTERN,
  STATE_LEGISLATIVE_GEOID_PATTERN,
  STATE_LOWER_GEOIDFQ_PREFIX,
  STATE_UPPER_GEOIDFQ_PREFIX,
  isUnassignedResidualCode,
} from "./identity";
import type { DistrictChamber, PoliticalDistrictRecord } from "./types";

export interface DistrictNormalizeResult {
  readonly records: readonly PoliticalDistrictRecord[];
  readonly defects: readonly ParseDefect[];
}

const PREFIX_BY_CHAMBER: Record<DistrictChamber, string> = {
  congressional: CONGRESSIONAL_GEOIDFQ_PREFIX,
  "state-lower": STATE_LOWER_GEOIDFQ_PREFIX,
  "state-upper": STATE_UPPER_GEOIDFQ_PREFIX,
};

function cell(
  row: DelimitedRow,
  columns: readonly string[],
  name: string,
): string {
  return row.fields[columns.indexOf(name)] ?? "";
}

function number(
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

export function normalizeDistricts(
  rows: readonly DelimitedRow[],
  chamber: DistrictChamber,
  artifactId: string,
): DistrictNormalizeResult {
  const columns: readonly string[] =
    chamber === "congressional" ? GAZETTEER_CD_COLUMNS : GAZETTEER_SLD_COLUMNS;
  const geoidPattern =
    chamber === "congressional"
      ? CONGRESSIONAL_GEOID_PATTERN
      : STATE_LEGISLATIVE_GEOID_PATTERN;
  const codeLength = chamber === "congressional" ? 2 : 3;

  const records: PoliticalDistrictRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const line = row.line;
    const geoid = cell(row, columns, "GEOID");
    const stateUsps = cell(row, columns, "USPS");
    const geoidFq = cell(row, columns, "GEOIDFQ");
    const publishedName = chamber === "congressional" ? "" : cell(row, columns, "NAME");

    if (geoid === "" || stateUsps === "" || geoidFq === "") {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: a district row is missing its identifier, so it is dropped rather than given an empty one.`,
      });
      continue;
    }
    if (chamber !== "congressional" && publishedName === "") {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: the state legislative product publishes a NAME for every district, and this row has none.`,
      });
      continue;
    }
    if (!geoidPattern.test(geoid)) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: GEOID "${geoid}" does not match the ${chamber} grammar.`,
      });
      continue;
    }
    if (geoidFq !== `${PREFIX_BY_CHAMBER[chamber]}${geoid}`) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: GEOIDFQ "${geoidFq}" is not ${PREFIX_BY_CHAMBER[chamber]}${geoid}.`,
      });
      continue;
    }

    const landAreaSquareMeters = number(cell(row, columns, "ALAND"), "ALAND", line, defects);
    const waterAreaSquareMeters = number(cell(row, columns, "AWATER"), "AWATER", line, defects);
    const landAreaSquareMiles = number(
      cell(row, columns, "ALAND_SQMI"),
      "ALAND_SQMI",
      line,
      defects,
    );
    const waterAreaSquareMiles = number(
      cell(row, columns, "AWATER_SQMI"),
      "AWATER_SQMI",
      line,
      defects,
    );
    const latitude = number(cell(row, columns, "INTPTLAT"), "INTPTLAT", line, defects);
    const longitude = number(cell(row, columns, "INTPTLONG"), "INTPTLONG", line, defects);
    if (
      landAreaSquareMeters === null ||
      waterAreaSquareMeters === null ||
      landAreaSquareMiles === null ||
      waterAreaSquareMiles === null ||
      latitude === null ||
      longitude === null
    ) {
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

    const districtCode = geoid.slice(2);
    if (districtCode.length !== codeLength) {
      defects.push({
        kind: "unparsable-record",
        line,
        message: `Line ${line}: district code "${districtCode}" is ${districtCode.length} characters; the ${chamber} product publishes ${codeLength}.`,
      });
      continue;
    }

    const evidence: Evidence = {
      artifactId,
      locator: { kind: "delimited-row", artifactId, line },
    };

    records.push({
      recordId: `${chamber}:${geoid}`,
      chamber,
      geoid,
      geoidFq,
      stateFips: geoid.slice(0, 2),
      stateUsps,
      districtCode,
      sourceName: chamber === "congressional" ? null : publishedName,
      isUnassignedResidual: isUnassignedResidualCode(districtCode),
      landAreaSquareMeters,
      waterAreaSquareMeters,
      landAreaSquareMiles,
      waterAreaSquareMiles,
      interiorPoint: { latitude, longitude },
      evidence,
    });
  }

  return { records, defects };
}
