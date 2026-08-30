import type {
  EmploymentMetrics,
  GeographicScope,
  IndustryScope,
  NormalizedOccupationRecord,
  OnetSocCrosswalk,
  SourceProvenance,
  WageDistribution,
  WagePercentiles,
  WorkTaskSkillMetadata,
} from "./types.js";
import { getSocTaxonomyRecord } from "./soc_taxonomy.js";

export interface RawInputRecord {
  readonly socCode: string;
  readonly onetSocCode?: string | null;
  readonly areaCode: string;
  readonly areaName: string;
  readonly level: "national" | "state" | "msa";
  readonly statePostal?: string | null;
  readonly stateFips?: string | null;
  readonly naicsCode?: string | null;
  readonly naicsTitle?: string | null;
  readonly sector?: string | null;

  readonly totalEmployment?: number | null;
  readonly employmentRse?: number | null;
  readonly employmentPerThousand?: number | null;
  readonly locationQuotient?: number | null;
  readonly employmentSuppressionReason?:
    "suppressed" | "unavailable" | "above_limit" | null;

  readonly hourlyMean?: number | null;
  readonly meanWageRse?: number | null;
  readonly hourlyPct10?: number | null;
  readonly hourlyPct25?: number | null;
  readonly hourlyPct50?: number | null;
  readonly hourlyPct75?: number | null;
  readonly hourlyPct90?: number | null;
  readonly hourlySuppressionReason?:
    "suppressed" | "unavailable" | "above_limit" | null;

  readonly annualMean?: number | null;
  readonly annualPct10?: number | null;
  readonly annualPct25?: number | null;
  readonly annualPct50?: number | null;
  readonly annualPct75?: number | null;
  readonly annualPct90?: number | null;
  readonly annualSuppressionReason?:
    "suppressed" | "unavailable" | "above_limit" | null;

  readonly metadata?: WorkTaskSkillMetadata | null;
  readonly provenance: SourceProvenance;
}

export function normalizeWagePercentiles(
  pct10: number | null | undefined,
  pct25: number | null | undefined,
  pct50: number | null | undefined,
  pct75: number | null | undefined,
  pct90: number | null | undefined,
  suppressionReason?: "suppressed" | "unavailable" | "above_limit" | null,
): WagePercentiles {
  const p10 = pct10 ?? null;
  const p25 = pct25 ?? null;
  const p50 = pct50 ?? null;
  const p75 = pct75 ?? null;
  const p90 = pct90 ?? null;

  // Verify non-decreasing monotonic percentile ordering when non-null
  const nonNullSeries = [
    { label: "pct10", val: p10 },
    { label: "pct25", val: p25 },
    { label: "pct50", val: p50 },
    { label: "pct75", val: p75 },
    { label: "pct90", val: p90 },
  ].filter((item): item is { label: string; val: number } => item.val !== null);

  for (let i = 0; i < nonNullSeries.length - 1; i++) {
    const current = nonNullSeries[i]!;
    const next = nonNullSeries[i + 1]!;
    if (current.val > next.val) {
      throw new Error(
        `Invalid wage percentile ordering: ${current.label} (${current.val}) exceeds ${next.label} (${next.val})`,
      );
    }
  }

  return {
    pct10: p10,
    pct25: p25,
    pct50: p50,
    pct75: p75,
    pct90: p90,
    suppressionReason: suppressionReason ?? null,
  };
}

export function normalizeOccupationRecord(
  raw: RawInputRecord,
): NormalizedOccupationRecord {
  const soc = getSocTaxonomyRecord(raw.socCode);

  let onetCrosswalk: OnetSocCrosswalk | null = null;
  if (raw.onetSocCode) {
    onetCrosswalk = {
      onetSocCode: raw.onetSocCode,
      soc2018Code: raw.socCode,
      onetTitle:
        raw.metadata?.soc2018Code === raw.socCode
          ? soc.title
          : `${soc.title} (O*NET Detail)`,
      onetVersion: "O*NET 28.1",
    };
  }

  const geography: GeographicScope = {
    level: raw.level,
    statePostal: raw.statePostal ?? null,
    stateFips: raw.stateFips ?? null,
    areaCode: raw.areaCode,
    areaName: raw.areaName,
  };

  const industry: IndustryScope = {
    naicsCode: raw.naicsCode ?? "000000",
    naicsTitle: raw.naicsTitle ?? "Cross-industry",
    sector: raw.sector ?? null,
  };

  const employment: EmploymentMetrics = {
    totalEmployment: raw.totalEmployment ?? null,
    employmentRse: raw.employmentRse ?? null,
    employmentPerThousand: raw.employmentPerThousand ?? null,
    locationQuotient: raw.locationQuotient ?? null,
    suppressionReason: raw.employmentSuppressionReason ?? null,
  };

  const hourlyPercentiles = normalizeWagePercentiles(
    raw.hourlyPct10,
    raw.hourlyPct25,
    raw.hourlyPct50,
    raw.hourlyPct75,
    raw.hourlyPct90,
    raw.hourlySuppressionReason,
  );

  const annualPercentiles = normalizeWagePercentiles(
    raw.annualPct10,
    raw.annualPct25,
    raw.annualPct50,
    raw.annualPct75,
    raw.annualPct90,
    raw.annualSuppressionReason,
  );

  const wages: WageDistribution = {
    mean: raw.hourlyMean ?? null,
    meanWageRse: raw.meanWageRse ?? null,
    percentiles: hourlyPercentiles,
    annualMean: raw.annualMean ?? null,
    annualPercentiles,
    wageUnit:
      raw.hourlyMean !== null || hourlyPercentiles.pct50 !== null
        ? "hourly"
        : "annual",
  };

  const id = `occ_${raw.socCode.replace("-", "")}_${raw.areaCode}_${industry.naicsCode}`;

  return {
    id,
    soc,
    onetCrosswalk,
    geography,
    industry,
    employment,
    wages,
    metadata: raw.metadata ?? null,
    provenance: raw.provenance,
  };
}
