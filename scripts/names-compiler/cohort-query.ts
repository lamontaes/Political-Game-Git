/**
 * Cohort Query Substrate for National Names V2
 *
 * Provides deterministic historical cohort lookups across national, state,
 * and territory birth years without probabilistic smoothing or fabricated data.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  CohortQueryItem,
  CohortQueryOptions,
  CohortQueryResult,
  GivenNameSourceRecord,
} from "./schemas";

export function queryCohort(
  records: readonly GivenNameSourceRecord[],
  options: CohortQueryOptions,
): CohortQueryResult {
  const { year, jurisdiction = "US", sex, minCount = 1, limit } = options;
  const yearStr = year.toString();
  const upperJurisdiction = jurisdiction.toUpperCase();

  const candidates: Array<{
    key: string;
    displayName: string;
    maleCount: number;
    femaleCount: number;
    totalCount: number;
    effectiveCount: number;
  }> = [];

  let totalBirthsInScope = 0;

  for (const rec of records) {
    let yearlyData: { male: number; female: number } | undefined;

    if (upperJurisdiction === "US" || upperJurisdiction === "NATIONAL") {
      yearlyData = rec.ssa_national?.yearly[yearStr];
    } else if (rec.ssa_state[upperJurisdiction]) {
      yearlyData = rec.ssa_state[upperJurisdiction]?.yearly[yearStr];
    } else if (rec.ssa_territory[upperJurisdiction]) {
      yearlyData = rec.ssa_territory[upperJurisdiction]?.yearly[yearStr];
    }

    if (!yearlyData) {
      continue;
    }

    const maleCount = yearlyData.male || 0;
    const femaleCount = yearlyData.female || 0;
    const totalCount = maleCount + femaleCount;

    if (totalCount <= 0) {
      continue;
    }

    let effectiveCount = totalCount;
    if (sex === "M") {
      effectiveCount = maleCount;
    } else if (sex === "F") {
      effectiveCount = femaleCount;
    }

    if (effectiveCount < minCount) {
      continue;
    }

    totalBirthsInScope += effectiveCount;

    candidates.push({
      key: rec.key,
      displayName: rec.display_name,
      maleCount,
      femaleCount,
      totalCount,
      effectiveCount,
    });
  }

  // Sort descending by effective count, then alphabetically by key for deterministic tie-breaking
  candidates.sort((a, b) => {
    if (b.effectiveCount !== a.effectiveCount) {
      return b.effectiveCount - a.effectiveCount;
    }
    return a.key.localeCompare(b.key);
  });

  const sliced =
    limit !== undefined && limit > 0 ? candidates.slice(0, limit) : candidates;

  const names: CohortQueryItem[] = sliced.map((c, idx) => {
    const maleShare = c.totalCount > 0 ? c.maleCount / c.totalCount : 0;
    const femaleShare = c.totalCount > 0 ? c.femaleCount / c.totalCount : 0;

    return {
      key: c.key,
      display_name: c.displayName,
      count: c.effectiveCount,
      male_count: c.maleCount,
      female_count: c.femaleCount,
      male_share: maleShare,
      female_share: femaleShare,
      rank: idx + 1,
    };
  });

  return {
    year,
    jurisdiction: upperJurisdiction,
    total_birth_records_in_scope: totalBirthsInScope,
    total_names_returned: names.length,
    names,
  };
}

export function loadGivenNameShardsFromDir(
  givenNamesDir: string,
): GivenNameSourceRecord[] {
  if (!fs.existsSync(givenNamesDir)) {
    throw new Error(`Given names directory does not exist: ${givenNamesDir}`);
  }

  const files = fs
    .readdirSync(givenNamesDir)
    .filter((f) => f.endsWith(".json"));
  files.sort();

  const allRecords: GivenNameSourceRecord[] = [];
  for (const file of files) {
    const filePath = path.join(givenNamesDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content) as GivenNameSourceRecord[];
    allRecords.push(...parsed);
  }

  return allRecords;
}
