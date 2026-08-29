/**
 * Government Source Record Normalizer
 *
 * Transforms raw Census Bureau Government Units Survey (GUS) data,
 * Census of Governments organization records, and state datasets into
 * strictly validated, deterministic GovernmentSourceRecord entities.
 */

import {
  buildCensusGovId,
  createStableSourceId,
  getStateByPostal,
  isValidCensusGovId,
  parseCensusGovId,
} from "./census_id.js";
import type {
  CountyAssociation,
  GeographicIdentifiers,
  GovernmentActiveStatus,
  GovernmentClass,
  GovernmentFunctionCategory,
  GovernmentSourceRecord,
  PlaceAssociation,
  ProvenanceMetadata,
} from "./types.js";

export interface RawGovernmentUnitInput {
  readonly censusGovId?: string;
  readonly censusStateCode?: string;
  readonly typeCode?: string;
  readonly countyAreaCode?: string;
  readonly unitId?: string;
  readonly functionCode?: string;
  readonly subunitCode?: string;
  readonly officialName: string;
  readonly state: string;
  readonly stateFips?: string;
  readonly countyName?: string;
  readonly countyFips?: string;
  readonly placeName?: string;
  readonly placeFips?: string;
  readonly governmentType?: GovernmentClass;
  readonly governmentSubtype?: string;
  readonly functionCategory?: GovernmentFunctionCategory;
  readonly activeStatus?: GovernmentActiveStatus;
  readonly geoid?: string;
  readonly gnisId?: string;
  readonly areaSquareMiles?: number;
  readonly populationEstimate?: number;
  readonly sourceVintage?: string;
  readonly sourceProvenance?: Partial<ProvenanceMetadata>;
}

export const DEFAULT_PROVENANCE: ProvenanceMetadata = {
  sourceAgency: "U.S. Census Bureau",
  productTitle: "2022 Census of Governments: Government Units Survey (GUS)",
  sourceUrl: "https://www.census.gov/programs-surveys/gus.html",
  retrievalDate: "2024-01-01",
  contentHash: "sha256-census-gus-2022-org-v1",
  license: "U.S. Public Domain / CC0 Equivalent (17 U.S.C. § 105)",
  notes:
    "Authoritative local government units recognized by the U.S. Census Bureau.",
};

/**
 * Normalizes a raw government unit input into a canonical GovernmentSourceRecord.
 */
