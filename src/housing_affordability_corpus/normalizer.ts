/**
 * Housing Affordability Corpus Normalizer
 *
 * Normalizes and validates raw FMR, Income Limits, and CHAS extracts into
 * canonical records with explicit invariants, table universes, and calibration profiles.
 */

import {
  type RawFmrDataRow,
  type RawIncomeLimitDataRow,
  STATE_ALPHA_TO_FIPS,
} from "./adapters/hud_user_download.js";
import type { InterpretedChasCell } from "./adapters/chas_file_adapter.js";
import {
  createChasRecordId,
  createFmrId,
  createGeoId,
  createIncomeLimitId,
  createProfileId,
} from "./ids.js";
import { createProvenanceEnvelope } from "./provenance.js";
import type {
  AmiBracket,
  AmiBracketSummary,
  ChasAffordabilityRecord,
  FairMarketRentRecord,
  GeographicIdentity,
  HousingCalibrationProfile,
  IncomeLimitRecord,
} from "./types.js";

export function buildGeographicIdentity(params: {
  fipsCode: string;
  name: string;
  stateAlpha: string;
  cbsaCode?: string;
  metroName?: string;
}): GeographicIdentity {
  const cleanFips = params.fipsCode.padStart(5, "0");
  const stateFips =
    STATE_ALPHA_TO_FIPS[params.stateAlpha.toUpperCase()] ||
    cleanFips.slice(0, 2);
  const geoId = createGeoId(stateFips, cleanFips, params.cbsaCode);
  const isTerritory = ["72", "78", "66", "69", "60"].includes(stateFips);
  const isMetropolitan = Boolean(
    params.cbsaCode && params.cbsaCode.trim().length > 0,
  );

  return {
    geoId,
    name: params.name || `FIPS ${cleanFips}`,
    stateFips,
    stateAbbr: params.stateAlpha.toUpperCase(),
    countyFips: cleanFips,
    cbsaCode: params.cbsaCode || null,
    metroName: params.metroName || null,
    isMetropolitan,
    isTerritory,
  };
}

export function normalizeFmrRecord(
  raw: RawFmrDataRow,
  sourceUrl: string | null = null,
): FairMarketRentRecord {
  const geo = buildGeographicIdentity({
    fipsCode: raw.fipsCode,
    name: raw.countyName,
    stateAlpha: raw.stateAlpha,
    cbsaCode: raw.cbsaCode,
    metroName: raw.metroName,
  });

  const vintage = String(raw.year).startsWith("FY")
    ? String(raw.year)
    : `FY${raw.year}`;
  const id = createFmrId(geo.geoId, vintage);
  const provenance = createProvenanceEnvelope(
    "hud_user_fmr",
    vintage,
    sourceUrl,
    raw,
    "download",
    "HUD USER Fair Market Rents 40th percentile gross rent standard by bedroom size",
    {
      datasetFile: `hud_fmr_${vintage.toLowerCase()}.csv`,
      areaIdentifier: raw.cbsaCode || raw.fipsCode,
      fiscalYear: String(raw.year).replace("FY", ""),
      extractionRowKey: `fips_${raw.fipsCode}`,
    },
  );

  return {
    id,
    geo,
    vintage,
    fmr0Br: raw.fmr0Br,
    fmr1Br: raw.fmr1Br,
    fmr2Br: raw.fmr2Br,
    fmr3Br: raw.fmr3Br,
    fmr4Br: raw.fmr4Br,
    percentile: raw.percentile === 50 ? 50 : 40,
    isSmallAreaFmr: Boolean(raw.isSmallAreaFmr),
    isObservedMedianRent: false, // Critical invariant: FMR != observed median rent
    provenance,
  };
}

export function normalizeIncomeLimitRecord(
  raw: RawIncomeLimitDataRow,
  sourceUrl: string | null = null,
): IncomeLimitRecord {
  const geo = buildGeographicIdentity({
    fipsCode: raw.fipsCode,
    name: raw.countyName,
    stateAlpha: raw.stateAlpha,
    cbsaCode: raw.cbsaCode,
    metroName: raw.metroName,
  });

  const vintage = String(raw.year).startsWith("FY")
    ? String(raw.year)
    : `FY${raw.year}`;
  const id = createIncomeLimitId(geo.geoId, vintage);
  const provenance = createProvenanceEnvelope(
    "hud_user_il",
    vintage,
    sourceUrl,
    raw,
    "download",
    "HUD USER Section 8 Income Limits by family size and Area Median Family Income",
    {
      datasetFile: `hud_il_${vintage.toLowerCase()}.csv`,
      areaIdentifier: raw.cbsaCode || raw.fipsCode,
      fiscalYear: String(raw.year).replace("FY", ""),
      extractionRowKey: `fips_${raw.fipsCode}`,
    },
  );

  return {
    id,
    geo,
    vintage,
    medianFamilyIncome: raw.medianIncome,
    limits30Pct: raw.limits30Pct,
    limits50Pct: raw.limits50Pct,
    limits80Pct: raw.limits80Pct,
    provenance,
  };
}

