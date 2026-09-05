/**
 * Listing rows into government-identity records.
 *
 * The rules here are the whole point of the domain, so each is explicit:
 *
 *  - The government type is derived from the ID's own type digit, which is the
 *    Bureau's authoritative classification. A `government_type` label, if the
 *    row carries one, is cross-checked against that digit and a disagreement is
 *    a defect, never a silent override.
 *  - A status is read as the source states it. `ACTIVE` and `INACTIVE` are both
 *    values; a blank status is `UNKNOWN` and carries no value, because the
 *    listing not saying is not the same as the listing saying "inactive".
 *  - Every crosswalk starts unresolved. A place GEOID or county GEOID becomes a
 *    `KNOWN` link only when the source row supplies it; otherwise the link is
 *    `UNKNOWN` where it is applicable and `NOT_APPLICABLE` where it is not. A
 *    government is never matched to a place or a county by name.
 *  - Nothing about the government's powers is read, because there is no field
 *    to read it into.
 *
 * A duplicate government ID is a hard error: an identifier that is not unique is
 * not an identifier.
 */

import {
  SourceValidationError,
  known,
  notApplicable,
  unknown,
} from "../../core/index";
import type { Evidence, ParseDefect, Sourced } from "../../core/index";
import { listingField } from "./parse";
import type { DelimitedRow } from "../../core/index";
import {
  GOVERNMENT_TYPE_BY_CODE,
  GOVERNMENT_TYPE_BY_LABEL,
  decomposeGovernmentId,
} from "./identity";
import type { GovernmentType } from "./identity";
import type { GovernmentUnitCrosswalk, GovernmentUnitRecord } from "./types";

export interface GovernmentUnitsNormalizeResult {
  readonly records: readonly GovernmentUnitRecord[];
  readonly defects: readonly ParseDefect[];
}

/** A place crosswalk is meaningful for a place-like government, not for others. */
function placeCrosswalkApplies(type: GovernmentType): boolean {
  return type === "MUNICIPAL" || type === "TOWNSHIP";
}

function buildCrosswalk(
  type: GovernmentType,
  countyCensusCode: string,
  placeGeoid: string,
  countyGeoid: string,
  evidence: Evidence,
  asOf: string,
): GovernmentUnitCrosswalk {
  const censusPlace: Sourced<string> = placeGeoid
    ? known(placeGeoid, [evidence], "FINAL", asOf)
    : placeCrosswalkApplies(type)
      ? unknown(
          "The Government Units listing publishes no Census place GEOID for this government. A place is not a government, and matching one to the other by name alone is prohibited.",
          [evidence],
        )
      : notApplicable(
          [evidence],
          `A ${type} government is not a Census place, so a place crosswalk is not applicable to it.`,
        );

  const countyOrEquivalent: Sourced<string> = countyGeoid
    ? known(countyGeoid, [evidence], "FINAL", asOf)
    : countyCensusCode === "000"
      ? notApplicable(
          [evidence],
          "The government ID carries county code 000, denoting a statewide or multi-county unit not situated in a single county.",
        )
      : unknown(
          "The listing supplies a Census county code, not a county GEOID; the Census-code-to-GEOID crosswalk is not yet an acquired artifact, so the county-geography link is preserved as unresolved rather than inferred.",
          [evidence],
        );

  const schoolDistrictGeography: Sourced<string> =
    type === "SCHOOL_DISTRICT"
      ? unknown(
          "No school-district geography crosswalk artifact has been acquired; the link is preserved as unresolved.",
          [evidence],
        )
      : notApplicable(
          [evidence],
          `A ${type} government is not a school district, so a school-district geography crosswalk is not applicable to it.`,
        );

  const specialDistrictGeography: Sourced<string> =
    type === "SPECIAL_DISTRICT"
      ? unknown(
          "No special-district geography crosswalk artifact has been acquired; the link is preserved as unresolved.",
          [evidence],
        )
      : notApplicable(
          [evidence],
          `A ${type} government is not a special district, so a special-district geography crosswalk is not applicable to it.`,
        );

  return {
    censusPlace,
    countyOrEquivalent,
    schoolDistrictGeography,
    specialDistrictGeography,
  };
}

