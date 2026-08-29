import { computeSha256 } from "./sha256";
import type {
  AcsEstimateRecord,
  AcsUniverseId,
  AcsVariableDefinition,
  AcsVintage,
  CommunityBaselineDataset,
  GeographyId,
  GeographyRef,
  SourceMetadata,
  SuppressionReason,
} from "./types";
import {
  ACS_VARIABLE_MAP,
  ACS_VARIABLE_REGISTRY,
  requireAcsVariable,
} from "./variables";
import {
  createBlockGroupGeographyId,
  createCongressionalDistrictGeographyId,
  createCountyGeographyId,
  createNationGeographyId,
  createPlaceGeographyId,
  createStateGeographyId,
  createTractGeographyId,
  parseGeographyId,
} from "./geography";

export interface RawCensusTableRow {
  headers: string[];
  values: (string | number | null)[];
}

export interface RawCensusDatasetInput {
  vintage: AcsVintage;
  tableId: string;
  sourceEndpoint: string;
  retrievalDate: string;
  asOfDate: string;
  rows: RawCensusTableRow[];
  reviewStatus?: "placeholder" | "candidate" | "approved";
}

export interface RawCensusApiResponse {
  vintage: AcsVintage;
  endpoint: string;
  data: (string | null)[][];
  retrievalDate: string;
  asOfDate: string;
  reviewStatus?: "placeholder" | "candidate" | "approved";
}

export interface ParseValueResult {
  estimate: number | null;
  marginOfError: number | null;
  suppressionReason: SuppressionReason | null;
  moeAnnotation: string | null;
}

export const CENSUS_SPECIAL_ESTIMATE_CODES: Record<string, SuppressionReason> =
  {
    "-666666666": "controlled_estimate",
    "-999999999": "suppressed_for_privacy",
    "-555555555": "insufficient_sample",
    "-222222222": "too_small",
  };

export const CENSUS_SPECIAL_MOE_CODES: Record<string, string> = {
  "-666666666": "controlled-estimate",
  "-888888888": "open-ended-interval",
  "-999999999": "suppressed",
  "-555555555": "insufficient-sample",
  "-333333333": "not-applicable",
  "-222222222": "too-small",
  "*****": "controlled-estimate",
  N: "not-available",
  "(X)": "not-applicable",
};

export function parseCensusEstimate(
  rawVal: string | number | null | undefined,
): {
  estimate: number | null;
  suppressionReason: SuppressionReason | null;
} {
  if (rawVal === null || rawVal === undefined) {
    return { estimate: null, suppressionReason: "missing_from_source" };
  }
  const str = String(rawVal).trim();
  if (
    str === "" ||
    str === "null" ||
    str === "N" ||
    str === "(X)" ||
    str === "*****" ||
    str === "-"
  ) {
    return { estimate: null, suppressionReason: "missing_from_source" };
  }

  const special = CENSUS_SPECIAL_ESTIMATE_CODES[str];
  if (special) {
    return { estimate: null, suppressionReason: special };
  }

  const num = Number(str);
  if (Number.isNaN(num)) {
    return { estimate: null, suppressionReason: "missing_from_source" };
  }

  if (num < -1000000) {
    return { estimate: null, suppressionReason: "suppressed_for_privacy" };
  }

  return { estimate: num, suppressionReason: null };
}

export function parseCensusMoe(rawVal: string | number | null | undefined): {
  marginOfError: number | null;
  moeAnnotation: string | null;
} {
  if (rawVal === null || rawVal === undefined) {
    return { marginOfError: null, moeAnnotation: "missing-from-source" };
  }
  const str = String(rawVal).trim();
  if (
    str === "" ||
    str === "null" ||
    str === "N" ||
    str === "(X)" ||
    str === "*****" ||
    str === "-"
  ) {
    const annot = CENSUS_SPECIAL_MOE_CODES[str] || "missing-from-source";
    return { marginOfError: null, moeAnnotation: annot };
  }

  const special = CENSUS_SPECIAL_MOE_CODES[str];
  if (special) {
    return { marginOfError: null, moeAnnotation: special };
  }

  const num = Number(str);
  if (Number.isNaN(num)) {
    return { marginOfError: null, moeAnnotation: "invalid-number" };
  }

  if (num < 0) {
    return { marginOfError: null, moeAnnotation: `special-code-${str}` };
  }

  return { marginOfError: num, moeAnnotation: null };
}