export function normalizeChasRecord(
  raw: InterpretedChasCell,
  sourceUrl: string | null = null,
): ChasAffordabilityRecord {
  const geo = buildGeographicIdentity({
    fipsCode: raw.fipsCode,
    name: raw.countyName,
    stateAlpha: raw.stateAlpha,
    cbsaCode: raw.cbsaCode,
  });

  const id = createChasRecordId(
    geo.geoId,
    raw.tableId,
    raw.vintage,
    raw.sourceVariable,
  );
  const provenance = createProvenanceEnvelope(
    "census_chas",
    raw.vintage,
    sourceUrl,
    raw,
    "download",
    `HUD CHAS 2018-2022 ACS 5-Year Tabulation ${raw.tableId} universe=${raw.tableUniverse}`,
    {
      datasetFile: "chas_2018_2022_extract.csv",
      areaIdentifier: raw.cbsaCode || raw.fipsCode,
      fiscalYear: "2018-2022",
      extractionRowKey: `${raw.tableId}_${raw.sourceVariable}_fips_${raw.fipsCode}`,
    },
  );

  return {
    id,
    geo,
    vintage: raw.vintage,
    tableId: raw.tableId,
    sourceVariable: raw.sourceVariable,
    tableUniverse: raw.tableUniverse,
    amiBracket: raw.amiBracket,
    tenure: raw.tenure,
    householdType: raw.householdType,
    costBurden: raw.costBurden,
    housingProblems: raw.housingProblems,
    householdCount: raw.householdCount,
    suppression: raw.suppression,
    provenance,
  };
}

