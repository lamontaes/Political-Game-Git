/**
 * Census government-unit identity: the government ID grammar and the government
 * type classification.
 *
 * A government unit is an *institution* the Census Bureau lists — a county,
 * municipal, township, special-district or school-district government, or a
 * state. It is not a Census place, not a county geography, and not a ZIP Code
 * (42A §1, "a Census government unit is not identical to an election-
 * administration unit, Census place, ZIP Code, or every named community").
 *
 * The values below are the Census Bureau's own documented classification and
 * the documented structure of its government identifier, not outputs of this
 * parser. They are the fixed public reference the normalizer and validator are
 * checked against; a grammar test that could only ever agree with the code that
 * produced it is not a test (mirrors counties/identity.ts and 13B N2).
 */

import { CENSUS_GOVERNMENT_ID_PATTERN } from "../../core/index";

/**
 * The five basic local-government categories plus the state government.
 *
 * 42A §1 records the five Census local-government categories — county,
 * municipal, township, special district, school district — as the canonical
 * classification. `STATE` is the sixth government kind the government-units
 * universe contains. There is deliberately no `FEDERAL` member: the Census of
 * Governments enumerates state and local governments, not the federal
 * government.
 */
export type GovernmentType =
  | "STATE"
  | "COUNTY"
  | "MUNICIPAL"
  | "TOWNSHIP"
  | "SPECIAL_DISTRICT"
  | "SCHOOL_DISTRICT";

/** The single digit at position 3 of a Census government ID. */
export type GovernmentTypeCode = "0" | "1" | "2" | "3" | "4" | "5";

/**
 * The government-type digit's meaning, as the Census government-ID layout
 * documents it. This mapping is the publisher's, not this domain's invention.
 */
export const GOVERNMENT_TYPE_BY_CODE: Readonly<
  Record<GovernmentTypeCode, GovernmentType>
> = {
  "0": "STATE",
  "1": "COUNTY",
  "2": "MUNICIPAL",
  "3": "TOWNSHIP",
  "4": "SPECIAL_DISTRICT",
  "5": "SCHOOL_DISTRICT",
};

/** The label a listing may print, mapped onto the classification. */
export const GOVERNMENT_TYPE_BY_LABEL: Readonly<
  Record<string, GovernmentType>
> = {
  State: "STATE",
  County: "COUNTY",
  "County government": "COUNTY",
  Municipal: "MUNICIPAL",
  "Municipal government": "MUNICIPAL",
  Township: "TOWNSHIP",
  "Township government": "TOWNSHIP",
  "Special District": "SPECIAL_DISTRICT",
  "Special district": "SPECIAL_DISTRICT",
  "Special district government": "SPECIAL_DISTRICT",
  "School District": "SCHOOL_DISTRICT",
  "School district": "SCHOOL_DISTRICT",
  "Independent school district": "SCHOOL_DISTRICT",
};

/**
 * The Census government identifier is a 14-digit code the Government Units
 * documentation decomposes into six components, by position:
 *
 *   1-2   Census state code
 *   3     government type
 *   4-6   county code
 *   7-9   unit code
 *   10-12 supplement code
 *   13-14 sub code
 *
 * The supplement code (positions 10-12) and the sub code (positions 13-14) are
 * two distinct official components, not one five-digit field: the Bureau uses
 * the sub code to distinguish otherwise-identical units, so collapsing the two
 * would let two different governments read as the same supplement. The digits
 * locate a unit within the Bureau's own numbering; they are not FIPS codes and
 * they are not a GEOID.
 */
export const GOVERNMENT_UNIT_GID_PATTERN = CENSUS_GOVERNMENT_ID_PATTERN;

export interface GovernmentIdParts {
  readonly stateCensusCode: string;
  readonly governmentTypeCode: GovernmentTypeCode;
  readonly countyCensusCode: string;
  readonly unitCensusCode: string;
  /** Positions 10-12: the supplement code, distinct from the sub code. */
  readonly supplementCensusCode: string;
  /** Positions 13-14: the sub code, distinct from the supplement code. */
  readonly subCensusCode: string;
}

/** True when a string is a well-formed 14-digit Census government ID. */
export function isGovernmentId(value: string): boolean {
  return GOVERNMENT_UNIT_GID_PATTERN.test(value);
}

/**
 * Split a government ID into its documented components.
 *
 * Returns `null` for anything that is not 14 digits or whose type digit is not
 * one the Bureau defines; the caller records that as a defect rather than
 * fabricating a component out of a malformed code.
 */
export function decomposeGovernmentId(gid: string): GovernmentIdParts | null {
  if (!GOVERNMENT_UNIT_GID_PATTERN.test(gid)) return null;
  const typeCode = gid[2] as string;
  if (!(typeCode in GOVERNMENT_TYPE_BY_CODE)) return null;
  return {
    stateCensusCode: gid.slice(0, 2),
    governmentTypeCode: typeCode as GovernmentTypeCode,
    countyCensusCode: gid.slice(3, 6),
    unitCensusCode: gid.slice(6, 9),
    supplementCensusCode: gid.slice(9, 12),
    subCensusCode: gid.slice(12, 14),
  };
}

/**
 * Reassemble the exact 14-digit government ID from its components.
 *
 * The concatenation is the inverse of `decomposeGovernmentId`: for any
 * well-formed ID, `reconstructGovernmentId(decomposeGovernmentId(id)) === id`.
 * It exists so the split of the supplement and sub codes is provably lossless —
 * neither component may be truncated or silently merged.
 */
export function reconstructGovernmentId(parts: GovernmentIdParts): string {
  return (
    parts.stateCensusCode +
    parts.governmentTypeCode +
    parts.countyCensusCode +
    parts.unitCensusCode +
    parts.supplementCensusCode +
    parts.subCensusCode
  );
}

/** The government type a well-formed ID's type digit denotes. */
export function governmentTypeOf(gid: string): GovernmentType | null {
  const parts = decomposeGovernmentId(gid);
  return parts ? GOVERNMENT_TYPE_BY_CODE[parts.governmentTypeCode] : null;
}

/**
 * Field names a government-identity record must never contain.
 *
 * A government-units record establishes that a government *exists* under an
 * identifier, with a name, a state, a type and a status. It establishes nothing
 * about what that government may do. Powers, home-rule authority, ordinance
 * procedure, partisan structure, officeholders, legislative authority, service
 * responsibilities and political importance are separate facts requiring
 * separate institutional-rule evidence, and this list is checked at runtime so
 * the prohibition is visible, not merely implied by the type (mirrors the value
 * algebra's "there is no field to read a zero out of").
 */
export const FORBIDDEN_GOVERNANCE_KEYS: readonly string[] = [
  "mayorPowers",
  "councilPowers",
  "homeRule",
  "homeRuleAuthority",
  "ordinanceProcedure",
  "partisanStructure",
  "partisanControl",
  "officeholders",
  "officeholder",
  "legislativeAuthority",
  "serviceResponsibilities",
  "services",
  "politicalImportance",
  "importance",
  "powers",
  "taxAuthority",
  "budget",
  "population",
];