export function extractGeographyIdFromRow(
  headers: string[],
  rowValues: (string | number | null)[],
): GeographyId {
  const getVal = (col: string): string | undefined => {
    const idx = headers.indexOf(col);
    if (idx === -1) return undefined;
    const v = rowValues[idx];
    return v !== null && v !== undefined ? String(v).trim() : undefined;
  };

  const us = getVal("us");
  const state = getVal("state");
  const county = getVal("county");
  const place = getVal("place");
  const tract = getVal("tract");
  const blockGroup = getVal("block group");
  const cd = getVal("congressional district");

  if (us === "1" && !state) {
    return createNationGeographyId();
  }

  if (state && county && tract && blockGroup) {
    return createBlockGroupGeographyId(state, county, tract, blockGroup);
  }

  if (state && county && tract) {
    return createTractGeographyId(state, county, tract);
  }

  if (state && place) {
    return createPlaceGeographyId(state, place);
  }

  if (state && county) {
    return createCountyGeographyId(state, county);
  }

  if (state && cd) {
    return createCongressionalDistrictGeographyId(state, cd);
  }

  if (state) {
    return createStateGeographyId(state);
  }

  const geoIdHeader = getVal("GEO_ID") || getVal("geoid") || getVal("id");
  if (geoIdHeader && geoIdHeader.startsWith("geo:")) {
    return geoIdHeader as GeographyId;
  }

  throw new Error(
    `Unable to extract geography ID from Census row with headers: [${headers.join(", ")}] and values: [${rowValues.join(", ")}]`,
  );
}

export function computeSumEstimateAndMoe(
  components: { estimate: number | null; marginOfError: number | null }[],
): {
  estimate: number | null;
  marginOfError: number | null;
  suppressionReason: SuppressionReason | null;
  moeAnnotation: string | null;
} {
  let sum = 0;
  let hasValidEstimate = false;
  let sumSquaredMoe = 0;
  let hasNullMoe = false;

  for (const comp of components) {
    if (comp.estimate === null) {
      return {
        estimate: null,
        marginOfError: null,
        suppressionReason: "insufficient_sample",
        moeAnnotation: "component-suppressed",
      };
    }
    sum += comp.estimate;
    hasValidEstimate = true;

    if (comp.marginOfError === null) {
      hasNullMoe = true;
    } else {
      sumSquaredMoe += comp.marginOfError * comp.marginOfError;
    }
  }

  if (!hasValidEstimate) {
    return {
      estimate: null,
      marginOfError: null,
      suppressionReason: "missing_from_source",
      moeAnnotation: "missing",
    };
  }

  const propagatedMoe = hasNullMoe
    ? null
    : Math.round(Math.sqrt(sumSquaredMoe) * 100) / 100;
  const moeAnnotation = hasNullMoe ? "component-moe-unavailable" : null;

  return {
    estimate: sum,
    marginOfError: propagatedMoe,
    suppressionReason: null,
    moeAnnotation,
  };
}