export function buildCalibrationProfile(
  geo: GeographicIdentity,
  fmr: FairMarketRentRecord,
  incomeLimits: IncomeLimitRecord,
  chasRecords: ChasAffordabilityRecord[],
): HousingCalibrationProfile {
  const profileId = createProfileId(geo.geoId);

  // Group CHAS records by AMI bracket and calculate summaries
  const brackets: AmiBracket[] = [
    "le_30_pct_ami",
    "gt_30_le_50_pct_ami",
    "gt_50_le_80_pct_ami",
    "gt_80_le_100_pct_ami",
    "gt_100_pct_ami",
  ];

  const byAmiBracket = {} as Record<AmiBracket, AmiBracketSummary>;
  let totalHouseholds = 0;
  let totalRenters = 0;
  let totalOwners = 0;
  let totalCostBurdened = 0;
  let totalSeverelyCostBurdened = 0;
  let totalNotBurdened = 0;
  let totalNotComputed = 0;

  let totalProblems = 0;
  let totalSevereProblems = 0;
  let totalNoProblems = 0;
  let totalProblemsNotComputed = 0;

  let totalCells = 0;
  let suppressedCells = 0;

  // Initialize bracket summaries
  for (const b of [...brackets, "all_income_levels" as AmiBracket]) {
    byAmiBracket[b] = {
      amiBracket: b,
      totalHouseholds: 0,
      renters: 0,
      owners: 0,
      costBurdenedCount: 0,
      severelyCostBurdenedCount: 0,
      costBurdenRate: 0,
      severeCostBurdenRate: 0,
    };
  }

  // Iterate over records matching this geo
  for (const r of chasRecords) {
    if (r.geo.geoId !== geo.geoId) continue;
    totalCells++;
    if (r.suppression.isSuppressed) {
      suppressedCells++;
      continue;
    }

    const count = r.householdCount ?? 0;

    // We process base cost burden table (Table 9 or Table 8 all_types)
    if (
      r.tableId === "Table9" ||
      (r.tableId === "Table8" && r.householdType === "all_types")
    ) {
      const b = r.amiBracket;
      if (byAmiBracket[b]) {
        if (r.tenure === "renter") {
          byAmiBracket[b].renters += count;
        } else if (r.tenure === "owner") {
          byAmiBracket[b].owners += count;
        } else if (r.tenure === "total") {
          byAmiBracket[b].totalHouseholds += count;
        }

        if (r.costBurden === "gt_30_le_50_pct") {
          byAmiBracket[b].costBurdenedCount += count;
        } else if (r.costBurden === "gt_50_pct") {
          byAmiBracket[b].severelyCostBurdenedCount += count;
        } else if (r.costBurden === "le_30_pct") {
          totalNotBurdened += count;
        } else if (r.costBurden === "not_computed") {
          totalNotComputed += count;
        }
      }
    }

    if (r.tableId === "Table1") {
      if (
        r.housingProblems === "has_1_or_more_problems" &&
        r.tenure === "total"
      ) {
        totalProblems += count;
      } else if (
        r.housingProblems === "has_1_or_more_severe_problems" &&
        r.tenure === "total"
      ) {
        totalSevereProblems += count;
      } else if (
        r.housingProblems === "has_no_problems" &&
        r.tenure === "total"
      ) {
        totalNoProblems += count;
      } else if (
        r.housingProblems === "problems_not_computed" &&
        r.tenure === "total"
      ) {
        totalProblemsNotComputed += count;
      }
    }
  }

  // Aggregate totals across brackets
  for (const b of brackets) {
    const summary = byAmiBracket[b];
    if (
      summary.totalHouseholds === 0 &&
      (summary.renters > 0 || summary.owners > 0)
    ) {
      summary.totalHouseholds = summary.renters + summary.owners;
    }
    totalHouseholds += summary.totalHouseholds;
    totalRenters += summary.renters;
    totalOwners += summary.owners;
    totalCostBurdened += summary.costBurdenedCount;
    totalSeverelyCostBurdened += summary.severelyCostBurdenedCount;

    const computableInBracket = summary.totalHouseholds;
    if (computableInBracket > 0) {
      summary.costBurdenRate = Number(
        (
          (summary.costBurdenedCount + summary.severelyCostBurdenedCount) /
          computableInBracket
        ).toFixed(4),
      );
      summary.severeCostBurdenRate = Number(
        (summary.severelyCostBurdenedCount / computableInBracket).toFixed(4),
      );
    }
  }

  // Update all_income_levels
  byAmiBracket.all_income_levels = {
    amiBracket: "all_income_levels",
    totalHouseholds,
    renters: totalRenters,
    owners: totalOwners,
    costBurdenedCount: totalCostBurdened,
    severelyCostBurdenedCount: totalSeverelyCostBurdened,
    costBurdenRate:
      totalHouseholds > 0
        ? Number(
            (
              (totalCostBurdened + totalSeverelyCostBurdened) /
              totalHouseholds
            ).toFixed(4),
          )
        : 0,
    severeCostBurdenRate:
      totalHouseholds > 0
        ? Number((totalSeverelyCostBurdened / totalHouseholds).toFixed(4))
        : 0,
  };

  const computableHouseholds = Math.max(1, totalHouseholds - totalNotComputed);
  const costBurdenRate = Number(
    (
      (totalCostBurdened + totalSeverelyCostBurdened) /
      computableHouseholds
    ).toFixed(4),
  );
  const severeCostBurdenRate = Number(
    (totalSeverelyCostBurdened / computableHouseholds).toFixed(4),
  );

  const computableProblems = Math.max(
    1,
    totalHouseholds - totalProblemsNotComputed,
  );
  const housingProblemsRate =
    totalProblems > 0
      ? Number((totalProblems / computableProblems).toFixed(4))
      : Number(
          (
            (totalCostBurdened + totalSeverelyCostBurdened) /
            computableHouseholds
          ).toFixed(4),
        );

  const chasVintage =
    chasRecords.find((r) => r.geo.geoId === geo.geoId)?.vintage || "2018-2022";

  const provenance = createProvenanceEnvelope(
    "manual_benchmark",
    chasVintage,
    null,
    { geo, fmr, incomeLimits, totalHouseholds },
    "fixture",
    "Unified Housing Calibration Profile synthesizing HUD FMR, Income Limits, and CHAS 2018-2022 ACS",
  );

  return {
    profileId,
    geo,
    asOfVintage: {
      fmrVintage: fmr.vintage,
      ilVintage: incomeLimits.vintage,
      chasVintage,
    },
    fmr,
    incomeLimits,
    chasSummary: {
      totalHouseholds: totalHouseholds || totalRenters + totalOwners,
      totalRenters,
      totalOwners,
      byAmiBracket,
      costBurdenSummary: {
        notBurdenedCount: totalNotBurdened,
        costBurdenedCount: totalCostBurdened,
        severelyCostBurdenedCount: totalSeverelyCostBurdened,
        notComputedCount: totalNotComputed,
        costBurdenRate,
        severeCostBurdenRate,
      },
      housingProblemsSummary: {
        has1OrMoreProblemsCount: totalProblems,
        has1OrMoreSevereProblemsCount: totalSevereProblems,
        hasNoProblemsCount: totalNoProblems,
        problemsNotComputedCount: totalProblemsNotComputed,
        housingProblemsRate,
      },
      suppressionSummary: {
        totalCellCount: totalCells,
        suppressedCellCount: suppressedCells,
        suppressedRatio:
          totalCells > 0
            ? Number((suppressedCells / totalCells).toFixed(4))
            : 0,
      },
    },
    provenance,
  };
}
