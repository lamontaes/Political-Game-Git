/**
 * Manifest Generation Engine for U.S. Government-Universe
 *
 * Generates authoritative summary manifests:
 * 1. National Universe Manifest
 * 2. State Universe Manifest
 * 3. Type Classification Manifest
 * 4. Special Districts Functional Manifest
 * 5. School Systems Structure Manifest
 * 6. Historical Count Series Manifest
 */

import { sha256Hex } from "./sha256.js";
import type {
  FunctionalSpecialDistrictsManifest,
  HistoricalCountSeriesManifest,
  NationalUniverseManifest,
  SchoolSystemsManifest,
  SchoolSystemStateDetail,
  StateUniverseManifest,
  TypeClassificationManifest,
} from "./types.js";
import {
  HISTORICAL_COUNT_SERIES,
  SPECIAL_DISTRICT_FUNCTION_SUMMARIES,
  STATE_GOVERNMENT_SUMMARIES,
} from "./universe_data.js";

function computeSha256(payload: unknown): string {
  const serialized = JSON.stringify(payload);
  return sha256Hex(serialized);
}

export function generateNationalUniverseManifest(
  generatedAt: string = new Date().toISOString(),
): NationalUniverseManifest {
  const base = {
    schemaVersion: "1.0.0" as const,
    generatedAt,
    sourceVintage: "2022 Census of Governments",
    totalGovernmentsNationally: 90888,
    stateGovernmentsNationally: 50,
    localGovernmentsNationally: 90838,
    byClass: {
      county: 3031,
      municipal: 19492,
      township: 16253,
      special_district: 39558,
      school_district: 12504,
      state: 50,
      federal: 1,
    },
    schoolSystems: {
      independentSchoolDistricts: 12504,
      dependentSchoolSystemsTotal: 1327,
      countyDependent: 377,
      municipalDependent: 198,
      townshipDependent: 727,
      stateDependent: 25,
      allOperatingPublicSchoolSystems: 13831,
    },
  };

  const sha256 = computeSha256(base);
  return { ...base, sha256 };
}

export function generateStateUniverseManifest(
  generatedAt: string = new Date().toISOString(),
): StateUniverseManifest {
  const base = {
    schemaVersion: "1.0.0" as const,
    generatedAt,
    sourceVintage: "2022 Census of Governments",
    stateCount: Object.keys(STATE_GOVERNMENT_SUMMARIES).length,
    states: STATE_GOVERNMENT_SUMMARIES,
  };

  const sha256 = computeSha256(base);
  return { ...base, sha256 };
}

export function generateTypeClassificationManifest(
  generatedAt: string = new Date().toISOString(),
): TypeClassificationManifest {
  const base = {
    schemaVersion: "1.0.0" as const,
    generatedAt,
    classificationSystem:
      "U.S. Census Bureau Government Units Classification" as const,
    generalPurposeTypes: ["county", "municipal", "township"] as const,
    specialPurposeTypes: ["special_district", "school_district"] as const,
    definitions: {
      county: {
        title: "County Governments",
        censusDefinition:
          "Organized county governments established to provide general government services for a defined county geographic area (designated as parishes in Louisiana and organized boroughs in Alaska).",
        criteriaForIndependentStatus: [
          "Existence as an organized corporate entity with defined statutory powers",
          "Governmental character with public officers elected by voters or appointed by public officials",
          "Substantial administrative and fiscal autonomy, including independent power to determine budget, levy taxes, or issue debt without parent approval",
        ],
        nationalCount2022: 3031,
      },
      municipal: {
        title: "Municipal Governments",
        censusDefinition:
          "General-purpose local governments incorporated to serve specific population concentrations (cities, incorporated towns, boroughs in CT/NJ/NY/PA/MN, and incorporated villages).",
        criteriaForIndependentStatus: [
          "Incorporated pursuant to state general law or special legislative charter",
          "Independent governing body (mayor-council, council-manager, or commission form)",
          "Independent fiscal power to levy local taxes and adopt municipal budgets",
        ],
        nationalCount2022: 19492,
      },
      township: {
        title: "Township Governments",
        censusDefinition:
          "General-purpose local governments established for civil sub-county geographic areas in 20 states (comprising New England towns, New York/Wisconsin towns, and civil townships across Mid-Atlantic and Midwestern states).",
        criteriaForIndependentStatus: [
          "Organized civil entity with an elected governing board (town meeting/select board or township trustees)",
          "Performs general governmental functions across rural/suburban sub-county territory",
          "Maintains independent fiscal authority separate from county fiscal control",
        ],
        nationalCount2022: 16253,
      },
      special_district: {
        title: "Special District Governments",
        censusDefinition:
          "Independent special-purpose local government entities (other than school districts) authorized to perform specific limited governmental functions.",
        criteriaForIndependentStatus: [
          "Must meet all three Census criteria: organized entity, governmental character, and substantial autonomy",
          "Fiscal independence: power to determine budget and levy taxes/user charges without prior approval by another government",
          "Administrative independence: independent governing board not completely controlled or subordinate to a single municipality or county",
        ],
        nationalCount2022: 39558,
      },
      school_district: {
        title: "Independent School District Governments",
        censusDefinition:
          "Organized local public entities operated exclusively for elementary, secondary, or higher education that meet Census criteria for fiscal and administrative independence.",
        criteriaForIndependentStatus: [
          "Separate corporate existence from municipal or county government",
          "Independently elected or appointed school board",
          "Independent fiscal authority to levy property taxes or adopt a binding budget without revision by a general-purpose local government",
        ],
        nationalCount2022: 12504,
      },
      state: {
        title: "State Governments",
        censusDefinition:
          "The 50 primary sovereign constituent political entities of the United States under the U.S. Constitution.",
        criteriaForIndependentStatus: [
          "Constitutional sovereignty under the Tenth Amendment to the U.S. Constitution",
          "General legislative, executive, and judicial authority",
        ],
        nationalCount2022: 50,
      },
      federal: {
        title: "Federal Government",
        censusDefinition:
          "The national government of the United States established by the U.S. Constitution.",
        criteriaForIndependentStatus: [
          "National constitutional government possessing enumerated powers and supremacy in federal law",
        ],
        nationalCount2022: 1,
      },
    },
  };

  const sha256 = computeSha256(base);
  return { ...base, sha256 };
}