export function buildCompositeVariableRecords(
  geoId: GeographyId,
  vintage: AcsVintage,
  metadata: SourceMetadata,
  rawMap: Map<
    string,
    { estimate: number | null; marginOfError: number | null }
  >,
): AcsEstimateRecord[] {
  const getComp = (key: string) =>
    rawMap.get(key) || { estimate: null, marginOfError: null };
  const records: AcsEstimateRecord[] = [];

  const addComposite = (varDef: AcsVariableDefinition, compKeys: string[]) => {
    const comps = compKeys.map(getComp);
    const res = computeSumEstimateAndMoe(comps);
    records.push({
      variableId: varDef.id,
      tableId: varDef.tableId,
      universeId: varDef.universeId,
      geographyId: geoId,
      vintage,
      estimate: res.estimate,
      marginOfError: res.marginOfError,
      suppressionReason: res.suppressionReason,
      moeAnnotation: res.moeAnnotation,
      sourceMetadata: metadata,
    });
  };

  // Age Groups (from B01001 Male 003..025 + Female 027..049)
  addComposite(requireAcsVariable("AGE_UNDER_5"), ["B01001_003", "B01001_027"]);
  addComposite(requireAcsVariable("AGE_5_TO_17"), [
    "B01001_004",
    "B01001_005",
    "B01001_006",
    "B01001_028",
    "B01001_029",
    "B01001_030",
  ]);
  addComposite(requireAcsVariable("AGE_18_TO_24"), [
    "B01001_007",
    "B01001_008",
    "B01001_009",
    "B01001_010",
    "B01001_011",
    "B01001_031",
    "B01001_032",
    "B01001_033",
    "B01001_034",
    "B01001_035",
  ]);
  addComposite(requireAcsVariable("AGE_25_TO_44"), [
    "B01001_012",
    "B01001_013",
    "B01001_014",
    "B01001_036",
    "B01001_037",
    "B01001_038",
  ]);
  addComposite(requireAcsVariable("AGE_45_TO_64"), [
    "B01001_015",
    "B01001_016",
    "B01001_017",
    "B01001_018",
    "B01001_019",
    "B01001_039",
    "B01001_040",
    "B01001_041",
    "B01001_042",
    "B01001_043",
  ]);
  addComposite(requireAcsVariable("AGE_65_AND_OVER"), [
    "B01001_020",
    "B01001_021",
    "B01001_022",
    "B01001_023",
    "B01001_024",
    "B01001_025",
    "B01001_044",
    "B01001_045",
    "B01001_046",
    "B01001_047",
    "B01001_048",
    "B01001_049",
  ]);

  // Education Groups (from B15003)
  addComposite(requireAcsVariable("EDU_LESS_THAN_HS"), [
    "B15003_002",
    "B15003_003",
    "B15003_004",
    "B15003_005",
    "B15003_006",
    "B15003_007",
    "B15003_008",
    "B15003_009",
    "B15003_010",
    "B15003_011",
    "B15003_012",
    "B15003_013",
    "B15003_014",
    "B15003_015",
    "B15003_016",
  ]);
  addComposite(requireAcsVariable("EDU_HS_GRAD"), ["B15003_017", "B15003_018"]);
  addComposite(requireAcsVariable("EDU_SOME_COLLEGE_OR_ASSOC"), [
    "B15003_019",
    "B15003_020",
    "B15003_021",
  ]);
  addComposite(requireAcsVariable("EDU_GRAD_OR_PROF"), [
    "B15003_023",
    "B15003_024",
    "B15003_025",
  ]);

  // Income Brackets (from B19001)
  addComposite(requireAcsVariable("INC_UNDER_25K"), [
    "B19001_002",
    "B19001_003",
    "B19001_004",
    "B19001_005",
  ]);
  addComposite(requireAcsVariable("INC_25K_TO_49K"), [
    "B19001_006",
    "B19001_007",
    "B19001_008",
    "B19001_009",
    "B19001_010",
  ]);
  addComposite(requireAcsVariable("INC_50K_TO_74K"), [
    "B19001_011",
    "B19001_012",
  ]);
  addComposite(requireAcsVariable("INC_75K_TO_99K"), ["B19001_013"]);
  addComposite(requireAcsVariable("INC_100K_TO_149K"), ["B19001_014"]);
  addComposite(requireAcsVariable("INC_150K_TO_199K"), ["B19001_015"]);
  addComposite(requireAcsVariable("INC_200K_PLUS"), [
    "B19001_016",
    "B19001_017",
  ]);

  // Occupation (from C24010)
  addComposite(requireAcsVariable("OCC_MGMT_BIZ_SCI_ARTS"), [
    "C24010_002",
    "C24010_038",
  ]);
  addComposite(requireAcsVariable("OCC_SERVICE"), ["C24010_019", "C24010_055"]);
  addComposite(requireAcsVariable("OCC_SALES_OFFICE"), [
    "C24010_027",
    "C24010_063",
  ]);
  addComposite(requireAcsVariable("OCC_NAT_CONST_MAINT"), [
    "C24010_030",
    "C24010_066",
  ]);
  addComposite(requireAcsVariable("OCC_PROD_TRANS_MATERIAL"), [
    "C24010_034",
    "C24010_070",
  ]);

  // Commute (from B08301)
  addComposite(requireAcsVariable("COMMUTE_DRIVE_ALONE"), ["B08301_003"]);
  addComposite(requireAcsVariable("COMMUTE_CARPOOL"), ["B08301_004"]);
  addComposite(requireAcsVariable("COMMUTE_PUBLIC_TRANSIT"), ["B08301_010"]);
  addComposite(requireAcsVariable("COMMUTE_WALK"), ["B08301_018"]);
  addComposite(requireAcsVariable("COMMUTE_OTHER_MEANS"), [
    "B08301_019",
    "B08301_020",
  ]);
  addComposite(requireAcsVariable("COMMUTE_WORKED_FROM_HOME"), ["B08301_021"]);

  // Disability (from B18101)
  addComposite(requireAcsVariable("DISABILITY_WITH"), [
    "B18101_004",
    "B18101_007",
    "B18101_010",
    "B18101_013",
    "B18101_016",
    "B18101_019",
    "B18101_023",
    "B18101_026",
    "B18101_029",
    "B18101_032",
    "B18101_035",
    "B18101_038",
  ]);
  addComposite(requireAcsVariable("DISABILITY_WITHOUT"), [
    "B18101_005",
    "B18101_008",
    "B18101_011",
    "B18101_014",
    "B18101_017",
    "B18101_020",
    "B18101_024",
    "B18101_027",
    "B18101_030",
    "B18101_033",
    "B18101_036",
    "B18101_039",
  ]);

  // Citizenship & Nativity (from B05001)
  addComposite(requireAcsVariable("CITIZEN_NATIVE_BORN_US"), ["B05001_002"]);
  addComposite(requireAcsVariable("CITIZEN_NATIVE_BORN_PR_ISLANDS"), [
    "B05001_003",
  ]);
  addComposite(requireAcsVariable("CITIZEN_NATIVE_BORN_ABROAD"), [
    "B05001_004",
  ]);
  addComposite(requireAcsVariable("CITIZEN_NATURALIZED"), ["B05001_005"]);
  addComposite(requireAcsVariable("NOT_A_US_CITIZEN"), ["B05001_006"]);

  // Race & Hispanic Origin (from B03002)
  addComposite(requireAcsVariable("RACE_WHITE_ALONE_NON_HISPANIC"), [
    "B03002_003",
  ]);
  addComposite(requireAcsVariable("RACE_BLACK_ALONE_NON_HISPANIC"), [
    "B03002_004",
  ]);
  addComposite(requireAcsVariable("RACE_AIAN_ALONE_NON_HISPANIC"), [
    "B03002_005",
  ]);
  addComposite(requireAcsVariable("RACE_ASIAN_ALONE_NON_HISPANIC"), [
    "B03002_006",
  ]);
  addComposite(requireAcsVariable("RACE_NHOPI_ALONE_NON_HISPANIC"), [
    "B03002_007",
  ]);
  addComposite(requireAcsVariable("RACE_SOME_OTHER_ALONE_NON_HISPANIC"), [
    "B03002_008",
  ]);
  addComposite(requireAcsVariable("RACE_TWO_OR_MORE_NON_HISPANIC"), [
    "B03002_009",
  ]);
  addComposite(requireAcsVariable("HISPANIC_OR_LATINO_ANY_RACE"), [
    "B03002_012",
  ]);

  return records;
}