export function normalizeGovernmentRecord(
  input: RawGovernmentUnitInput,
): GovernmentSourceRecord {
  if (
    !input.officialName ||
    typeof input.officialName !== "string" ||
    !input.officialName.trim()
  ) {
    throw new Error(
      "Missing or invalid officialName in government record input.",
    );
  }

  const officialName = input.officialName.trim();
  const statePostal = input.state.trim().toUpperCase();
  const stateMapping = getStateByPostal(statePostal);
  if (!stateMapping) {
    throw new Error(`Invalid state postal code: "${input.state}"`);
  }

  let censusGovId = input.censusGovId?.trim();
  if (!censusGovId) {
    if (
      !input.countyAreaCode ||
      !input.unitId ||
      (!input.typeCode && !input.governmentType)
    ) {
      throw new Error(
        `Cannot derive Census Gov ID for "${officialName}" without censusGovId or (countyAreaCode, unitId, typeCode/governmentType).`,
      );
    }
    const censusStateCode = input.censusStateCode ?? stateMapping.censusCode;
    let typeCode = input.typeCode;
    if (!typeCode && input.governmentType) {
      switch (input.governmentType) {
        case "state":
          typeCode = "1";
          break;
        case "county":
          typeCode = "2";
          break;
        case "municipal":
          typeCode = "3";
          break;
        case "township":
          typeCode = "4";
          break;
        case "special_district":
          typeCode = "5";
          break;
        case "school_district":
          typeCode = "6";
          break;
        case "federal":
          typeCode = "0";
          break;
      }
    }
    censusGovId = buildCensusGovId({
      censusStateCode,
      typeCode: typeCode ?? "5",
      countyAreaCode: input.countyAreaCode,
      unitId: input.unitId,
      functionCode: input.functionCode,
      subunitCode: input.subunitCode,
    });
  }

  if (!isValidCensusGovId(censusGovId)) {
    throw new Error(
      `Constructed/provided Census Gov ID "${censusGovId}" is invalid.`,
    );
  }

  const parsed = parseCensusGovId(censusGovId);
  const stableSourceId = createStableSourceId(censusGovId);
  const governmentType = input.governmentType ?? parsed.governmentType;
  const functionCategory = input.functionCategory ?? parsed.functionCategory;
  const activeStatus = input.activeStatus ?? "active";
  const sourceVintage = input.sourceVintage ?? "2022 Census of Governments";

  let countyAssociation: CountyAssociation | undefined;
  if (input.countyName || input.countyFips) {
    const fipsCountyCode = (input.countyFips ?? parsed.countyAreaCode).padStart(
      3,
      "0",
    );
    countyAssociation = {
      countyName: input.countyName ?? `County ${fipsCountyCode}`,
      countyFips: `${stateMapping.fips}${fipsCountyCode}`,
      fipsCountyCode,
    };
  }

  let placeAssociation: PlaceAssociation | undefined;
  if (input.placeName || input.placeFips) {
    placeAssociation = {
      placeName: input.placeName ?? officialName,
      placeFips: input.placeFips,
    };
  }

  const geographicIdentifiers: GeographicIdentifiers = {
    fipsState: stateMapping.fips,
    fipsCounty: countyAssociation?.countyFips,
    fipsPlace: placeAssociation?.placeFips,
    censusStateCode: parsed.censusStateCode,
    censusTypeCode: parsed.typeCode,
    censusCountyCode: parsed.countyAreaCode,
    censusUnitId: parsed.unitId,
    geoid: input.geoid,
    gnisId: input.gnisId,
    areaSquareMiles: input.areaSquareMiles,
    populationEstimate: input.populationEstimate,
  };

  const sourceProvenance: ProvenanceMetadata = {
    sourceAgency:
      input.sourceProvenance?.sourceAgency ?? DEFAULT_PROVENANCE.sourceAgency,
    productTitle:
      input.sourceProvenance?.productTitle ?? DEFAULT_PROVENANCE.productTitle,
    sourceUrl:
      input.sourceProvenance?.sourceUrl ?? DEFAULT_PROVENANCE.sourceUrl,
    retrievalDate:
      input.sourceProvenance?.retrievalDate ?? DEFAULT_PROVENANCE.retrievalDate,
    contentHash:
      input.sourceProvenance?.contentHash ?? DEFAULT_PROVENANCE.contentHash,
    license: input.sourceProvenance?.license ?? DEFAULT_PROVENANCE.license,
    notes: input.sourceProvenance?.notes ?? DEFAULT_PROVENANCE.notes,
  };

  return {
    stableSourceId,
    censusGovId,
    officialName,
    state: stateMapping.postal,
    stateFips: stateMapping.fips,
    countyAssociation,
    placeAssociation,
    governmentType,
    governmentSubtype: input.governmentSubtype,
    functionCategory,
    functionCode: parsed.functionCode,
    activeStatus,
    geographicIdentifiers,
    sourceVintage,
    sourceProvenance,
  };
}

/**
 * Normalizes an array of raw government unit inputs and enforces ID uniqueness.
 */
export function normalizeGovernmentUniverse(
  rawInputs: readonly RawGovernmentUnitInput[],
): readonly GovernmentSourceRecord[] {
  const seenStableIds = new Set<string>();
  const seenCensusGovIds = new Set<string>();
  const normalized: GovernmentSourceRecord[] = [];

  for (const raw of rawInputs) {
    const record = normalizeGovernmentRecord(raw);

    if (seenStableIds.has(record.stableSourceId)) {
      throw new Error(
        `Duplicate stable source ID detected during normalization: "${record.stableSourceId}" for entity "${record.officialName}".`,
      );
    }
    if (seenCensusGovIds.has(record.censusGovId)) {
      throw new Error(
        `Duplicate Census Government ID detected during normalization: "${record.censusGovId}" for entity "${record.officialName}".`,
      );
    }

    seenStableIds.add(record.stableSourceId);
    seenCensusGovIds.add(record.censusGovId);
    normalized.push(record);
  }

  // Sort deterministically by stableSourceId
  normalized.sort((a, b) => a.stableSourceId.localeCompare(b.stableSourceId));

  return normalized;
}