export function generateSpecialDistrictsFunctionalManifest(
  generatedAt: string = new Date().toISOString(),
): FunctionalSpecialDistrictsManifest {
  const singleFunctionTotal = SPECIAL_DISTRICT_FUNCTION_SUMMARIES.filter(
    (f) => !f.isMultiFunction,
  ).reduce((sum, f) => sum + f.nationalCount, 0);

  const multiFunctionTotal = SPECIAL_DISTRICT_FUNCTION_SUMMARIES.filter(
    (f) => f.isMultiFunction,
  ).reduce((sum, f) => sum + f.nationalCount, 0);

  const totalSpecialDistricts = singleFunctionTotal + multiFunctionTotal;

  const base = {
    schemaVersion: "1.0.0" as const,
    generatedAt,
    sourceVintage: "2022 Census of Governments",
    totalSpecialDistricts,
    singleFunctionTotal,
    multiFunctionTotal,
    functions: [...SPECIAL_DISTRICT_FUNCTION_SUMMARIES],
  };

  const sha256 = computeSha256(base);
  return { ...base, sha256 };
}

export const generateFunctionalSpecialDistrictsManifest =
  generateSpecialDistrictsFunctionalManifest;

export function generateSchoolSystemsManifest(
  generatedAt: string = new Date().toISOString(),
): SchoolSystemsManifest {
  const byState: Record<string, SchoolSystemStateDetail> = {};
  let totalIndependent = 0;
  let totalDependent = 0;

  for (const [state, summary] of Object.entries(STATE_GOVERNMENT_SUMMARIES)) {
    const ind = summary.independentSchoolDistricts;
    const dep = summary.dependentSchoolSystems.total;
    const totalOps = ind + dep;

    let primarySystemStructure: "independent" | "dependent" | "mixed" =
      "independent";
    if (ind === 0 && dep > 0) {
      primarySystemStructure = "dependent";
    } else if (ind > 0 && dep > 0) {
      primarySystemStructure = "mixed";
    }

    byState[state] = {
      state,
      stateName: summary.stateName,
      independentDistricts: ind,
      countyDependent: summary.dependentSchoolSystems.countyDependent,
      municipalDependent: summary.dependentSchoolSystems.municipalDependent,
      townshipDependent: summary.dependentSchoolSystems.townshipDependent,
      stateDependent: summary.dependentSchoolSystems.stateDependent,
      totalOperatingSystems: totalOps,
      primarySystemStructure,
    };

    totalIndependent += ind;
    totalDependent += dep;
  }

  const totalOperatingSystems = totalIndependent + totalDependent;
  const independentPercentage =
    totalOperatingSystems > 0
      ? Number(((totalIndependent / totalOperatingSystems) * 100).toFixed(2))
      : 0;

  const base = {
    schemaVersion: "1.0.0" as const,
    generatedAt,
    sourceVintage: "2022 Census of Governments",
    nationalSummary: {
      independentDistricts: totalIndependent,
      dependentSystems: totalDependent,
      totalOperatingSystems,
      independentPercentage,
    },
    byState,
  };

  const sha256 = computeSha256(base);
  return { ...base, sha256 };
}

export function generateHistoricalCountSeriesManifest(
  generatedAt: string = new Date().toISOString(),
): HistoricalCountSeriesManifest {
  const base = {
    schemaVersion: "1.0.0" as const,
    generatedAt,
    seriesTitle:
      "Historical Statistics on U.S. Governments (1952–2022 Census of Governments)",
    censusYears: [...HISTORICAL_COUNT_SERIES],
    majorTrends: {
      schoolDistrictConsolidation:
        "Independent school districts underwent massive consolidation, declining from 67,355 units in 1952 to 12,504 in 2022 (an 81.4% reduction).",
      specialDistrictGrowth:
        "Special district governments expanded dramatically, more than tripling from 12,340 units in 1952 to 39,558 in 2022 as communities created specialized utility, fire, housing, and resource districts.",
      generalPurposeStability:
        "County governments remained virtually constant (3,052 in 1952 vs 3,031 in 2022), while municipalities grew moderately (16,807 to 19,492) and townships slightly contracted (17,202 to 16,253).",
    },
  };

  const sha256 = computeSha256(base);
  return { ...base, sha256 };
}
