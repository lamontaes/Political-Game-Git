/**
 * CHAS (Comprehensive Housing Affordability Strategy) File Adapter
 *
 * Ingests and interprets custom Census ACS 5-year tabulations produced for HUD.
 * Strictly preserves:
 * - Table Universes (e.g. occupied_housing_units vs rental_housing_units)
 * - HAMFI AMI Brackets (<=30%, 30-50%, 50-80%, 80-100%, >100%)
 * - Suppression flags vs zero values (suppressed != 0)
 * - Source table variable mappings and line numbers.
 */

import { normalizeFips } from "../ids.js";
import { parseCsvRows } from "./hud_user_download.js";
import type {
  AmiBracket,
  ChasTableUniverse,
  CostBurdenCategory,
  HouseholdType,
  HousingProblemsCategory,
  SuppressionReason,
  SuppressionStatus,
  TenureType,
} from "../types.js";

export interface RawChasCell {
  fipsCode: string;
  countyName: string;
  stateAlpha: string;
  cbsaCode?: string;
  tableId: string;
  sourceVariable: string;
  tableUniverse: ChasTableUniverse;
  amiBracket: AmiBracket;
  tenure: TenureType;
  householdType: HouseholdType;
  costBurden: CostBurdenCategory;
  housingProblems: HousingProblemsCategory;
  rawValue: string | number | null | undefined;
  vintage: string;
}

export interface InterpretedChasCell {
  fipsCode: string;
  countyName: string;
  stateAlpha: string;
  cbsaCode?: string;
  tableId: string;
  sourceVariable: string;
  tableUniverse: ChasTableUniverse;
  amiBracket: AmiBracket;
  tenure: TenureType;
  householdType: HouseholdType;
  costBurden: CostBurdenCategory;
  housingProblems: HousingProblemsCategory;
  householdCount: number | null;
  suppression: {
    status: SuppressionStatus;
    isSuppressed: boolean;
    reason: SuppressionReason;
  };
  vintage: string;
}

/**
 * Parses raw cell value into count and suppression status.
 * Enforces: suppressed != 0
 */
export function interpretChasCellValue(
  rawValue: string | number | null | undefined,
  costBurden: CostBurdenCategory,
): {
  householdCount: number | null;
  suppression: {
    status: SuppressionStatus;
    isSuppressed: boolean;
    reason: SuppressionReason;
  };
} {
  if (rawValue === null || rawValue === undefined) {
    return {
      householdCount: null,
      suppression: {
        status: "suppressed",
        isSuppressed: true,
        reason: "disclosure_avoidance",
      },
    };
  }

  const strVal = String(rawValue).trim().toUpperCase();

  if (
    strVal === "" ||
    strVal === "S" ||
    strVal === "SUPPRESSED" ||
    strVal === "." ||
    strVal === "-1"
  ) {
    return {
      householdCount: null,
      suppression: {
        status: "suppressed",
        isSuppressed: true,
        reason: "disclosure_avoidance",
      },
    };
  }

  if (costBurden === "not_computed" || strVal === "NOT_COMPUTED") {
    const num = Number.parseInt(strVal, 10);
    return {
      householdCount: Number.isNaN(num) ? 0 : num,
      suppression: {
        status: "not_computed",
        isSuppressed: false,
        reason: "zero_or_negative_income",
      },
    };
  }

  const num = Number.parseInt(strVal, 10);
  if (Number.isNaN(num)) {
    return {
      householdCount: null,
      suppression: {
        status: "not_available",
        isSuppressed: true,
        reason: "unsupported_variable",
      },
    };
  }

  return {
    householdCount: Math.max(0, num),
    suppression: {
      status: "available",
      isSuppressed: false,
      reason: "none",
    },
  };
}

export function parseChasExtractCsv(csvContent: string): InterpretedChasCell[] {
  const rows = parseCsvRows(csvContent);
  return rows.map((r) => {
    const fipsCode = normalizeFips(r.fips || r.fips_code || r.county_fips, 5);
    const stateAlpha = (r.state_alpha || r.state || "").toUpperCase();
    const tableId = r.table_id || r.table || "Table9";
    const sourceVariable = r.variable || r.source_variable || "val";
    const vintage = r.vintage || "2018-2022";

    const tableUniverse = (r.universe ||
      "occupied_housing_units") as ChasTableUniverse;
    const amiBracket = (r.ami_bracket || "all_income_levels") as AmiBracket;
    const tenure = (r.tenure || "total") as TenureType;
    const householdType = (r.household_type || "all_types") as HouseholdType;
    const costBurden = (r.cost_burden || "all_burdens") as CostBurdenCategory;
    const housingProblems = (r.housing_problems ||
      "all_conditions") as HousingProblemsCategory;

    const rawValue = r.value ?? r.count ?? r.estimate;
    const interpretation = interpretChasCellValue(rawValue, costBurden);

    return {
      fipsCode,
      countyName: r.county_name || r.county || "",
      stateAlpha,
      cbsaCode: r.cbsa || r.cbsa_code || undefined,
      tableId,
      sourceVariable,
      tableUniverse,
      amiBracket,
      tenure,
      householdType,
      costBurden,
      housingProblems,
      householdCount: interpretation.householdCount,
      suppression: interpretation.suppression,
      vintage,
    };
  });
}