export function compileAcsCommunityBaselines(
  inputs: (RawCensusDatasetInput | RawCensusApiResponse)[],
  options: {
    datasetId?: string;
    vintage: AcsVintage;
    asOfDate?: string;
    retrievalDate?: string;
    license?: string;
    reviewStatus?: "placeholder" | "candidate" | "approved";
  },
): CommunityBaselineDataset {
  const targetVintage = options.vintage;
  const asOfDate = options.asOfDate || `${targetVintage}-12-31`;
  const retrievalDate =
    options.retrievalDate ||
    (inputs.length > 0 && inputs[0] && "retrievalDate" in inputs[0]
      ? inputs[0].retrievalDate
      : `${targetVintage}-12-31T23:59:59.000Z`);
  const license =
    options.license || "U.S. Government Public Domain (17 U.S.C. 105)";
  const reviewStatus = options.reviewStatus || "candidate";

  const sharedMetadata: SourceMetadata = {
    sourceAgency: "U.S. Census Bureau",
    datasetSeries: "American Community Survey 5-Year Estimates",
    apiEndpoint: `https://api.census.gov/data/${targetVintage}/acs/acs5`,
    vintage: targetVintage,
    asOfDate,
    retrievalDate,
    license,
    citation: `U.S. Census Bureau, ${targetVintage} American Community Survey 5-Year Estimates.`,
    reviewStatus,
  };

  // Intermediate store: Map<GeographyId, Map<string, { estimate, marginOfError, suppressionReason, moeAnnotation, tableId, universeId }>>
  const geoRecordMap = new Map<
    GeographyId,
    Map<
      string,
      {
        estimate: number | null;
        marginOfError: number | null;
        suppressionReason: SuppressionReason | null;
        moeAnnotation: string | null;
        tableId: string;
        universeId: AcsUniverseId;
      }
    >
  >();

  const geographyRefs = new Map<GeographyId, GeographyRef>();

  // Process all input batches
  for (const input of inputs) {
    if (input.vintage !== targetVintage) {
      throw new Error(
        `Vintage mismatch in compiler input: expected vintage ${targetVintage}, but received input with vintage ${input.vintage}. Silent mixing of different ACS vintages is forbidden.`,
      );
    }

    let headers: string[];
    let rows: (string | number | null)[][];

    if ("data" in input) {
      if (input.data.length < 2) continue;
      headers = input.data[0]?.map((h) => String(h || "")) ?? [];
      rows = input.data.slice(1);
    } else {
      if (input.rows.length === 0) continue;
      headers = input.rows[0]?.headers ?? [];
      rows = input.rows.map((r) => r.values);
    }

    for (const rowValues of rows) {
      const geoId = extractGeographyIdFromRow(headers, rowValues);
      if (!geographyRefs.has(geoId)) {
        geographyRefs.set(geoId, parseGeographyId(geoId));
      }

      if (!geoRecordMap.has(geoId)) {
        geoRecordMap.set(geoId, new Map());
      }
      const varMap = geoRecordMap.get(geoId)!;

      // Match columns to variable registry
      for (let c = 0; c < headers.length; c++) {
        const header = headers[c];
        if (!header) continue;
        if (header.endsWith("E")) {
          const baseVarCode = header.slice(0, -1);
          const moeHeader = `${baseVarCode}M`;
          const moeColIdx = headers.indexOf(moeHeader);

          const rawEst = rowValues[c];
          const rawMoe = moeColIdx !== -1 ? rowValues[moeColIdx] : null;

          const estParsed = parseCensusEstimate(rawEst);
          const moeParsed = parseCensusMoe(rawMoe);

          const tableId = baseVarCode.split("_")[0] ?? baseVarCode;
          const varDef = ACS_VARIABLE_MAP.get(baseVarCode);
          const universeId: AcsUniverseId = varDef
            ? varDef.universeId
            : "total_population";

          varMap.set(baseVarCode, {
            estimate: estParsed.estimate,
            marginOfError: moeParsed.marginOfError,
            suppressionReason: estParsed.suppressionReason,
            moeAnnotation: moeParsed.moeAnnotation,
            tableId,
            universeId,
          });
        }
      }
    }
  }

  const finalRecords: AcsEstimateRecord[] = [];

  // Build final records for each geography
  const sortedGeoIds = Array.from(geoRecordMap.keys()).sort();

  for (const geoId of sortedGeoIds) {
    const rawMap = geoRecordMap.get(geoId)!;

    // 1. Direct registry variables
    for (const varDef of ACS_VARIABLE_REGISTRY) {
      const direct = rawMap.get(varDef.id);
      if (direct) {
        finalRecords.push({
          variableId: varDef.id,
          tableId: varDef.tableId,
          universeId: varDef.universeId,
          geographyId: geoId,
          vintage: targetVintage,
          estimate: direct.estimate,
          marginOfError: direct.marginOfError,
          suppressionReason: direct.suppressionReason,
          moeAnnotation: direct.moeAnnotation,
          sourceMetadata: sharedMetadata,
        });
      }
    }

    // 2. Composite variables (e.g. AGE groups, EDU groups, INC brackets, OCC groups, CITIZEN groups, RACE groups)
    const compositeRecords = buildCompositeVariableRecords(
      geoId,
      targetVintage,
      sharedMetadata,
      rawMap,
    );

    for (const compRec of compositeRecords) {
      // Avoid duplicate if direct record was already present
      if (
        !finalRecords.some(
          (r) => r.geographyId === geoId && r.variableId === compRec.variableId,
        )
      ) {
        finalRecords.push(compRec);
      }
    }
  }

  // Deterministically sort records: geographyId -> variableId
  finalRecords.sort((a, b) => {
    if (a.geographyId !== b.geographyId)
      return a.geographyId.localeCompare(b.geographyId);
    return a.variableId.localeCompare(b.variableId);
  });

  const datasetId =
    options.datasetId || `community-baselines-${targetVintage}-acs5`;

  const datasetWithoutSha: Omit<CommunityBaselineDataset, "sha256"> = {
    schemaVersion: "community-baselines:v1",
    datasetId,
    vintage: targetVintage,
    geographies: Array.from(geographyRefs.values()).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    records: finalRecords,
    metadata: sharedMetadata,
  };

  const serialized = JSON.stringify(datasetWithoutSha, null, 2);
  const sha256 = computeSha256(serialized);

  return {
    ...datasetWithoutSha,
    sha256,
  };
}