/** Read one status string into a sourced active flag. */
function readActive(
  status: string,
  evidence: Evidence,
  asOf: string,
): Sourced<boolean> {
  const normalized = status.trim().toUpperCase();
  switch (normalized) {
    case "ACTIVE":
      return known(true, [evidence], "FINAL", asOf);
    case "INACTIVE":
      return known(false, [evidence], "FINAL", asOf);
    case "":
      return unknown(
        "The listing row supplies no status, so whether this unit is currently an active government is not established.",
        [evidence],
      );
    default:
      return unknown(
        `The listing row carries status "${status}", which is neither ACTIVE nor INACTIVE; the active state is left unresolved rather than guessed.`,
        [evidence],
      );
  }
}

export function normalizeGovernmentUnits(
  rows: readonly DelimitedRow[],
  artifactId: string,
  asOf: string,
): GovernmentUnitsNormalizeResult {
  const records: GovernmentUnitRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const gid = listingField(row, "government_id");
    const name = listingField(row, "government_name");
    const stateUsps = listingField(row, "state_usps").toUpperCase();
    const stateFipsRaw = listingField(row, "state_fips");
    const typeLabel = listingField(row, "government_type");
    const status = listingField(row, "status");
    const vintage = listingField(row, "vintage");
    const placeGeoid = listingField(row, "census_place_geoid");
    const countyGeoid = listingField(row, "county_geoid");

    const parts = decomposeGovernmentId(gid);
    if (!parts) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${gid}" is not a well-formed 14-digit Census government ID with a known type digit.`,
      });
      continue;
    }
    if (!/^[A-Z]{2}$/.test(stateUsps)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: "${stateUsps}" is not a two-letter USPS state code.`,
      });
      continue;
    }
    if (name.trim() === "") {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: government ${gid} has no name.`,
      });
      continue;
    }
    if (!/^\d{4}$/.test(vintage)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: government ${gid} carries reference year "${vintage}", which is not a four-digit year.`,
      });
      continue;
    }

    const governmentType = GOVERNMENT_TYPE_BY_CODE[parts.governmentTypeCode];
    if (typeLabel.trim() !== "") {
      const labelType = GOVERNMENT_TYPE_BY_LABEL[typeLabel];
      if (!labelType) {
        defects.push({
          kind: "unparsable-record",
          line: row.line,
          message: `Line ${row.line}: government ${gid} carries type label "${typeLabel}", which is not a Census government type.`,
        });
        continue;
      }
      if (labelType !== governmentType) {
        defects.push({
          kind: "unparsable-record",
          line: row.line,
          message: `Line ${row.line}: government ${gid} has type digit ${parts.governmentTypeCode} (${governmentType}) but a label of "${typeLabel}" (${labelType}). The ID and the label disagree.`,
        });
        continue;
      }
    }

    const stateFips = /^\d{2}$/.test(stateFipsRaw) ? stateFipsRaw : null;

    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "delimited-row",
        artifactId,
        line: row.line,
        column: "government_id",
      },
    };

    records.push({
      censusGovernmentId: gid,
      stateCensusCode: parts.stateCensusCode,
      governmentTypeCode: parts.governmentTypeCode,
      countyCensusCode: parts.countyCensusCode,
      unitCensusCode: parts.unitCensusCode,
      supplementCensusCode: parts.supplementCensusCode,
      governmentType,
      name,
      stateUsps,
      stateFips,
      active: readActive(status, evidence, asOf),
      parentStateRelationship: known(stateUsps, [evidence], "FINAL", asOf),
      crosswalk: buildCrosswalk(
        governmentType,
        parts.countyCensusCode,
        placeGeoid,
        countyGeoid,
        evidence,
        asOf,
      ),
      sourceVintage: vintage,
      evidence,
    });
  }

  records.sort((left, right) =>
    left.censusGovernmentId < right.censusGovernmentId
      ? -1
      : left.censusGovernmentId > right.censusGovernmentId
        ? 1
        : 0,
  );

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.censusGovernmentId)) {
      throw new SourceValidationError(
        `The Government Units listing yields government ID "${record.censusGovernmentId}" twice; a government identifier that is not unique is not an identifier.`,
      );
    }
    seen.add(record.censusGovernmentId);
  }

  return { records, defects };
}
